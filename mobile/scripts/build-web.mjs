#!/usr/bin/env node
// Static web build for any static host: `npm run web:build -- --api https://api.example.com`
//
// - The API URL is built in (EXPO_PUBLIC_API_URL); the live feed follows it (https → wss).
// - Output web-dist/ (git-ignored) is a single-page app. Unknown paths must serve index.html: _redirects
//   does that on Netlify and Cloudflare Pages, 404.html on GitHub Pages, serve.json for `npx serve`.
// - version.txt names the commit.
// Options: --api <url> (required), --out <dir>, --allow-dirty.
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
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();

const api = option('--api')?.replace(/\/$/, '');
if (!api || !/^https?:\/\//.test(api))
  fail('Pass the API: npm run web:build -- --api https://<api host>');
const out = path.resolve(root, option('--out') ?? 'web-dist');
const dirty = git('status', '--porcelain', '--', '.') !== '';
if (dirty && !args.includes('--allow-dirty'))
  fail('mobile/ has uncommitted changes. Commit first, or pass --allow-dirty.');
const sha = git('rev-parse', '--short', 'HEAD') + (dirty ? '-dirty' : '');

rmSync(out, { recursive: true, force: true });
const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    YALLO_RELEASE_BUILD: 'web', // a fresh Metro cache (metro.config.js)
    EXPO_PUBLIC_API_URL: api,
    EXPO_PUBLIC_BUILD_SHA: sha,
  },
});
if (r.status !== 0) fail('expo export failed');

writeFileSync(path.join(out, '_redirects'), '/*  /index.html  200\n');
copyFileSync(path.join(out, 'index.html'), path.join(out, '404.html'));
writeFileSync(
  path.join(out, 'serve.json'),
  JSON.stringify({ rewrites: [{ source: '**', destination: '/index.html' }] }, null, 2) + '\n',
);
writeFileSync(path.join(out, 'version.txt'), sha + '\n');
console.log(
  `\n✔ ${path.relative(process.cwd(), out)}/ (${sha}, API ${api})\n  Preview: npx serve ${path.relative(process.cwd(), out)}`,
);
