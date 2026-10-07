import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useStoreStatus } from '@/hooks/use-store-status';
import { cardRole } from '@/components/card-role';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Txt } from '@/components/txt';
import type { Store } from '@/data/catalog';
import type { Strings } from '@/data/strings';
import { useApp, useT } from '@/store/app-store';
import { categoryIcon, fmt } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';

export function openStore(id: string) {
  router.push({ pathname: '/store/[id]', params: { id } });
}

export function feeText(s: Store, t: Strings) {
  return s.fee === 0 ? t.free : fmt(s.fee);
}

export function feeColor(s: Store) {
  return s.fee === 0 ? colors.mint700 : colors.neutral700;
}

export function timeText(s: Store) {
  return `${s.tMin}–${s.tMax} min`;
}

/** Round heart button over a store photo. */
export function FavButton({ id, size = 36 }: { id: string; size?: number }) {
  const fav = useApp((s) => s.favStores.includes(id));
  const toggleFav = useApp((s) => s.toggleFav);
  return (
    <Pressable
      onPress={() => toggleFav('favStores', id)}
      accessibilityRole="button"
      accessibilityLabel="Favorite"
      accessibilityState={{ selected: fav }}
      hitSlop={4}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 6,
        end: 6,
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        boxShadow: shadow.sm,
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}>
      <Icon name="heart" filled={fav} color={fav ? colors.accent : colors.text} />
    </Pressable>
  );
}

/** Delivery-time pill pinned to the bottom of a photo. */
export function TimePill({
  store,
  accent,
  size = 15,
}: {
  store: Store;
  accent?: boolean;
  size?: number;
}) {
  const fg = accent ? colors.white : colors.text;
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 8,
        start: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        backgroundColor: accent ? colors.accent : colors.card,
        boxShadow: accent ? undefined : shadow.sm,
      }}>
      <Icon name="clock" size={15} color={fg} />
      <Txt heading size={size} lh={1.2} color={fg}>
        {timeText(store)}
      </Txt>
    </View>
  );
}

function Rating({ store, withReviews }: { store: Store; withReviews?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name="star" size={13} filled color={colors.saffron} />
      <Txt size={13} w={500}>
        {store.rating.toFixed(1)}
      </Txt>
      {withReviews && (
        <Txt size={13} w={500} color={colors.neutral600}>
          ({store.reviews})
        </Txt>
      )}
    </View>
  );
}

function FeeLine({ store }: { store: Store }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="bike" size={15} color={feeColor(store)} />
      <Txt size={13} w={500} color={feeColor(store)}>
        {feeText(store, t)}
      </Txt>
    </View>
  );
}

const card = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  boxShadow: shadow.sm,
  overflow: 'hidden',
} as const;

const photoEdge = { borderBottomWidth: 1, borderBottomColor: colors.divider } as const;

/** "Popular near you" carousel card. */
export function PopularCard({ store }: { store: Store }) {
  return (
    <Pressable
      onPress={() => openStore(store.id)}
      accessibilityRole={cardRole}
      accessibilityLabel={store.name}
      style={({ pressed }) => [card, { width: 252 }, pressed && { opacity: 0.92 }]}>
      <Photo
        icon={categoryIcon[store.cat]}
        caption={store.img}
        style={[{ height: 136 }, photoEdge]}>
        <FavButton id={store.id} />
        <TimePill store={store} />
      </Photo>
      <View style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, gap: 3 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
          <Txt heading size={19} numberOfLines={1} style={{ flexShrink: 1 }}>
            {store.name}
          </Txt>
          <Rating store={store} withReviews />
        </View>
        <Txt size={13} color={colors.neutral700} numberOfLines={1}>
          {store.cuisine}
        </Txt>
        <FeeLine store={store} />
      </View>
    </Pressable>
  );
}

/** "Fast delivery" carousel card. */
export function FastCard({ store }: { store: Store }) {
  const t = useT();
  return (
    <Pressable
      onPress={() => openStore(store.id)}
      accessibilityRole="button"
      accessibilityLabel={store.name}
      style={({ pressed }) => [card, { width: 200 }, pressed && { opacity: 0.92 }]}>
      <Photo icon={categoryIcon[store.cat]} iconSize={28} style={[{ height: 110 }, photoEdge]}>
        <TimePill store={store} accent />
      </Photo>
      <View style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, gap: 2 }}>
        <Txt heading size={18} numberOfLines={1}>
          {store.name}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="star" size={13} filled color={colors.saffron} />
          <Txt size={13} color={colors.neutral700}>
            {store.rating.toFixed(1)} ·{' '}
            <Txt size={13} w={500} color={feeColor(store)}>
              {feeText(store, t)}
            </Txt>
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

/** Full-width "Recommended for you" card, dimmed with the opening time when closed. */
export function RecommendedCard({ store }: { store: Store }) {
  const status = useStoreStatus(store.id);
  return (
    <Pressable
      onPress={() => openStore(store.id)}
      accessibilityRole={cardRole}
      accessibilityLabel={store.name}
      style={({ pressed }) => [card, pressed && { opacity: 0.92 }]}>
      <Photo
        icon={categoryIcon[store.cat]}
        caption={store.img}
        style={[{ height: 170 }, photoEdge]}>
        <FavButton id={store.id} size={40} />
        <TimePill store={store} size={16} />
        {!status.open && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              start: 0,
              end: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(251, 246, 239, 0.72)',
            }}>
            <Txt heading size={22} center>
              {status.closedLabel}
            </Txt>
          </View>
        )}
      </Photo>
      <View
        style={{
          paddingTop: 12,
          paddingHorizontal: 14,
          paddingBottom: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
        }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt heading size={18}>
            {store.name}
          </Txt>
          <Txt size={13} color={colors.neutral700}>
            {store.cuisine} · {store.area}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Rating store={store} />
          <FeeLine store={store} />
        </View>
      </View>
    </Pressable>
  );
}
