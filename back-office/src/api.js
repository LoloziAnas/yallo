import { createYalloClient } from '@yallo/shared';

// The ops session token, remembered in this browser. Storage can be unavailable (private mode), so every
// access is guarded and the app still works for the session.
const KEY = 'yallo-ops-token';
const load = () => { try { return localStorage.getItem(KEY) ?? undefined; } catch { return undefined; } };
export const saveToken = token => { try { token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY); } catch { /* not persisted */ } };

// VITE_API_URL (set at build time) points a deployed back office at the API, e.g. https://api.yallo.ma.
// Unset, it calls its own origin: Vite's dev and preview servers proxy /api to the API (see vite.config.js).
export const api = createYalloClient(import.meta.env.VITE_API_URL ?? '', { token: load() });
