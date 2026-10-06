import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { productById, storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { colors } from '@/theme';

import { SheetBody } from './sheet-body';

/** Confirm clearing a cart from one store to add an item from another. */
export function NewCartSheet() {
  const t = useT();
  const cartStoreId = useApp((s) => s.cart.storeId);
  const pending = useApp((s) => s.pending);
  const confirmNewCart = useApp((s) => s.confirmNewCart);
  const from = cartStoreId ? storeById[cartStoreId].name : '';
  const to = pending ? storeById[productById[pending.pid].storeId].name : '';

  return (
    <SheetBody>
      <Txt heading size={27} style={{ marginBottom: 6 }}>
        {t.newCartT}
      </Txt>
      <Txt color={colors.neutral700} style={{ marginBottom: 18 }}>
        {t.newCartB.replace('%a', from).replace('%b', to)}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          variant="secondary"
          label={t.cancel}
          fontSize={16}
          onPress={() => router.back()}
          style={{ flex: 1, height: 52 }}
        />
        <Button
          label={t.newCartOk}
          fontSize={16}
          onPress={confirmNewCart}
          style={{ flex: 1.4, height: 52 }}
        />
      </View>
    </SheetBody>
  );
}
