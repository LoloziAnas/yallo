// GitHub Pages has no rewrites: its root 404 page sends /yallo/merchant/<path> to /yallo/merchant/?p=<path>.
// The app has a single page, so the original path only needs stripping from the address.
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(location.search);
  if (params.has('p')) {
    params.delete('p');
    const search = params.toString();
    history.replaceState(history.state, '', location.pathname + (search ? '?' + search : '') + location.hash);
  }
}

export {};
