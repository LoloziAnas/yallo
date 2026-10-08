import { useEffect, useMemo, useRef, useState } from 'react';

import { type Geocoder, type Place, photon } from '@/location/geocoder';
import { useApp } from '@/store/app-store';

/** Search waits for typing to pause this long (Photon's usage policy asks for no request per keystroke). */
const DEBOUNCE_MS = 450;

/** Address search as you type, debounced, with only the latest request kept, biased to `near`. */
export function useAddressSearch(near: { lat: number; lon: number }) {
  const lang = useApp((s) => s.lang);
  const geocoder: Geocoder = useMemo(() => photon(lang), [lang]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    pending.current?.abort();
    if (query.trim().length < 3) return;
    const timer = setTimeout(() => {
      const ctrl = new AbortController();
      pending.current = ctrl;
      setSearching(true);
      geocoder
        .search(query, near, ctrl.signal)
        .then((r) => !ctrl.signal.aborted && setResults(r))
        .catch(() => !ctrl.signal.aborted && setResults([]))
        .finally(() => !ctrl.signal.aborted && setSearching(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `near` only biases the order of results: a new search isn't needed when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, geocoder]);

  const short = query.trim().length < 3;
  return {
    query,
    setQuery,
    results: short ? [] : results,
    searching: !short && searching,
    clear: () => {
      pending.current?.abort();
      setQuery('');
      setResults([]);
    },
    reverse: (lat: number, lon: number) => geocoder.reverse(lat, lon).catch(() => null),
  };
}
