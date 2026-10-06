import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { cardRole } from '@/components/card-role';
import { Button, IconButton } from '@/components/button';
import { CartBar } from '@/components/cart-bar';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { categories, type CategoryId } from '@/data/catalog';
import { useApp, useRtl, useT } from '@/store/app-store';
import { search, sortLabel } from '@/store/derive';
import { colors, fontFamily, radius } from '@/theme';

import { ProductRow, StoreRow } from './result-rows';

const allLabel = { en: 'All', fr: 'Tout', ar: 'الكل' } as const;
const priceLabels = ['DH', 'DH DH', 'DH DH DH'];

/** Search with filters: idle (recent + trending), loading, empty and results states. */
export function Search() {
  const t = useT();
  const rtl = useRtl();
  const lang = useApp((s) => s.lang);
  const q = useApp((s) => s.q);
  const fCat = useApp((s) => s.fCat);
  const fRating = useApp((s) => s.fRating);
  const fFast = useApp((s) => s.fFast);
  const fPrice = useApp((s) => s.fPrice);
  const sort = useApp((s) => s.sort);
  const searching = useApp((s) => s.searching);
  const set = useApp((s) => s.set);
  const kickSearch = useApp((s) => s.kickSearch);
  const addRecent = useApp((s) => s.addRecent);
  const clearFilters = useApp((s) => s.clearFilters);

  const input = useRef<TextInput>(null);
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  useEffect(() => {
    if (focus !== '1') return;
    const id = setTimeout(() => input.current?.focus(), 60);
    router.setParams({ focus: '' });
    return () => clearTimeout(id);
  }, [focus]);

  const { storeResults, productResults, active } = search({
    q,
    fCat,
    fRating,
    fFast,
    fPrice,
    sort,
  });
  const toggle = (patch: Parameters<typeof set>[0]) => {
    set(patch);
    kickSearch();
  };
  const total = storeResults.length + productResults.length;

  return (
    <Screen>
      <View
        style={{
          paddingTop: 4,
          paddingHorizontal: 16,
          paddingBottom: 10,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 50,
            paddingStart: 16,
            paddingEnd: 6,
            borderWidth: 1.5,
            borderColor: colors.accent,
            borderRadius: radius.pill,
            backgroundColor: colors.card,
          }}>
          <Icon name="search" color={colors.neutral700} />
          <TextInput
            ref={input}
            value={q}
            onChangeText={(v) => {
              set({ q: v });
              kickSearch();
            }}
            onSubmitEditing={() => addRecent(q)}
            returnKeyType="search"
            placeholder={t.searchPh}
            placeholderTextColor={colors.neutral500}
            cursorColor={colors.accent}
            selectionColor={colors.accent200}
            accessibilityLabel={t.searchPh}
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              padding: 0,
              fontSize: 16,
              fontFamily: fontFamily('body', 400, rtl),
              color: colors.text,
              textAlign: rtl ? 'right' : 'left',
            }}
          />
          {!!q && (
            <IconButton
              name="x"
              size={36}
              color={colors.neutral700}
              accessibilityLabel="Clear"
              onPress={() => set({ q: '' })}
            />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8 }}>
          <Pressable
            onPress={() => router.push('/sort')}
            accessibilityRole="button"
            accessibilityLabel={`${t.sort}: ${sortLabel(sort, t)}`}
            style={({ pressed }) => ({
              height: 36,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: colors.text,
              borderRadius: radius.pill,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="sliders" size={15} />
            <Txt w={500} size={13} lh={1.25}>
              {sortLabel(sort, t)}
            </Txt>
          </Pressable>
          <Chip label="★ 4.5+" on={fRating} onPress={() => toggle({ fRating: !fRating })} />
          <Chip label="≤ 25 min" on={fFast} onPress={() => toggle({ fFast: !fFast })} />
          <Chip
            label={fPrice ? priceLabels[fPrice - 1] : t.price}
            on={!!fPrice}
            onPress={() => toggle({ fPrice: (fPrice + 1) % 4 })}
          />
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8 }}>
          {([null, ...categories] as (CategoryId | null)[]).map((c) => (
            <Chip
              key={c ?? 'all'}
              label={c ? t[`cat_${c}`] : `${t.stores} · ${allLabel[lang]}`}
              on={fCat === c}
              height={32}
              fontSize={12}
              style={{ paddingHorizontal: 10 }}
              onPress={() => toggle({ fCat: c })}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 6, paddingHorizontal: 16, paddingBottom: 24 }}>
        {!active && <Idle />}
        {active && searching && <Loading />}
        {active && !searching && total === 0 && (
          <View style={{ paddingVertical: 56 }}>
            <EmptyState icon="search" title={t.noResults} body={t.noResultsBody}>
              <Button
                variant="secondary"
                label={t.clear}
                onPress={clearFilters}
                style={{ height: 46, paddingHorizontal: 20, marginTop: 8 }}
              />
            </EmptyState>
          </View>
        )}
        {active && !searching && total > 0 && (
          <>
            <Txt size={13} color={colors.neutral700} style={{ paddingTop: 10, paddingBottom: 2 }}>
              {`${storeResults.length} ${t.stores.toLowerCase()} · ${sortLabel(sort, t)}`}
            </Txt>
            {storeResults.map((s) => (
              <StoreRow key={s.id} store={s} />
            ))}
            {productResults.length > 0 && (
              <>
                <Txt label style={{ marginTop: 24, marginBottom: 2 }}>
                  {t.products}
                </Txt>
                {productResults.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
      <CartBar />
    </Screen>
  );
}

const trending = [
  'Tajine',
  'Pizza',
  'Msemen',
  'Paracetamol',
  'Argan',
  'Orange juice',
  'Burger',
  'Couscous',
];

function Idle() {
  const t = useT();
  const recent = useApp((s) => s.recent);
  const set = useApp((s) => s.set);
  const searchFor = useApp((s) => s.searchFor);
  return (
    <View>
      {recent.length > 0 && (
        <>
          <Txt label style={{ marginTop: 16, marginBottom: 4 }}>
            {t.recent}
          </Txt>
          {recent.map((r) => (
            <Pressable
              key={r}
              onPress={() => searchFor(r)}
              accessibilityRole={cardRole}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
              }}>
              <Icon name="clock" color={colors.neutral600} />
              <Txt style={{ flex: 1 }}>{r}</Txt>
              <IconButton
                name="x"
                size={40}
                color={colors.neutral600}
                accessibilityLabel={`Remove ${r}`}
                onPress={() => set({ recent: recent.filter((x) => x !== r) })}
              />
            </Pressable>
          ))}
        </>
      )}
      <Txt label style={{ marginTop: 24, marginBottom: 10 }}>
        {t.trending}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {trending.map((x) => (
          <Pressable
            key={x}
            onPress={() => searchFor(x)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 38,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: pressed ? colors.accent : colors.divider,
              borderRadius: radius.pill,
              backgroundColor: colors.card,
            })}>
            <Icon name="search" size={15} color={colors.accent} />
            <Txt w={500} size={14} lh={1.25}>
              {x}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Loading() {
  const bar = (h: number, w: `${number}%`) => (
    <View style={{ height: h, width: w, backgroundColor: colors.neutral200 }} />
  );
  return (
    <View accessibilityLabel="Loading">
      {[1, 2, 3, 4].map((k) => (
        <View
          key={k}
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}>
          <View style={{ width: 76, height: 76, backgroundColor: colors.neutral200 }} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            {bar(16, '60%')}
            {bar(12, '80%')}
            {bar(12, '40%')}
          </View>
        </View>
      ))}
    </View>
  );
}
