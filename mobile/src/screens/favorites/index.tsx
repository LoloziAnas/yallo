// Reads the live catalogue, which changes in place: opt out of React Compiler memoisation.
'use no memo';

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { cardRole } from '@/components/card-role';
import { Button, IconButton } from '@/components/button';
import { CartBar } from '@/components/cart-bar';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/txt';
import { type Product, productById, type Store, storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { categoryIcon, fmt, storeIcon } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';
import { useCatalog } from '@/hooks/use-catalog';

type Tab = 'stores' | 'products';

/** Favourite stores and products. Hearts remove items; products can be added straight to the cart. */
export function Favorites() {
  useCatalog();
  const t = useT();
  const [tab, setTab] = useState<Tab>('stores');
  const favStores = useApp((s) => s.favStores);
  const favProducts = useApp((s) => s.favProducts);
  const list = tab === 'stores' ? favStores : favProducts;

  return (
    <Screen>
      <View
        style={{
          paddingTop: 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}>
        <Txt heading size={36}>
          {t.favorites}
        </Txt>
        <Segmented
          options={[
            { value: 'stores', label: t.stores },
            { value: 'products', label: t.products },
          ]}
          value={tab}
          onChange={setTab}
          padV={8}
          padH={18}
          fontSize={14}
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {list.length === 0 && (
          <View style={{ paddingVertical: 64 }}>
            <EmptyState icon="heart" title={t.favEmpty} body={t.favEmptyBody} />
          </View>
        )}
        {tab === 'stores'
          ? favStores.map((id) => <StoreRow key={id} store={storeById[id]} />)
          : favProducts
              .filter((id) => productById[id])
              .map((id) => <ProductRow key={id} product={productById[id]} />)}
      </ScrollView>
      <CartBar />
    </Screen>
  );
}

function StoreRow({ store }: { store: Store }) {
  const toggleFav = useApp((s) => s.toggleFav);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
      accessibilityRole={cardRole}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Photo
        icon={categoryIcon[store.cat]}
        iconSize={28}
        style={{ width: 76, height: 76, borderRadius: radius.lg, boxShadow: shadow.sm }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt heading size={19}>
          {store.name}
        </Txt>
        <Txt size={13} color={colors.neutral700}>
          {store.cuisine}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="star" size={13} color={colors.saffron} filled />
            <Txt size={13} w={500}>
              {store.rating.toFixed(1)}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={15} />
            <Txt size={13} w={500}>
              {store.tMin}–{store.tMax} min
            </Txt>
          </View>
        </View>
      </View>
      <IconButton
        name="heart"
        filled
        color={colors.accent}
        accessibilityLabel="Remove favorite"
        onPress={() => toggleFav('favStores', store.id)}
        style={{ backgroundColor: colors.accent100 }}
      />
    </Pressable>
  );
}

function ProductRow({ product }: { product: Product }) {
  const t = useT();
  const toggleFav = useApp((s) => s.toggleFav);
  const addLine = useApp((s) => s.addLine);
  const showToast = useApp((s) => s.showToast);
  const open = () => router.push({ pathname: '/product/[id]', params: { id: product.id } });
  const add = () => {
    if (product.opt) open();
    else if (addLine(product.id, {}, 1)) showToast(`${t.added} · ${product.name}`);
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole={cardRole}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Photo
        icon={storeIcon(product.storeId)}
        iconSize={28}
        style={{ width: 64, height: 64, borderRadius: radius.md }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={500}>{product.name}</Txt>
        <Txt size={13} color={colors.neutral700}>
          {storeById[product.storeId].name}
        </Txt>
        <Txt heading size={17}>
          {(product.opt ? t.from + ' ' : '') + fmt(product.price)}
        </Txt>
      </View>
      <IconButton
        name="heart"
        filled
        size={40}
        color={colors.accent}
        accessibilityLabel="Remove favorite"
        onPress={() => toggleFav('favProducts', product.id)}
      />
      <Button
        accessibilityLabel={t.addToCart}
        onPress={add}
        style={{ width: 40, height: 40, paddingHorizontal: 0, paddingVertical: 0 }}>
        <Icon name="plus" color={colors.white} />
      </Button>
    </Pressable>
  );
}
