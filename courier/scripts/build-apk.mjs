#!/usr/bin/env node
// Local Android release build, no EAS account needed:
//   npm run apk -- --api https://<api>                  a fixed API address, or
//   npm run apk -- --config https://…/yallo/api.json    the address read at runtime (demo tunnel:
//                                                       one APK keeps working when it moves)
//   [--clean] [--all-abis] [--out dist]
// Bakes the API URL and the commit into the bundle, signs with the release key in ~/yallo-keys
// (plugins/with-release-signing.js) and writes dist/yallo-courier-<version>-<sha>.apk.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (msg) => {
  console.error('build-apk: ' + msg);
  process.exit(1);
};

const config = opt('config') ?? process.env.YALLO_API_CONFIG_URL ?? '';
const api = config ? '' : (opt('api') ?? process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const target = config || api;
if (!/^https?:\/\//.test(target)) fail('pass --api https://… or --config https://…/api.json');
if (!target.startsWith('https://')) console.warn(`build-apk: ${target} is plain http; the APK will allow cleartext traffic`);

const keyProps = process.env.YALLO_KEYSTORE_PROPERTIES ?? join(homedir(), 'yallo-keys', 'courier-release.properties');
if (!existsSync(keyProps)) fail(`no release key at ${keyProps} (see ~/yallo-keys/README.txt)`);

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const dirty = git('status', '--porcelain', '--', '.') !== '';
const sha = git('rev-parse', '--short', 'HEAD') + (dirty ? '-dirty' : '');
const version = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.version;
if (dirty) console.warn('build-apk: courier/ has uncommitted changes; the build is labelled ' + sha);

// Gradle for SDK 57 needs JDK 17+; the machine default may be older.
const javaHome = (() => {
  const want = process.env.JAVA_HOME;
  const major = (home) => {
    try {
      const out = spawnSync(join(home, 'bin', 'java'), ['-version'], { encoding: 'utf8' }).stderr;
      const m = out.match(/version "(\d+)(?:\.(\d+))?/);
      return m ? (m[1] === '1' ? Number(m[2]) : Number(m[1])) : 0;
    } catch {
      return 0;
    }
  };
  if (want && major(want) >= 17) return want;
  const jvm = '/usr/lib/jvm';
  const found = existsSync(jvm)
    ? readdirSync(jvm)
        .map((d) => join(jvm, d))
        .filter((d) => major(d) >= 17 && major(d) <= 21)
        .sort((a, b) => major(a) - major(b))[0]
    : undefined;
  if (!found) fail('needs a JDK 17–21 (set JAVA_HOME)');
  return found;
})();

const env = {
  ...process.env,
  EXPO_PUBLIC_API_URL: api || undefined,
  EXPO_PUBLIC_API_CONFIG_URL: config || undefined,
  EXPO_PUBLIC_BUILD_SHA: sha,
  YALLO_KEYSTORE_PROPERTIES: keyProps,
  NODE_ENV: 'production',
  CI: '1',
  JAVA_HOME: javaHome,
  ANDROID_HOME: process.env.ANDROID_HOME ?? join(homedir(), 'Android', 'Sdk'),
};
const run = (cmd, a, cwd = root) => {
  console.log(`\n$ ${cmd} ${a.join(' ')}`);
  const r = spawnSync(cmd, a, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) fail(`${cmd} failed (${r.status})`);
};

console.log(`build-apk: Yallo Courier ${version} · ${sha} → ${config ? `API from ${config}` : api}`);
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install', ...(args.includes('--clean') ? ['--clean'] : [])]);
// Modern Android phones are arm64; x86_64 runs on the emulator. `--all-abis` adds 32-bit devices.
const abis = args.includes('--all-abis') ? 'armeabi-v7a,arm64-v8a,x86,x86_64' : 'arm64-v8a,x86_64';
run('./gradlew', ['assembleRelease', '--console=plain', `-PreactNativeArchitectures=${abis}`], join(root, 'android'));

const apk = join(root, 'android/app/build/outputs/apk/release/app-release.apk');
const outDir = resolve(root, opt('out') ?? 'dist');
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, `yallo-courier-${version}-${sha}.apk`);
copyFileSync(apk, dest);

// Show which key signed it (must match ~/yallo-keys/README.txt for updates to install).
const tools = join(env.ANDROID_HOME, 'build-tools');
const apksigner = existsSync(tools)
  ? readdirSync(tools).sort().reverse().map((v) => join(tools, v, 'apksigner')).find(existsSync)
  : undefined;
if (apksigner) {
  const out = spawnSync(apksigner, ['verify', '--print-certs', dest], { env, encoding: 'utf8' });
  console.log('\n' + (out.stdout || out.stderr).split('\n').filter((l) => /DN|SHA-256/.test(l)).join('\n'));
}
console.log(`\nbuild-apk: ${dest}`);
