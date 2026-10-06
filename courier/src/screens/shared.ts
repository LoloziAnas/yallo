import { TAGS, type TagStyle } from '@/components/ui';
import type { Phase } from '@/store/courier-store';

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
