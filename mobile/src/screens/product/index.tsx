import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { Photo } from '@/components/photo';
import { RadioRow } from '@/components/radio-row';
import { Screen, useBottomPad } from '@/components/screen';
import { Stepper } from '@/components/stepper';
import { Tag } from '@/components/tag';
import { Txt } from '@/components/txt';
import { type OptionGroup, productById, type Selection, storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { defaultSelection, fmt, groupsFor, storeIcon, unitPrice } from '@/store/derive';
import { colors } from '@/theme';

const HERO = 320;

export function ProductScreen({ id }: { id: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPad(16);
  const p = productById[id] ?? productById['p1-1'];
  const store = storeById[p.storeId];
  const fav = useApp((s) => s.favProducts.includes(p.id));
  const toggleFav = useApp((s) => s.toggleFav);
  const addLine = useApp((s) => s.addLine);
  const showToast = useApp((s) => s.showToast);

  const [sel, setSel] = useState<Selection>(() => defaultSelection(p));
  const [qty, setQty] = useState(1);
  const groups = groupsFor(p);

  // iOS presents this as a page sheet below the status bar; Android shows it full screen.
  const topInset = Platform.OS === 'ios' ? 0 : insets.top;

  const pick = (g: OptionGroup, i: number) =>
    setSel((s) => {
      const cur = s[g.id] || [];
      const next = g.multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i];
      return { ...s, [g.id]: next };
    });

  const add = () => {
    if (addLine(p.id, sel, qty, true)) {
      router.back();
      showToast(`${t.added} · ${qty}× ${p.name}`);
    }
  };

  return (
    <Screen edges={[]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Photo
          icon={storeIcon(p.storeId)}
          iconSize={72}
          caption={`photo · ${p.img}`}
          captionAt="bottom-start"
          style={{
            height: HERO + topInset,
            paddingTop: topInset,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}>
          <View
            style={{
              position: 'absolute',
              top: topInset + 6,
              start: 12,
              end: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
            <IconButton
              look="float"
              name="x"
              accessibilityLabel="Close"
              onPress={() => router.back()}
            />
            <IconButton
              look="float"
              name="heart"
              filled={fav}
              color={fav ? colors.accent : colors.text}
              accessibilityLabel="Favorite"
              onPress={() => toggleFav('favProducts', p.id)}
            />
          </View>
        </Photo>

        <View style={{ paddingTop: 20, paddingHorizontal: 16, paddingBottom: 4 }}>
          <Txt size={12} color={colors.neutral700} style={{ marginBottom: 6 }}>
            {`${store.name} · ${store.tMin}–${store.tMax} min`}
          </Txt>
          <Txt heading size={34} style={{ marginBottom: 8 }}>
            {p.name}
          </Txt>
          <Txt color={colors.neutral700} style={{ marginBottom: 10 }}>
            {p.desc}
          </Txt>
          <Txt heading size={26} color={colors.accent700}>
            {fmt(p.price)}
          </Txt>
        </View>

        {groups.map((g) => (
          <View key={g.id} style={{ paddingTop: 22, paddingHorizontal: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 2,
              }}>
              <View>
                <Txt heading size={21}>
                  {g.name}
                </Txt>
                {g.required && (
                  <Txt size={12} color={colors.neutral700}>
                    {t.choose1}
                  </Txt>
                )}
              </View>
              <Tag tone="neutral" label={g.required ? t.required : t.optional} />
            </View>
            {g.choices.map(([label, extra], i) => (
              <RadioRow
                key={label}
                square={g.multi}
                selected={(sel[g.id] || []).includes(i)}
                onPress={() => pick(g, i)}
                style={{ minHeight: 52 }}>
                <Txt style={{ flex: 1 }}>{label}</Txt>
                {extra > 0 && (
                  <Txt size={14} color={colors.neutral700}>
                    {'+ ' + fmt(extra)}
                  </Txt>
                )}
              </RadioRow>
            ))}
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: bottomPad,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          backgroundColor: colors.bg,
        }}>
        <Stepper
          qty={qty}
          heading
          height={54}
          buttonWidth={46}
          iconSize={20}
          onInc={() => setQty(qty + 1)}
          onDec={() => setQty(Math.max(1, qty - 1))}
        />
        <Button
          label={`${t.addToCart} · ${fmt(unitPrice(p, sel) * qty)}`}
          fontSize={17}
          onPress={add}
          style={{ flex: 1, height: 54 }}
        />
      </View>
    </Screen>
  );
}
