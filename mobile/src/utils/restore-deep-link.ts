/**
 * GitHub Pages has no rewrites: a deep link or reload under the app's sub-path (/yallo/app/orders/48220?x=1) hits
 * the site's root 404.html, which redirects to the app with the inner path in ?p= (/yallo/app/?p=%2Forders%2F48220
 * %3Fx%3D1). Returns that inner path for the router to open, or null. Anything that would leave the site is dropped.
 * (Changing the address bar directly doesn't stick: the router writes its own state, ?p= included, back over it.)
 */
export function takeDeepLink(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  // Parsed by hand: URLSearchParams isn't dependable in every runtime this file loads in.
  const pairs = window.location.search.replace(/^\?/, '').split('&').filter(Boolean);
  const pPair = pairs.find((kv) => kv.split('=')[0] === 'p');
  if (!pPair) return null;
  let inner = decodeURIComponent(pPair.slice(2).replace(/\+/g, ' '));
  // Also accept the full path, base included.
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  if (base && (inner === base || inner.startsWith(base + '/'))) inner = inner.slice(base.length);
  if (!inner.startsWith('/')) inner = '/' + inner;
  // Only paths inside the app (no "//host" or "scheme:").
  if (inner.startsWith('//') || /^\/*[a-z][a-z0-9+.-]*:/i.test(inner)) return '/';
  const rest = pairs.filter((kv) => kv !== pPair).join('&');
  return inner + (rest ? (inner.includes('?') ? '&' : '?') + rest : '');
}
