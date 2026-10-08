#!/usr/bin/env node
// Static build for GitHub Pages (or any static host), like the other web apps:
//   YALLO_API_CONFIG_URL=https://…/yallo/api.json YALLO_BASE_PATH=/yallo/merchant npm run web:build
// → web-dist/. The API's address is read from api.json at runtime. Flags work too:
//   npm run web:build -- --api http://localhost:5190 --out dist      a fixed API address
//   npm run web:build -- --mock                                      the in-browser simulation
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const config = opt('config') ?? process.env.YALLO_API_CONFIG_URL ?? '';
const api = config ? '' : (opt('api') ?? process.env.VITE_API_URL ?? '');
const base = opt('base') ?? process.env.YALLO_BASE_PATH ?? '';
const out = opt('out') ?? 'web-dist';
const mock = args.includes('--mock');
if (!config && !api && !mock) {
  console.error('web-build: pass --config <api.json url> (or YALLO_API_CONFIG_URL), --api <url>, or --mock');
  process.exit(1);
}
const env = {
  ...process.env,
  YALLO_API_CONFIG_URL: config,
  VITE_API_URL: api,
  YALLO_BASE_PATH: base,
  VITE_MOCK: mock ? '1' : '',
};
const r = spawnSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], { cwd: root, env, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(
  `\nweb-build: Yallo Merchant → ${mock ? 'in-browser mock' : config ? `API from ${config}` : api}${base ? ` · under ${base}/` : ''} · ${out}/`,
);
