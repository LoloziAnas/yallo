import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { fmt, totals } from '@/store/derive';
import { colors } from '@/theme';

type Props = {
  /** On a store page, only show the bar when the cart belongs to that store. */
  storeId?: string;
  /** Extra bottom padding (store page has no tab bar under it). */
  bottomPad?: number;
};

/** Sticky "View cart" bar above the tab bar on Home, Search, Favorites and store pages. */
export function CartBar({ storeId, bottomPad = 8 }: Props) {
  const t = useT();
  const cart = useApp((s) => s.cart);
  const promo = useApp((s) => s.promo);
  const tt = totals(cart, promo);
  if (tt.count === 0 || (storeId && cart.storeId !== storeId)) return null;
  return (
    <View
      style={{
        paddingTop: 8,
        paddingHorizontal: 12,
        paddingBottom: bottomPad,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.bg,
      }}>
      <Button
        onPress={() => router.push('/cart')}
        accessibilityLabel={`${t.viewCart}, ${tt.count}`}
        style={{ height: 54, justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              minWidth: 26,
              height: 26,
              borderRadius: 13,
              paddingHorizontal: 6,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Txt w={600} size={14} lh={1.2} color={colors.white}>
              {tt.count}
            </Txt>
          </View>
          <Txt w={600} size={17} lh={1.2} color={colors.white}>
            {t.viewCart}
          </Txt>
        </View>
        <Txt w={600} size={17} lh={1.2} color={colors.white}>
          {fmt(tt.total)}
        </Txt>
      </Button>
    </View>
  );
}
