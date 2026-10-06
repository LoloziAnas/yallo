import { router } from 'expo-router';
import { RadioRow } from '@/components/radio-row';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { type SortKey, sortLabel } from '@/store/derive';

const keys: SortKey[] = ['rec', 'fast', 'rating', 'fee'];

/** Sort options for search results. Picking one applies it and closes the sheet. */
export function SortSheet() {
  const t = useT();
  const sort = useApp((s) => s.sort);
  const set = useApp((s) => s.set);
  const kickSearch = useApp((s) => s.kickSearch);
  return (
    <Sheet>
      <>
        <Txt heading size={27} style={{ marginTop: 4, marginBottom: 8 }}>
          {t.sort}
        </Txt>
        {keys.map((k) => (
          <RadioRow
            key={k}
            selected={sort === k}
            onPress={() => {
              set({ sort: k });
              kickSearch();
              router.back();
            }}
            style={{ minHeight: 54 }}>
            <Txt>{sortLabel(k, t)}</Txt>
          </RadioRow>
        ))}
      </>
    </Sheet>
  );
}
