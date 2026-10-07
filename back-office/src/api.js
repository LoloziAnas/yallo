import { createYalloClient } from '@yallo/shared';

// The ops session token, remembered in this browser. Storage can be unavailable (private mode), so every
// access is guarded and the app still works for the session.
const KEY = 'yallo-ops-token';
const load = () => { try { return localStorage.getItem(KEY) ?? undefined; } catch { return undefined; } };
export const saveToken = token => { try { token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY); } catch { /* not persisted */ } };

// Same origin: Vite proxies /api to the mock API (see vite.config.js).
export const api = createYalloClient('', { token: load() });
