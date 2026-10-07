import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useIsStoreOpen } from '@/hooks/use-store-status';
import { Button, IconButton } from '@/components/button';
import { CartBar } from '@/components/cart-bar';
import { EmptyState } from '@/components/empty-state';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { categories } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { categoryIcon, fastStores, popularStores, recommendedStores, totals } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';

import { FastCard, openStore, PopularCard, RecommendedCard } from './store-cards';

/** Home: delivery address, search, promos, categories and store rails. */
export function Home() {
  const loading = useApp((s) => s.homeLoading);
  const networkError = useApp((s) => s.networkError);
  return (
    <Screen>
      <Header />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {loading ? <Skeleton /> : networkError ? <Offline /> : <Feed />}
      </ScrollView>
      <CartBar />
    </Screen>
  );
}

function Header() {
  const t = useT();
  const addr = useApp((s) => s.addresses.find((a) => a.id === s.addrId) ?? s.addresses[0]);
  const count = useApp((s) => totals(s.cart, s.promo).count);
  return (
    <View
      style={{
        paddingTop: 2,
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => router.push('/address')}
          accessibilityRole="button"
          accessibilityLabel={`${t.deliverTo} ${addr.label}`}
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 4,
          }}>
          <Icon name="pin" color={colors.accent} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={12} color={colors.neutral700}>
              {t.deliverTo}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt heading size={19} lh={1.25} numberOfLines={1} style={{ flexShrink: 1 }}>
                {`${addr.label} · ${addr.street}`}
              </Txt>
              <Icon name="down" size={15} />
            </View>
          </View>
        </Pressable>
        <IconButton
          name="bag"
          look="outline"
          accessibilityLabel={t.cart}
          onPress={() => router.push('/cart')}>
          {count > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -8,
                end: -8,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 5,
                borderRadius: 10,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt w={600} size={12} lh={1.3} color={colors.white}>
                {count}
              </Txt>
            </View>
          )}
        </IconButton>
      </View>
      <Pressable
        onPress={() => router.navigate({ pathname: '/search', params: { focus: '1' } })}
        accessibilityRole="search"
        accessibilityLabel={t.searchPh}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 50,
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          backgroundColor: colors.card,
          boxShadow: shadow.sm,
          opacity: pressed ? 0.85 : 1,
        })}>
        <Icon name="search" color={colors.neutral700} />
        <Txt color={colors.neutral700}>{t.searchPh}</Txt>
      </Pressable>
    </View>
  );
}

function Offline() {
  const t = useT();
  const retryHome = useApp((s) => s.retryHome);
  return (
    <View style={{ paddingTop: 72, paddingHorizontal: 16, paddingBottom: 72 }}>
      <EmptyState icon="wifiOff" tile={96} title={t.errT} body={t.errB}>
        <Button
          label={t.retry}
          icon="rotate"
          fontSize={16}
          onPress={retryHome}
          style={{ height: 50, paddingHorizontal: 28, marginTop: 10 }}
        />
      </EmptyState>
    </View>
  );
}

function Block({ h, w, flex }: { h: number; w?: number | `${number}%`; flex?: number }) {
  return <View style={{ height: h, width: w, flex, backgroundColor: colors.neutral200 }} />;
}

function Skeleton() {
  return (
    <View
      style={{ paddingVertical: 20, paddingHorizontal: 16, gap: 16 }}
      accessibilityLabel="Loading">
      <Block h={140} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ width: '31.5%', flexGrow: 1 }}>
            <Block h={84} />
          </View>
        ))}
      </View>
      <Block h={22} w="55%" />
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Block h={210} flex={1} />
        <Block h={210} w={80} />
      </View>
    </View>
  );
}

function Rail({
  children,
  gap,
  itemWidth,
}: {
  children: ReactNode;
  gap: number;
  itemWidth: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth + gap}
      decelerationRate="fast"
      contentContainerStyle={{ gap, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
      {children}
    </ScrollView>
  );
}

function SectionHead({
  title,
  icon,
  onSeeAll,
  top = 28,
}: {
  title: string;
  icon?: IconName;
  onSeeAll?: () => void;
  top?: number;
}) {
  const t = useT();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: top,
        paddingHorizontal: 16,
        paddingBottom: 10,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        {icon && <Icon name={icon} color={colors.accent} />}
        <Txt heading size={25}>
          {title}
        </Txt>
      </View>
      {onSeeAll && <Button variant="ghost" label={t.seeAll} fontSize={14} onPress={onSeeAll} />}
    </View>
  );
}

