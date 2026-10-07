// GitHub Pages has no rewrites. Its root 404 page sends an unknown /yallo/courier/<path>?<query> to
// /yallo/courier/?p=<encoded /path?query>#<hash>; put the path back before the router reads the address, so deep links
// and reloads land on the right screen. Run by index.js before Expo Router starts; a no-op elsewhere.
if (typeof window !== 'undefined' && typeof history !== 'undefined') {
  const params = new URLSearchParams(location.search);
  const p = params.get('p');
  if (p) {
    params.delete('p');
    // The redirect lands on the app's base path; `p` is the full original path (or one relative to it).
    const base = location.pathname.replace(/\/?$/, '/');
    const path = p.startsWith(base) ? p : base + p.replace(/^\//, '');
    const [pathOnly, query = ''] = path.split('?');
    const rest = new URLSearchParams(query);
    params.forEach((v, k) => rest.append(k, v));
    const search = rest.toString();
    history.replaceState(history.state, '', pathOnly + (search ? '?' + search : '') + location.hash);
  }
}

export {};
