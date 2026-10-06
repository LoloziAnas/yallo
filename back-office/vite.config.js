import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { API_PORT } from '../shared/src/api';

export default defineConfig({
  plugins: [react()],
  server: {
    // The back office talks to the mock API (../api) through the dev server, REST and live feed alike.
    proxy: { '/api': { target: `http://localhost:${API_PORT}`, ws: true } },
  },
});