function Feed() {
  const isOpen = useIsStoreOpen();
  const t = useT();
  const set = useApp((s) => s.set);
  const showToast = useApp((s) => s.showToast);
  const openCategory = useApp((s) => s.openCategory);
  const kickSearch = useApp((s) => s.kickSearch);
  const seeAll = (patch: Parameters<typeof set>[0]) => {
    set(patch);
    router.navigate('/search');
    kickSearch();
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={314}
        decelerationRate="fast"
        contentContainerStyle={{
          gap: 14,
          paddingTop: 20,
          paddingHorizontal: 16,
          paddingBottom: 10,
        }}>
        <Promo
          bg={colors.accent}
          kicker={t.p1k}
          kickerColor={colors.accent100}
          title={t.p1t}
          titleSize={30}
          titleColor={colors.white}
          body={t.p1b}
          bodyColor="rgba(255,255,255,0.9)"
          raised
          onPress={() => {
            set({ promoInput: 'MARHABA' });
            showToast('MARHABA · ' + t.promo);
          }}
        />
        <Promo
          bg={colors.mint100}
          kicker={t.p2k}
          kickerColor={colors.mint700}
          title={t.p2t}
          body={t.p2b}
          icon="cart"
          iconColor={colors.mint}
          onPress={() => openCategory('groceries')}
        />
        <Promo
          bg={colors.saffron100}
          kicker={t.p3k}
          kickerColor={colors.accent700}
          title={t.p3t}
          body={t.p3b}
          icon="cookie"
          iconColor={colors.accent}
          onPress={() => openStore('m6')}
        />
      </ScrollView>

      <View
        style={{
          paddingTop: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}>
        {categories.map((c) => (
          <Pressable
            key={c}
            onPress={() => openCategory(c)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: '31%',
              flexGrow: 1,
              height: 92,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: pressed ? colors.accent100 : colors.card,
              borderRadius: radius.lg,
              boxShadow: shadow.sm,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}>
            <Icon name={categoryIcon[c]} size={28} color={colors.accent} />
            <Txt w={600} size={13} lh={1.2} center>
              {t[`cat_${c}`]}
            </Txt>
          </Pressable>
        ))}
      </View>

      <SectionHead title={t.popular} onSeeAll={() => seeAll({ sort: 'rating', fRating: true })} />
      <Rail gap={16} itemWidth={252}>
        {popularStores(isOpen).map((s) => (
          <PopularCard key={s.id} store={s} />
        ))}
      </Rail>

      <SectionHead
        title={t.fast}
        icon="zap"
        top={24}
        onSeeAll={() => seeAll({ sort: 'fast', fFast: true })}
      />
      <Rail gap={16} itemWidth={200}>
        {fastStores(isOpen).map((s) => (
          <FastCard key={s.id} store={s} />
        ))}
      </Rail>

      <SectionHead title={t.rec} top={24} />
      <View style={{ gap: 22, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 28 }}>
        {recommendedStores().map((s) => (
          <RecommendedCard key={s.id} store={s} />
        ))}
      </View>
    </View>
  );
}

type PromoProps = {
  bg: string;
  kicker: string;
  kickerColor: string;
  title: string;
  titleSize?: number;
  titleColor?: string;
  body: string;
  bodyColor?: string;
  icon?: IconName;
  iconColor?: string;
  /** Card shadow (the paprika card); the tinted ones are flat. */
  raised?: boolean;
  onPress: () => void;
};

function Promo({
  bg,
  kicker,
  kickerColor,
  title,
  titleSize = 28,
  titleColor = colors.text,
  body,
  bodyColor = colors.neutral700,
  icon,
  iconColor,
  raised,
  onPress,
}: PromoProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        width: 300,
        height: 144,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        borderRadius: radius.lg,
        backgroundColor: bg,
        boxShadow: raised ? shadow.sm : undefined,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <Txt
          size={11}
          lh={1.3}
          color={kickerColor}
          style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
          {kicker}
        </Txt>
        <Txt heading size={titleSize} lh={1} color={titleColor} numberOfLines={2}>
          {title}
        </Txt>
        <Txt size={13} lh={1.3} color={bodyColor} numberOfLines={1}>
          {body}
        </Txt>
      </View>
      {icon && <Icon name={icon} size={40} color={iconColor} />}
    </Pressable>
  );
}
