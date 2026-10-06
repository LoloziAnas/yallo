import type { ReactNode } from 'react';

import { Sheet } from '@/components/sheet';

/** Content of a bottom sheet that sizes to its content. */
export function SheetBody({ children }: { children: ReactNode }) {
  return <Sheet>{children}</Sheet>;
}
