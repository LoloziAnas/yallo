// Reads the live catalogue, which changes in place: opt out of React Compiler memoisation.
'use no memo';

import { useMemo } from 'react';

import { stores } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { storeState } from '@/store/derive';

/**
 * Whether a store takes orders right now (live from the API: hours and ops pauses), with the label
 * to show when it doesn't ("Closed · 19:00"). Re-renders only when that changes.
 */
export function useStoreStatus(storeId: string) {
  const t = useT();
  const state = useApp((s) => storeState(storeId, s.live));
  return {
    open: state === 'open',
    closedLabel: state === 'open' ? '' : state === 'paused' ? t.closed : `${t.closed} · ${state}`,
  };
}

/** Ids of the stores taking orders right now, as a stable predicate for list filters and sorting. */
export function useIsStoreOpen() {
  const ids = useApp((s) =>
    stores
      .filter((x) => storeState(x.id, s.live) === 'open')
      .map((x) => x.id)
      .join(','),
  );
  return useMemo(() => {
    const open = new Set(ids.split(','));
    return (id: string) => open.has(id);
  }, [ids]);
}
