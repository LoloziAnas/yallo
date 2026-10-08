import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { API_PORT } from '../shared/src/api';

// In development the app talks to the mock API through this server (REST and live feed), like the back
// office. API_URL points it at another API, e.g. a private one: API_URL=http://localhost:5198 npm run dev
const target = process.env.API_URL || `http://localhost:${API_PORT}`;

export default defineConfig({
  // YALLO_BASE_PATH=/yallo/merchant serves the build from a sub-path (GitHub Pages).
  base: (process.env.YALLO_BASE_PATH || process.env.VITE_BASE || '').replace(/\/?$/, '/'),
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: {
    // Where the API is: a fixed address, or the api.json that names it (public demo), or neither:
    // same origin through the dev proxy. VITE_MOCK=1 runs on the in-browser simulation instead.
    'import.meta.env.VITE_API_CONFIG_URL': JSON.stringify(process.env.YALLO_API_CONFIG_URL || process.env.VITE_API_CONFIG_URL || ''),
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify((process.env.VITE_BUILD_SHA || process.env.GITHUB_SHA || '').slice(0, 7)),
  },
  server: { port: 5193, proxy: { '/api': { target, ws: true } } },
  preview: { proxy: { '/api': { target, ws: true } } },
  test: { environment: 'node' },
});
