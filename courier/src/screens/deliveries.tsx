import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, Scroll } from '@/components/screen';
import { SectionLabel, Txt } from '@/components/txt';
import { Circle, Dot, PressCard, SegBar, StatusTag, TAGS, card, well } from '@/components/ui';
import { historyKey, type HistoryEntry } from '@/data/demo';
import { inDelivery, useCourier, useT, useOrder } from '@/store/courier-store';
import { colors } from '@/theme';
import { activeTag } from './shared';

const ETA: Record<string, string> = {
  toPickup: 'pickup in 8 min',
  atPickup: 'at pickup',
  toCustomer: 'drop-off in 10 min',
  atCustomer: 'arriving',
  confirm: 'arriving',
};

export function Deliveries() {
  const order = useOrder();
  const t = useT();
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const phase = useCourier((s) => s.phase);
  const online = useCourier((s) => s.online);
  const live = useCourier((s) => s.source === 'live');
  const history = useCourier((s) => s.history);
  const busy = inDelivery(phase);
  const tag = activeTag(phase);

  const groups: { label: string; items: HistoryEntry[] }[] = [];
  for (const h of history) {
    const g = groups.find((x) => x.label === h.g);
    if (g) g.items.push(h);
    else groups.push({ label: h.g, items: [h] });
  }

  return (
    <Screen>
      <Scroll>
        <Txt title size={32} accessibilityRole="header" style={{ marginTop: 6 }}>
          {t('Deliveries')}
        </Txt>
        <SegBar
          options={[
            { key: 'active', label: t('Active') },
            { key: 'history', label: t('History') },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'active' ? (
          <View style={{ gap: 12 }}>
            {busy ? (
              <>
                <PressCard
                  onPress={() => router.push('/delivery')}
                  style={[card, styles.orderCard]}>
                  <View style={styles.rowBetween}>
                    <StatusTag tag={tag} label={t(tag.label)} />
                    <Txt size={13} color={colors.neutral700}>
                      {t('Current')} · {order.id}
                    </Txt>
                  </View>
                  <Txt size={17} weight={700}>
                    {t(order.store)} → {t(order.cust)}
                  </Txt>
                  <View style={styles.rowBetween}>
                    <Txt size={14} color={colors.neutral700}>
                      {t('ETA')} {t(ETA[phase!] ?? '')}
                    </Txt>
                    <Txt h size={20}>
                      {order.earn} DH
                    </Txt>
                  </View>
                </PressCard>
                {/* Design-only stacked job; live couriers carry one order at a time. */}
                {!live && (
                  <View style={[card, styles.orderCard, { opacity: 0.92 }]}>
                    <View style={styles.rowBetween}>
                      <StatusTag tag={TAGS.waiting} label={t('Waiting for pickup')} />
                      <Txt size={13} color={colors.neutral700}>
                        {t('Next')} · #1289
                      </Txt>
                    </View>
                    <Txt size={17} weight={700}>
                      Pharmacie Atlas → Salma
                    </Txt>
                    <View style={styles.rowBetween}>
                      <Txt size={14} color={colors.neutral700}>
                        Hivernage · {t('starts after current')}
                      </Txt>
                      <Txt h size={20}>
                        24 DH
                      </Txt>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={[well, styles.empty]}>
                <Circle size={72} bg={colors.mint200}>
                  <Icon name="pkg" size={30} color={colors.mint700} />
                </Circle>
                <Txt title size={20} style={{ marginTop: 6 }}>
                  {t('No active deliveries')}
                </Txt>
                <Txt size={15} color={colors.neutral700} style={{ textAlign: 'center' }}>
                  {t(
                    online
                      ? "You're online — new requests will appear here."
                      : 'Go online from Home to start receiving orders.',
                  )}
                </Txt>
              </View>
            )}
            <View style={styles.legend}>
              {[TAGS.waiting, TAGS.picking, TAGS.way, TAGS.done].map((lg) => (
                <View key={lg.label} style={[styles.row, { gap: 6 }]}>
                  <Dot size={8} color={lg.dot} />
                  <Txt size={12} color={colors.neutral700}>
                    {t(lg.label)}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            {groups.map((g) => (
              <View key={g.label} style={{ gap: 8 }}>
                <SectionLabel>{t(g.label)}</SectionLabel>
                {g.items.map((h) => (
                  <PressCard
                    key={h.id}
                    onPress={() =>
                      router.push({ pathname: '/history/[id]', params: { id: historyKey(h.id) } })
                    }
                    style={[card, styles.histRow]}>
                    <Circle size={40} bg={colors.mint200}>
                      <Icon name="check" size={18} color={colors.mint700} />
                    </Circle>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt size={15} weight={700} numberOfLines={1}>
                        {t(h.store)} → {t(h.cust)}
                      </Txt>
                      <Txt size={13} color={colors.neutral700}>
                        {t('Order')} {h.id} · {h.time}
                      </Txt>
                    </View>
                    <Txt h size={18}>
                      {h.earn} DH
                    </Txt>
                  </PressCard>
                ))}
              </View>
            ))}
          </View>
        )}
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderCard: { padding: 18, gap: 12 },
  empty: { paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  histRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
