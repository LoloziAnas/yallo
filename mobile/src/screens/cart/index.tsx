// Reads the live catalogue, which changes in place: opt out of React Compiler memoisation.
'use no memo';

import { router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { HeaderBar } from '@/components/header-bar';
import { Icon } from '@/components/icon';
import { Screen, useBottomPad } from '@/components/screen';
import { SumRows } from '@/components/sum-rows';
import { Tag } from '@/components/tag';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { fmt, sumRows, totals } from '@/store/derive';
import { colors } from '@/theme';

import { AddressCard } from './address-card';
import { CartLineRow } from './cart-line-row';
import { useCatalog } from '@/hooks/use-catalog';

export function CartScreen() {
  useCatalog();
  const token = useApp((s) => s.token);
  const t = useT();
  const bottomPad = useBottomPad(16);
  const cart = useApp((s) => s.cart);
  const promo = useApp((s) => s.promo);
  const promoInput = useApp((s) => s.promoInput);
  const promoMsg = useApp((s) => s.promoMsg);
  const set = useApp((s) => s.set);
  const applyPromo = useApp((s) => s.applyPromo);

  const tt = totals(cart, promo);
  const cs = tt.store;
  const belowMin = !!cs && tt.sub < cs.min;
  const promoDesc = promo === 'MARHABA' ? `−30%, ${t.upTo} 40 DH` : t.free;

  return (
    <Screen>
      <HeaderBar title={t.cart} subtitle={cs?.name} />
      {cart.lines.length === 0 ? (
        <View style={{ flex: 1, paddingVertical: 64, paddingHorizontal: 16 }}>
          <EmptyState icon="bag" tile={96} title={t.emptyCart} body={t.emptyCartBody}>
            <Button
              label={t.browse}
              fontSize={16}
              onPress={() => router.navigate('/')}
              style={{ height: 50, paddingHorizontal: 28, marginTop: 12 }}
            />
          </EmptyState>
        </View>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {cs && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 12,
                  paddingBottom: 4,
                }}>
                <Icon name="clock" size={15} color={colors.neutral700} />
                <Txt size={13} color={colors.neutral700}>
                  {`${cs.tMin}–${cs.tMax} min`}
                </Txt>
              </View>
            )}
            {cart.lines.map((l) => (
              <CartLineRow key={l.key} line={l} />
            ))}
            {cs && (
              <Button
                variant="ghost"
                icon="plus"
                label={t.addMore}
                onPress={() => router.push(`/store/${cs.id}`)}
                style={{ alignSelf: 'flex-start', marginTop: 10, height: 40 }}
              />
            )}
            {belowMin && cs && (
              <Tag
                size={13}
                label={`${t.minOrder}: ${fmt(cs.min)} · +${fmt(Math.max(0, cs.min - tt.sub))}`}
                style={{
                  alignSelf: 'stretch',
                  marginTop: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              />
            )}

            <Txt label style={{ marginTop: 24, marginBottom: 8 }}>
              {t.promo}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextField
                value={promoInput}
                onChangeText={(v) => set({ promoInput: v.toUpperCase(), promoMsg: '' })}
                onSubmitEditing={applyPromo}
                placeholder="MARHABA"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                minHeight={48}
                style={{ flex: 1, letterSpacing: 0.9 }}
              />
              <Button
                variant="secondary"
                label={t.apply}
                onPress={applyPromo}
                style={{ height: 48, paddingHorizontal: 18 }}
              />
            </View>
            {!!promoMsg && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon
                  name={promoMsg === 'ok' ? 'check' : 'x'}
                  size={15}
                  color={promoMsg === 'ok' ? colors.mint700 : colors.text}
                />
                <Txt size={13} color={promoMsg === 'ok' ? colors.mint700 : colors.text}>
                  {promoMsg === 'ok' ? `${promo} ${t.promoOk} · ${promoDesc}` : t.promoBad}
                </Txt>
              </View>
            )}

            <Txt label style={{ marginTop: 24, marginBottom: 8 }}>
              {t.address}
            </Txt>
            <AddressCard />

            <View style={{ marginTop: 24 }}>
              <SumRows rows={sumRows(tt, t)} total={fmt(tt.total)} fontSize={15} divided />
            </View>
          </ScrollView>

          <View
            style={{
              paddingTop: 12,
              paddingHorizontal: 16,
              paddingBottom: bottomPad,
              borderTopWidth: 1,
              borderTopColor: colors.divider,
            }}>
            <Button
              disabled={belowMin}
              // Ordering needs an account: guests sign in here and continue to checkout.
              onPress={() =>
                token
                  ? router.push('/checkout')
                  : router.push({ pathname: '/login', params: { then: 'checkout' } })
              }
              accessibilityLabel={`${t.placeOrder}, ${fmt(tt.total)}`}
              style={{ height: 56, justifyContent: 'space-between', paddingHorizontal: 18 }}>
              <Txt w={600} size={18} lh={1.2} color={colors.white}>
                {t.placeOrder}
              </Txt>
              <Txt w={600} size={18} lh={1.2} color={colors.white}>
                {fmt(tt.total)}
              </Txt>
            </Button>
          </View>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
