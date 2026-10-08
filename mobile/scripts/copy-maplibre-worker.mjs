#!/usr/bin/env node
// maplibre-gl (web map) runs its tile parsing in a module Worker loaded from a separate file, which the bundle
// doesn't include. Copy the worker and the code it imports into public/ so `expo export` serves them; the web map
// points maplibre at them (setWorkerUrl in src/components/live-map/index.web.tsx). Runs on npm install.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'node_modules/maplibre-gl/dist');
const to = path.join(root, 'public/maplibre');
if (!existsSync(from)) process.exit(0);
mkdirSync(to, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(path.join(from, f), path.join(to, f));
