// Reads the live catalogue, which changes in place: opt out of React Compiler memoisation.
'use no memo';

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useStoreStatus } from '@/hooks/use-store-status';
import { cardRole } from '@/components/card-role';
import { IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Tag } from '@/components/tag';
import { Txt } from '@/components/txt';
import { type Product, type Store, storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { categoryIcon, fmt } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';
import { useCatalog } from '@/hooks/use-catalog';

const row = {
  flexDirection: 'row',
  gap: 12,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.divider,
} as const;

export function StoreRow({ store }: { store: Store }) {
  useCatalog();
  const status = useStoreStatus(store.id);
  const t = useT();
  const feeColor = store.fee === 0 ? colors.mint700 : colors.neutral700;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
      accessibilityRole="button"
      accessibilityLabel={store.name}
      style={({ pressed }) => [row, pressed && { opacity: 0.7 }]}>
      <Photo
        icon={categoryIcon[store.cat]}
        iconSize={28}
        style={{ width: 76, height: 76, borderRadius: radius.lg, boxShadow: shadow.sm }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt heading size={19} numberOfLines={1} style={{ flexShrink: 1 }}>
            {store.name}
          </Txt>
          {!status.open && <Tag tone="neutral" label={status.closedLabel} />}
        </View>
        <Txt size={13} color={colors.neutral700} numberOfLines={1}>
          {store.cuisine}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="star" size={13} filled color={colors.saffron} />
            <Txt size={13} w={500}>
              {store.rating.toFixed(1)}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={15} />
            <Txt size={13} w={500}>
              {`${store.tMin}–${store.tMax} min`}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="bike" size={15} color={feeColor} />
            <Txt size={13} w={500} color={feeColor}>
              {store.fee === 0 ? t.free : fmt(store.fee)}
            </Txt>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function ProductRow({ product: p }: { product: Product }) {
  useCatalog();
  const t = useT();
  const addLine = useApp((s) => s.addLine);
  const showToast = useApp((s) => s.showToast);
  const store = storeById[p.storeId];
  const open = () => router.push({ pathname: '/product/[id]', params: { id: p.id } });
  return (
    <Pressable
      onPress={open}
      accessibilityRole={cardRole}
      accessibilityLabel={p.name}
      style={({ pressed }) => [row, { alignItems: 'center' }, pressed && { opacity: 0.7 }]}>
      <Photo
        icon={categoryIcon[store.cat]}
        iconSize={28}
        style={{ width: 56, height: 56, borderRadius: radius.md }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={500}>{p.name}</Txt>
        <Txt size={13} color={colors.neutral700}>
          {`${store.name} · ${(p.opt ? t.from + ' ' : '') + fmt(p.price)}`}
        </Txt>
      </View>
      <IconButton
        name="plus"
        size={40}
        color={colors.white}
        accessibilityLabel={`${t.addToCart}: ${p.name}`}
        onPress={() => {
          if (p.opt) open();
          else if (addLine(p.id, {}, 1)) showToast(`${t.added} · ${p.name}`);
        }}
        style={{ backgroundColor: colors.accent, boxShadow: shadow.accent }}
      />
    </Pressable>
  );
}
