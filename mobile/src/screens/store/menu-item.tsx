import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Stepper } from '@/components/stepper';
import { Tag } from '@/components/tag';
import { Txt } from '@/components/txt';
import { lineKey, type Product } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { cartQty, fmt, storeIcon } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';

/** One menu row: text on the start side, photo with add button / qty stepper on the end side. */
export function MenuItem({ product: p }: { product: Product }) {
  const t = useT();
  const cart = useApp((s) => s.cart);
  const addLine = useApp((s) => s.addLine);
  const changeQty = useApp((s) => s.changeQty);
  const showToast = useApp((s) => s.showToast);

  const hasOpt = !!p.opt;
  const q = cartQty(cart, p.id);
  const plainKey = lineKey(p.id, {});
  // Items with options always open the product sheet; plain items get an inline stepper once added.
  const inCart = !hasOpt && q > 0;
  const soldOut = !p.available;
  const showAdd = !soldOut && (hasOpt || q === 0);
  const open = () => router.push(`/product/${p.id}`);
  const add = () => {
    if (hasOpt) open();
    else if (addLine(p.id, {}, 1)) showToast(`${t.added} · ${p.name}`);
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          gap: 14,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={{ flex: 1, minWidth: 0, gap: 4, opacity: soldOut ? 0.55 : 1 }}>
        {soldOut && (
          <Tag
            label={t.outOfStock}
            tone="neutral"
            size={10}
            caps
            style={{ paddingVertical: 2, paddingHorizontal: 6 }}
          />
        )}
        {p.popular && !soldOut && (
          <Tag
            label={t.popularTag}
            size={10}
            caps
            style={{ paddingVertical: 2, paddingHorizontal: 6 }}
          />
        )}
        <Txt w={500} size={16} lh={1.3}>
          {p.name}
        </Txt>
        <Txt size={13} lh={1.4} color={colors.neutral700}>
          {p.desc}
        </Txt>
        <Txt heading size={18} style={{ marginTop: 2 }}>
          {(hasOpt ? t.from + ' ' : '') + fmt(p.price)}
        </Txt>
      </View>
      <View style={{ width: 108, height: 108, opacity: soldOut ? 0.55 : 1 }}>
        <Photo
          icon={storeIcon(p.storeId)}
          uri={p.photoUrl}
          style={{ flex: 1, borderRadius: radius.lg, boxShadow: shadow.sm }}>
          <Txt
            mono
            size={9}
            lh={1.3}
            color={colors.accent800}
            style={{
              position: 'absolute',
              top: 6,
              start: 6,
              display: p.photoUrl ? 'none' : 'flex',
            }}>
            {p.img}
          </Txt>
        </Photo>
        {showAdd && (
          <Pressable
            onPress={add}
            accessibilityRole="button"
            accessibilityLabel={`${t.addToCart}: ${p.name}`}
            style={({ pressed }) => ({
              position: 'absolute',
              bottom: -8,
              end: -8,
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.accent800 : colors.accent,
              boxShadow: shadow.md,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}>
            <Icon name="plus" color={colors.white} />
            {hasOpt && q > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -9,
                  start: -9,
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 5,
                  borderRadius: 10,
                  backgroundColor: colors.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Txt w={600} size={11} lh={1.3} color={colors.white} center>
                  {q}
                </Txt>
              </View>
            )}
          </Pressable>
        )}
        {inCart && (
          // Claim touches on the stepper's gaps so they don't open the product.
          <View
            onStartShouldSetResponder={() => true}
            style={{ position: 'absolute', bottom: -8, end: -8 }}>
            <Stepper
              look="accent"
              qty={q}
              trashAtOne
              height={42}
              onInc={() => addLine(p.id, {}, 1)}
              onDec={() => changeQty(plainKey, -1)}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}
