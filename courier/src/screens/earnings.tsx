import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen, Scroll } from '@/components/screen';
import { SectionLabel, Txt } from '@/components/txt';
import { Circle, SegBar, card, well } from '@/components/ui';
import { fmt } from '@/data/demo';
import { totals, useCourier, useT } from '@/store/courier-store';
import { colors, radius } from '@/theme';

type Period = 'today' | 'week' | 'month';

export function Earnings() {
  const t = useT();
  const [period, setPeriod] = useState<Period>('today');
  const today = useCourier((s) => s.today);
  const balance = useCourier((s) => s.balance);
  const payouts = useCourier((s) => s.payouts);
  const tot = totals(today);
  const T = today;

  const EP = {
    today: {
      label: 'Today · Wed 30 Sep',
      total: tot.today,
      count: T.dels,
      hours: '6h 24m',
      rows: [
        ['Delivery fees', fmt(T.fees)],
        ['Bonuses', fmt(tot.bonusToday)],
        ['Tips', fmt(T.tips)],
        ['Adjustments', fmt(T.adj)],
      ],
    },
    week: {
      label: 'This week · 24–30 Sep',
      total: tot.week,
      count: 34 + T.dels,
      hours: '38h 10m',
      rows: [
        ['Delivery fees', fmt(tot.week - 125 - (42.5 + T.tips) - T.adj)],
        ['Bonuses', '125'],
        ['Tips', fmt(42.5 + T.tips)],
        ['Adjustments', fmt(T.adj)],
      ],
    },
    month: {
      label: 'September 2026',
      total: tot.month,
      count: 160 + T.dels,
      hours: '152h',
      rows: [
        ['Delivery fees', fmt(tot.month - 425 - (180 + T.tips) - (15 + T.adj))],
        ['Bonuses', '425'],
        ['Tips', fmt(180 + T.tips)],
        ['Adjustments', fmt(15 + T.adj)],
      ],
    },
  }[period];
  const days: [string, number][] = [
    ['Thu', 210],
    ['Fri', 232],
    ['Sat', 258],
    ['Sun', 176],
    ['Mon', 150],
    ['Tue', 148],
    ['Wed', tot.today],
  ];

  return (
    <Screen>
      <Scroll>
        <Txt title size={32} accessibilityRole="header" style={{ marginTop: 6 }}>
          {t('Earnings')}
        </Txt>
        <SegBar<Period>
          options={[
            { key: 'today', label: t('Today') },
            { key: 'week', label: t('Week') },
            { key: 'month', label: t('Month') },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <View style={styles.summary}>
          <View>
            <Txt size={14} color={colors.mint300}>
              {t(EP.label)}
            </Txt>
            <Txt h size={48} lh={1.1} color={colors.mint100}>
              {fmt(EP.total)}{' '}
              <Txt h size={24} color={colors.mint100}>
                DH
              </Txt>
            </Txt>
            <Txt size={15} color={colors.mint200}>
              {EP.count} {t('deliveries')} · {t(EP.hours)} {t('online')}
            </Txt>
          </View>
          <View style={styles.chart} accessibilityLabel="Daily earnings, last 7 days">
            {days.map(([d, v], i) => {
              const isToday = i === 6;
              return (
                <View key={d} style={styles.barCol}>
                  <Txt
                    size={11}
                    weight={700}
                    color={colors.mint100}
                    style={{ opacity: isToday ? 1 : 0.7 }}>
                    {Math.round(v)}
                  </Txt>
                  <View
                    style={{
                      alignSelf: 'stretch',
                      borderRadius: 10,
                      height: Math.round((v / 270) * 88),
                      backgroundColor: isToday ? colors.accent400 : colors.mint500,
                    }}
                  />
                  <Txt size={12} color={colors.mint300}>
                    {t(isToday ? 'Today' : d)}
                  </Txt>
                </View>
              );
            })}
          </View>
        </View>
        <View style={[card, { paddingVertical: 8, paddingHorizontal: 20 }]}>
          {EP.rows.map(([label, val]) => (
            <View key={label} style={[styles.rowBetween, styles.breakdownRow]}>
              <Txt size={15} color={colors.neutral800}>
                {t(label)}
              </Txt>
              <Txt size={15} weight={700}>
                {val} DH
              </Txt>
            </View>
          ))}
          <View style={[styles.rowBetween, { paddingVertical: 14 }]}>
            <Txt size={16} weight={700}>
              {t('Total')}
            </Txt>
            <Txt h size={22}>
              {fmt(EP.total)} DH
            </Txt>
          </View>
        </View>
        <View style={[well, { padding: 20, gap: 12 }]}>
          <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <Txt size={14} color={colors.neutral700}>
                {t('Available for payout')}
              </Txt>
              <Txt h size={32} lh={1.15}>
                {fmt(balance)} DH
              </Txt>
              <Txt size={13} color={colors.neutral700}>
                {t('Auto-payout Mon 5 Oct · CIH Bank •••• 4417')}
              </Txt>
            </View>
            <Circle size={48} bg={colors.accent200}>
              <Icon name="wallet" size={22} color={colors.accent800} />
            </Circle>
          </View>
          <Btn
            label={t('Withdraw now')}
            disabled={balance <= 0}
            onPress={() => router.push('/withdraw')}
            height={56}
            fontSize={17}
          />
        </View>
        <View style={{ gap: 8 }}>
          <SectionLabel style={{ marginTop: 4 }}>{t('Payout history')}</SectionLabel>
          {payouts.map((po, i) => (
            <View key={i} style={[card, styles.payout]}>
              <Circle size={40} bg={colors.neutral300}>
                <Icon name="card" size={18} color={colors.neutral800} />
              </Circle>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight={700}>
                  {t(po.date)}
                </Txt>
                <Txt size={13} color={colors.neutral700}>
                  {t(po.sub)}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt h size={17}>
                  {po.amt} DH
                </Txt>
                <Txt
                  size={12}
                  weight={700}
                  color={po.st === 'Paid' ? colors.mint700 : colors.accent700}>
                  {t(po.st)}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      </Scroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summary: { borderRadius: radius.lg, backgroundColor: colors.mint700, padding: 22, gap: 18 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' },
  breakdownRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
