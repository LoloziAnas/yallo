#!/usr/bin/env node
// Static web build for a static host (for iPhone testers; foreground only, no background GPS):
//   npm run web:export -- --api https://yallo-api.example.com [--out dist/web] [--base /courier]
// On a static host's build step: EXPO_PUBLIC_API_URL=https://… npm run web:build (→ web-dist/).
// The API must be https (the page is served over https, so its live feed becomes wss://).
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const api = (opt('api') ?? process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
if (!/^https?:\/\//.test(api)) {
  console.error('export-web: pass the API with --api https://…');
  process.exit(1);
}
const base = (opt('base') ?? '').replace(/\/$/, '');
const out = resolve(root, opt('out') ?? 'dist/web');

// The commit: from git locally, or from the host's build environment (Render sets RENDER_GIT_COMMIT).
const sha = (() => {
  const given = process.env.EXPO_PUBLIC_BUILD_SHA || process.env.RENDER_GIT_COMMIT;
  if (given) return given.slice(0, 7);
  try {
    const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
    return git('rev-parse', '--short', 'HEAD') + (git('status', '--porcelain', '--', '.') ? '-dirty' : '');
  } catch {
    return '';
  }
})();

const env = {
  ...process.env,
  EXPO_PUBLIC_API_URL: api,
  EXPO_PUBLIC_BUILD_SHA: sha,
  EXPO_BASE_URL: base,
  EXPO_WEB_SPA: '1',
  CI: '1',
};
const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', out], {
  cwd: root,
  env,
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);

// A single-page build: every path must serve index.html, which routes in the browser. Configure the
// host's rewrite (Render: /* → /index.html); 404.html covers GitHub Pages, _redirects Netlify/Cloudflare.
copyFileSync(join(out, 'index.html'), join(out, '404.html'));
writeFileSync(join(out, '_redirects'), `${base || ''}/*  ${base || ''}/index.html  200\n`);
const html = readFileSync(join(out, 'index.html'), 'utf8');
if (!html.includes('<script')) console.warn('export-web: index.html has no script tag?');
console.log(`\nexport-web: Yallo Courier ${sha} → ${api}\n  static folder: ${out}${base ? `\n  served under: ${base}/` : ''}`);
