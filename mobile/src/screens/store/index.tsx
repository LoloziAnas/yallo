import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStoreStatus } from '@/hooks/use-store-status';
import { IconButton } from '@/components/button';
import { CartBar } from '@/components/cart-bar';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Screen, useBottomPad } from '@/components/screen';
import { Tag } from '@/components/tag';
import { Txt } from '@/components/txt';
import { products, storeById } from '@/data/catalog';
import { useApp, useRtl, useT } from '@/store/app-store';
import { fmt, storeIcon } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';

import { MenuItem } from './menu-item';
import { SectionTabs, TAB_HEIGHT } from './section-tabs';

const HERO = 210;

export function StoreScreen({ id }: { id: string }) {
  const t = useT();
  const rtl = useRtl();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomPad(12);
  const store = storeById[id] ?? storeById.m1;
  const status = useStoreStatus(store.id);
  const fav = useApp((s) => s.favStores.includes(store.id));
  const toggleFav = useApp((s) => s.toggleFav);

  const sections = useMemo(() => {
    const items = products.filter((p) => p.storeId === store.id);
    return [...new Set(items.map((p) => p.sec))].map((name) => ({
      name,
      items: items.filter((p) => p.sec === name),
    }));
  }, [store.id]);

  const scroller = useRef<ScrollView>(null);
  // Content offsets of the in-flow tab row and of each section, measured on layout.
  const tabsY = useRef(0);
  const listY = useRef(0);
  const secY = useRef<number[]>([]);
  const [active, setActive] = useState(0);
  // After tapping a tab, keep it highlighted even if the menu can't scroll that section to the top.
  const jumped = useRef(false);
  const [stuck, setStuck] = useState(false);

  // The pinned copy of the tabs sits under the status bar, so content scrolls to just below it.
  const pinned = insets.top + TAB_HEIGHT;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setStuck(y >= tabsY.current - insets.top);
    let cur = 0;
    secY.current.forEach((sy, i) => {
      if (listY.current + sy - pinned - 12 <= y) cur = i;
    });
    if (!jumped.current) setActive(cur);
  };

  const jump = (i: number) => {
    setActive(i);
    jumped.current = true;
    scroller.current?.scrollTo({ y: listY.current + secY.current[i] - pinned, animated: true });
  };

  const tabs = sections.map((s) => s.name);

  return (
    <Screen edges={[]}>
      <ScrollView
        ref={scroller}
        onScroll={onScroll}
        onScrollBeginDrag={() => (jumped.current = false)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        <Photo
          icon={storeIcon(store.id)}
          iconSize={72}
          caption={store.img}
          captionAt="bottom-end"
          style={{
            height: HERO + insets.top,
            paddingTop: insets.top,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 6,
              start: 12,
              end: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
            <IconButton
              look="float"
              name={rtl ? 'chevR' : 'chevL'}
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
            <IconButton
              look="float"
              name="heart"
              filled={fav}
              color={fav ? colors.accent : colors.text}
              accessibilityLabel="Favorite"
              onPress={() => toggleFav('favStores', store.id)}
            />
          </View>
        </Photo>

        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={{
              width: 76,
              height: 76,
              marginTop: -38,
              borderWidth: 4,
              borderColor: colors.bg,
              borderRadius: radius.lg,
              backgroundColor: colors.card,
              boxShadow: shadow.md,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Txt heading size={28} color={colors.accent700}>
              {store.initials}
            </Txt>
          </View>
          <Txt heading size={34} style={{ marginTop: 12, marginBottom: 2 }}>
            {store.name}
          </Txt>
          <Txt size={14} color={colors.neutral700}>
            {store.cuisine} · {store.area}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <MetaCard
              top={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="star" filled size={18} color={colors.saffron} />
                  <Txt heading size={18}>
                    {store.rating.toFixed(1)}
                  </Txt>
                </View>
              }
              bottom={`${store.reviews} ${t.ratings}`}
            />
            <MetaCard
              top={
                <Txt heading size={18}>
                  {`${store.tMin}–${store.tMax} min`}
                </Txt>
              }
              bottom={t.delivery}
            />
            <MetaCard
              top={
                <Txt heading size={18} color={store.fee === 0 ? colors.mint700 : colors.neutral700}>
                  {store.fee === 0 ? t.free : fmt(store.fee)}
                </Txt>
              }
              bottom={`${t.minOrder} ${fmt(store.min)}`}
            />
          </View>
          {!status.open && (
            <Tag
              tone="neutral"
              size={14}
              label={status.closedLabel}
              style={{
                alignSelf: 'stretch',
                gap: 8,
                marginTop: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}>
              <Icon name="clock" size={15} color={colors.neutral800} />
            </Tag>
          )}
        </View>

        <View style={{ marginTop: 18 }} onLayout={(e) => (tabsY.current = e.nativeEvent.layout.y)}>
          <SectionTabs tabs={tabs} active={active} onPick={jump} />
        </View>

        <View
          style={{ paddingHorizontal: 16, paddingBottom: 28 }}
          onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
          {sections.map((sec, i) => (
            <View
              key={sec.name}
              style={{ paddingTop: 22 }}
              onLayout={(e) => (secY.current[i] = e.nativeEvent.layout.y)}>
              <Txt heading size={23} style={{ marginBottom: 2 }}>
                {sec.name}
              </Txt>
              {sec.items.map((p) => (
                <MenuItem key={p.id} product={p} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Pinned copy of the section tabs once the in-flow row scrolls under the status bar. */}
      {stuck && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
            backgroundColor: colors.bg,
          }}>
          <SectionTabs tabs={tabs} active={active} onPick={jump} />
        </View>
      )}

      <CartBar storeId={store.id} bottomPad={bottomPad} />
    </Screen>
  );
}

function MetaCard({ top, bottom }: { top: React.ReactNode; bottom: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius.md,
        boxShadow: shadow.sm,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}>
      {top}
      <Txt size={12} color={colors.neutral700}>
        {bottom}
      </Txt>
    </View>
  );
}
