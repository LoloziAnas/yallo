import { useApp } from '@/store/app-store';

/**
 * Re-renders when the live catalogue changes (stores and products in `data/catalog` are updated in place).
 * Call it in screens that list stores or products.
 */
export function useCatalog() {
  return useApp((s) => s.catalogVersion);
}
