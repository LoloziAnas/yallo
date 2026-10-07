import { TAGS, type TagStyle } from '@/components/ui';
import { totals, useCourier, type Phase } from '@/store/courier-store';

/** Status pill for the active order at each phase. */
export function activeTag(phase: Phase | null): TagStyle {
  switch (phase) {
    case 'atPickup':
      return TAGS.waiting;
    case 'toCustomer':
    case 'atCustomer':
    case 'confirm':
      return TAGS.way;
    default:
      return TAGS.picking;
  }
}

/**
 * Earnings headline: live, the server's numbers for this courier (from its orders); in the demo,
 * the design's figures. `live` tells screens to drop parts that have no real data behind them.
 */
export function useEarningsSummary() {
  const earnings = useCourier((s) => (s.source === 'live' ? s.earnings : null));
  const today = useCourier((s) => s.today);
  if (earnings) {
    return {
      live: true as const,
      total: earnings.total,
      jobs: earnings.jobs,
      pay: earnings.pay,
      tips: earnings.tips,
      compensation: earnings.compensation,
      cashHeld: earnings.cashHeld,
    };
  }
  const t = totals(today);
  return { live: false as const, total: t.today, jobs: today.dels, week: t.week };
}
