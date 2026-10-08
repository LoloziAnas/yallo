import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { API_PORT } from '../shared/src/api';

// The back office talks to the mock API (../api) through the dev server, REST and live feed alike.
// API_URL points it at another API, e.g. a private one for testing: API_URL=http://localhost:5198 npm run dev
const target = process.env.API_URL || `http://localhost:${API_PORT}`;

export default defineConfig({
  // VITE_BASE=/yallo/ops/ serves the build from a sub-path (the public demo on GitHub Pages).
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  // MapLibre (about 1 MB) is its own chunk, loaded only when the live map opens.
  build: { chunkSizeWarningLimit: 1200 },
  server: { proxy: { '/api': { target, ws: true } } },
  preview: { proxy: { '/api': { target, ws: true } } },
});
