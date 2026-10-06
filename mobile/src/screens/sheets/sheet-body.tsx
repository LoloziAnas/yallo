import type { ReactNode } from 'react';

import { Sheet } from '@/components/sheet';

/** Content of a bottom sheet. `scroll` for lists that can outgrow the sheet (saved addresses). */
export function SheetBody({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  return <Sheet scroll={scroll}>{children}</Sheet>;
}
