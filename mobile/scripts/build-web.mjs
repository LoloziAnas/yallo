#!/usr/bin/env node
// Static web build for any static host.
//
//   npm run web:build -- --api http://localhost:5190          pinned API (dev, e2e, the :8090 integration build)
//   npm run web:build -- --config https://…/yallo/api.json   public demo: the app reads the API's address from that
//                                                              file at runtime (it changes when the tunnel restarts)
//   YALLO_API_CONFIG_URL=… YALLO_BASE_PATH=/yallo/app npm run web:build    the same from env (GitHub Pages workflow)
//
// - --base / YALLO_BASE_PATH serves the app from a sub-path (experiments.baseUrl): every asset and route lives under it.
// - Output web-dist/ (git-ignored) is a single-page app. Unknown paths must serve index.html: _redirects does that on
//   Netlify and Cloudflare Pages, 404.html on GitHub Pages at the site root, serve.json for `npx serve`. On GitHub
//   Pages under a sub-path, the site's root 404.html redirects to the app with ?p=<path>, which the app restores.
// - version.txt names the commit.
// Options: --api <url> | --config <url>, --base <path>, --out <dir>, --allow-dirty.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (msg) => {
  console.error('\n✖ ' + msg + '\n');
  process.exit(1);
};
/** git output, or null where there's no repository (some hosts build from a plain checkout). */
const git = (...a) => {
  try {
    return execFileSync('git', a, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
};
// Hosted builds (Render, Netlify…) name the commit they build; their checkouts are never dirty on purpose.
const hostedSha = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_REF || process.env.GITHUB_SHA;
const ci = !!(process.env.CI || process.env.RENDER || hostedSha);

const api = option('--api')?.replace(/\/$/, '');
const config = api ? undefined : option('--config') || process.env.YALLO_API_CONFIG_URL;
const url = api ?? config;
if (!url || !/^https?:\/\//.test(url))
  fail(
    'Say where the API is: --api http://localhost:5190, or --config https://…/api.json (YALLO_API_CONFIG_URL)',
  );
const base = (option('--base') ?? process.env.YALLO_BASE_PATH ?? '').replace(/\/$/, '');
if (base && !base.startsWith('/')) fail('--base must start with "/", e.g. /yallo/app');
const out = path.resolve(root, option('--out') ?? 'web-dist');
const dirty = !!git('status', '--porcelain', '--', '.');
if (dirty && !ci && !args.includes('--allow-dirty'))
  fail('mobile/ has uncommitted changes. Commit first, or pass --allow-dirty.');
const sha =
  (hostedSha?.slice(0, 7) ?? git('rev-parse', '--short', 'HEAD') ?? 'unknown') +
  (dirty ? '-dirty' : '');

// Metro's cache doesn't notice a different EXPO_PUBLIC_API_URL: start this kind of build from an empty one.
rmSync(path.join(root, '.expo', 'metro-cache-release', 'web'), { recursive: true, force: true });
rmSync(out, { recursive: true, force: true });
const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    YALLO_RELEASE_BUILD: 'web', // a fresh Metro cache (metro.config.js)
    EXPO_PUBLIC_API_URL: api ?? '',
    EXPO_PUBLIC_API_CONFIG_URL: config ?? '',
    YALLO_BASE_PATH: base,
    EXPO_PUBLIC_BUILD_SHA: sha,
  },
});
if (r.status !== 0) fail('expo export failed');

writeFileSync(path.join(out, '_redirects'), `/*  ${base}/index.html  200\n`);
copyFileSync(path.join(out, 'index.html'), path.join(out, '404.html'));
writeFileSync(
  path.join(out, 'serve.json'),
  JSON.stringify({ rewrites: [{ source: '**', destination: `${base}/index.html` }] }, null, 2) +
    '\n',
);
writeFileSync(path.join(out, 'version.txt'), sha + '\n');
console.log(
  `\n✔ ${path.relative(process.cwd(), out)}/ (${sha}, ${api ? 'API ' + api : 'API address from ' + config}${base ? ', served under ' + base : ''})`,
);
