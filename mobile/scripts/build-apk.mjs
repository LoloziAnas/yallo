#!/usr/bin/env node
// Local release APK, no EAS:
//   npm run apk -- --config https://lolozianas.github.io/yallo/api.json   public demo: the app reads the API's
//                                                         address from that file (one APK survives tunnel restarts)
//   npm run apk -- --api https://api.example.com          the API pinned
//
// - The API (EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_CONFIG_URL) and the commit (version in Profile) are built in.
// - Signed with the release keystore OUTSIDE git, in ~/yallo-keys/ (override with YALLO_KEYS_DIR).
//   `npm run apk -- --init-keystore` creates it once. Back that folder up: an APK signed with another key
//   can't update one already installed.
// - Output: apk/yallo-<version>-<sha>.apk (git-ignored).
//
// Options: --api <url> | --config <url>, --init-keystore, --allow-dirty (build with uncommitted changes).
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (msg) => {
  console.error('\n✖ ' + msg + '\n');
  process.exit(1);
};
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();

const keysDir = process.env.YALLO_KEYS_DIR || path.join(homedir(), 'yallo-keys');
const keystore = path.join(keysDir, 'yallo-customer.jks');
const propsFile = path.join(keysDir, 'yallo-customer.properties');

/** A JDK 17+ for Gradle: JAVA_HOME when it's new enough, else the system's OpenJDK 17. */
function javaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    '/usr/lib/jvm/java-17-openjdk-amd64',
    '/usr/lib/jvm/java-21-openjdk-amd64',
  ];
  for (const home of candidates) {
    if (!home || !existsSync(path.join(home, 'bin/java'))) continue;
    const out =
      spawnSync(path.join(home, 'bin/java'), ['-version'], { encoding: 'utf8' }).stderr ?? '';
    const major = Number(out.match(/version "(\d+)/)?.[1]);
    if (major >= 17) return home;
  }
  fail('Gradle needs a JDK 17 or later: set JAVA_HOME to one.');
}

function initKeystore() {
  if (existsSync(keystore))
    fail(`${keystore} already exists; keep using it (replacing it breaks updates).`);
  mkdirSync(keysDir, { recursive: true, mode: 0o700 });
  const password = randomBytes(18).toString('base64url');
  execFileSync(
    path.join(javaHome(), 'bin/keytool'),
    [
      '-genkeypair',
      '-v',
      '-keystore',
      keystore,
      '-storetype',
      'PKCS12',
      '-alias',
      'yallo-customer',
      '-keyalg',
      'RSA',
      '-keysize',
      '4096',
      '-validity',
      '10000',
      '-storepass',
      password,
      '-keypass',
      password,
      '-dname',
      'CN=Yallo, OU=Customer app, O=Yallo, L=Marrakech, C=MA',
    ],
    { stdio: 'inherit' },
  );
  writeFileSync(
    propsFile,
    `storeFile=${keystore}\nstorePassword=${password}\nkeyAlias=yallo-customer\nkeyPassword=${password}\n`,
    { mode: 0o600 },
  );
  console.log(
    `\n✔ Release keystore: ${keystore}\n  Passwords: ${propsFile}\n  Back up ${keysDir} (both files).`,
  );
}

if (flag('--init-keystore')) {
  initKeystore();
  process.exit(0);
}

const api = option('--api')?.replace(/\/$/, '');
const config = api ? undefined : option('--config');
const target = api ?? config;
if (!target || !/^https?:\/\//.test(target))
  fail(
    'Say where the API is: --config https://…/api.json (public demo), or --api https://<api host>',
  );
if (!target.startsWith('https://'))
  console.warn(
    `⚠ ${target} isn't HTTPS: this APK allows plain HTTP. Fine for testing, not for sharing.`,
  );
if (!existsSync(propsFile))
  fail(`No release keystore in ${keysDir}. Create it once with: npm run apk -- --init-keystore`);

const dirty = git('status', '--porcelain', '--', '.') !== '';
if (dirty && !flag('--allow-dirty'))
  fail(
    'mobile/ has uncommitted changes. Commit first (the APK names its commit), or pass --allow-dirty.',
  );
const sha = git('rev-parse', '--short', 'HEAD') + (dirty ? '-dirty' : '');
const versionCode = git('rev-list', '--count', 'HEAD');
const version = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version;

const env = {
  ...process.env,
  NODE_ENV: 'production',
  YALLO_RELEASE_BUILD: 'apk', // a fresh Metro cache (metro.config.js)
  CI: '1', // no interactive prompts from expo prebuild
  EXPO_PUBLIC_API_URL: api ?? '',
  EXPO_PUBLIC_API_CONFIG_URL: config ?? '',
  EXPO_PUBLIC_BUILD_SHA: sha,
  YALLO_VERSION_CODE: versionCode,
  YALLO_KEYSTORE_PROPS: propsFile,
  JAVA_HOME: javaHome(),
};
const run = (cmd, a, cwd = root) => {
  console.log(`\n$ ${cmd} ${a.join(' ')}`);
  const r = spawnSync(cmd, a, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) fail(`${cmd} ${a[0]} failed`);
};

// Metro's cache doesn't notice a different EXPO_PUBLIC_API_URL: start this kind of build from an empty one.
rmSync(path.join(root, '.expo', 'metro-cache-release', 'apk'), { recursive: true, force: true });
console.log(
  `Building Yallo ${version} (${sha}), versionCode ${versionCode}, ${api ? 'API ' + api : 'API address from ' + config}`,
);
// A clean prebuild so app.json / plugin changes always reach android/ (generated, git-ignored).
run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install']);
run(
  './gradlew',
  [
    'assembleRelease',
    '--no-daemon',
    '--build-cache',
    '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64',
  ],
  path.join(root, 'android'),
);

const built = path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');

// Refuse an APK that isn't signed with the Yallo key (e.g. the template's debug key): it couldn't be updated later.
const buildTools = path.join(
  process.env.ANDROID_HOME || path.join(homedir(), 'Android/Sdk'),
  'build-tools',
);
const apksigner = existsSync(buildTools)
  ? readdirSync(buildTools)
      .sort()
      .reverse()
      .map((v) => path.join(buildTools, v, 'apksigner'))
      .find(existsSync)
  : undefined;
if (apksigner) {
  const certs = execFileSync(apksigner, ['verify', '--print-certs', built], {
    env,
    encoding: 'utf8',
  });
  if (!/CN=Yallo/.test(certs)) fail('The APK is not signed with the Yallo release key:\n' + certs);
  console.log(
    '\n✔ Signed with the Yallo release key (' +
      certs.match(/SHA-256 digest: (\w+)/)?.[1].slice(0, 16) +
      '…)',
  );
} else {
  console.warn('⚠ apksigner not found (Android build-tools): signature not checked.');
}
mkdirSync(path.join(root, 'apk'), { recursive: true });
const out = path.join(root, 'apk', `yallo-${version}-${sha}.apk`);
copyFileSync(built, out);
console.log(`\n✔ ${path.relative(process.cwd(), out)}\n  Install: adb install -r ${out}`);
