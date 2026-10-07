import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { BackButton, Btn } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen, Scroll, useBottomPad } from '@/components/screen';
import { SectionLabel, Txt } from '@/components/txt';
import {
  Circle,
  Dot,
  ListCard,
  ListRow,
  PressCard,
  Progress,
  card,
  haptic,
  well,
} from '@/components/ui';
import { CHALLENGE_GOAL, historyKey } from '@/data/demo';
import { inDelivery, useCourier, useT, useOrder } from '@/store/courier-store';
import { colors, radius } from '@/theme';

/** Pushed page: back button + title, then scrolling content. */
function Page({ title, children }: { title: string; children: React.ReactNode }) {
  const bottom = useBottomPad(20);
  return (
    <Screen>
      <View
        style={[styles.row, { gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }]}>
        <BackButton onPress={() => router.back()} />
        <Txt title size={22} accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Txt>
      </View>
      <Scroll top={4} gap={12} bottom={bottom}>
        {children}
      </Scroll>
    </Screen>
  );
}

export function Notifications() {
  const t = useT();
  const challenge = useCourier((s) => s.challenge);
  const list: { icon: IconName; title: string; body: string; time: string; unread: boolean }[] = [
    {
      icon: 'gift',
      title: 'Weekend challenge',
      body: `You're ${CHALLENGE_GOAL - challenge} deliveries away from +100 DH.`,
      time: '1h',
      unread: true,
    },
    {
      icon: 'wallet',
      title: 'Payout sent',
      body: '1,352 DH was sent to CIH Bank •••• 4417.',
      time: 'Mon',
      unread: true,
    },
    {
      icon: 'pkg',
      title: 'Order #1281 delivered',
      body: 'Salma rated you 5 stars — “Very fast, thank you!”',
      time: '17:16',
      unread: false,
    },
    {
      icon: 'check',
      title: 'Documents approved',
      body: 'Your insurance certificate is valid until March 2027.',
      time: 'Sep 22',
      unread: false,
    },
    {
      icon: 'msg',
      title: 'Support replied',
      body: 'Your adjustment of 15 DH for order #1198 was approved.',
      time: 'Sep 20',
      unread: false,
    },
    {
      icon: 'globe',
      title: 'New service zone',
      body: 'Targa and Agdal are now part of the Marrakech delivery area.',
      time: 'Sep 18',
      unread: false,
    },
  ];
  return (
    <Page title={t('Notifications')}>
      {list.map((n) => (
        // New items keep their highlight on this visit; the badge on Home clears on open.
        <View
          key={n.title}
          style={[styles.notif, { backgroundColor: n.unread ? colors.accent100 : colors.card }]}>
          <Circle size={44} bg={n.unread ? colors.accent : colors.surface}>
            <Icon name={n.icon} size={20} color={n.unread ? colors.white : colors.text} />
          </Circle>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
              <Txt size={15} weight={700} style={{ flexShrink: 1 }}>
                {t(n.title)}
              </Txt>
              <Txt size={12} color={colors.neutral700}>
                {t(n.time)}
              </Txt>
            </View>
            <Txt size={14} color={colors.neutral800}>
              {t(n.body)}
            </Txt>
          </View>
        </View>
      ))}
    </Page>
  );
}

const SUPPORT_CATS: [IconName, string][] = [
  ['pkg', 'Problem with an order'],
  ['store', 'Restaurant issue'],
  ['user', 'Customer issue'],
  ['wallet', 'Payment issue'],
  ['alert', 'Accident / emergency'],
  ['globe', 'Technical problem'],
  ['card', 'Account issue'],
];
const FAQS: [string, string][] = [
  [
    'How are delivery fees calculated?',
    'Each job pays 12 DH plus 3 DH per km of the whole trip (to the store, then to the customer), with a minimum of 15 DH. Tips come on top and are all yours. You see the amount before you accept.',
  ],
  [
    'When do I get paid?',
    'Your earnings are paid every Monday to the bank account in your profile. You can also withdraw your balance from Earnings.',
  ],
  [
    'What if a customer pays with a large bill?',
    "Carry change for up to 200 DH. If you can't break a bill, tell the customer before handing over the order and contact support from the delivery screen. Never leave an order unpaid.",
  ],
];

export function Support() {
  const order = useOrder();
  const t = useT();
  const busy = useCourier((s) => inDelivery(s.phase));
  const showToast = useCourier((s) => s.showToast);
  const live = useCourier((s) => s.source === 'live');
  const tickets = useCourier((s) => s.tickets);
  const seen = useCourier((s) => s.repliesSeen);
  // Live, each topic opens a conversation with ops; the offline demo only simulates it.
  const openThread = (subject: string) => {
    if (live) router.push({ pathname: '/ticket/[id]', params: { id: 'new', subject } });
    else showToast(`${subject} · opening chat`);
  };
  // Emergency numbers really dial (Morocco: ambulance 15, police 19), and live an urgent ticket
  // puts the safety alert in front of the Yallo team.
  const reportProblem = useCourier((s) => s.reportProblem);
  const sos = (n: string) => {
    haptic.alert();
    if (live) {
      reportProblem(
        'Accident / emergency',
        `Courier called ${n === '15' ? 'an ambulance (15)' : 'the police (19)'} from the app.`,
      );
      showToast('Calling emergency services · Safety team alerted');
    } else showToast('Calling emergency services');
    Linking.openURL(`tel:${n}`).catch(() => {});
  };
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  return (
    <Page title={t('Help & support')}>
      <View style={styles.sos}>
        <View style={[styles.row, { gap: 12 }]}>
          <Circle size={48} bg={colors.accent700}>
            <Icon name="shield" size={22} color={colors.accent100} />
          </Circle>
          <View style={{ flex: 1 }}>
            <Txt h size={22} lh={1.15} color={colors.accent100}>
              {t('Accident or emergency')}
            </Txt>
            <Txt size={14} color={colors.accent200}>
              {t("Get help now. We'll alert the Yallo safety team.")}
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            [t('Ambulance'), '15'],
            [t('Police'), '19'],
          ].map(([label, n]) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${n}`}
              onPress={() => sos(n)}
              style={({ pressed }) => [styles.sosBtn, pressed && { opacity: 0.85 }]}>
              <Txt h size={17} color={colors.accent900}>
                {label} {n}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
      {busy && (
        <PressCard
          onPress={() => {
            router.navigate('/delivery');
            router.push('/problem');
          }}
          style={[styles.row, styles.orderHelp]}>
          <Icon name="pkg" size={22} color={colors.mint900} />
          <View style={{ flex: 1 }}>
            <Txt size={16} weight={700} color={colors.mint900}>
              {t('Help with order')} {order.id}
            </Txt>
            <Txt size={13} color={colors.mint900}>
              {t(order.store)} → {t(order.cust)}
            </Txt>
          </View>
          <Icon name="chevR" size={18} color={colors.mint900} />
        </PressCard>
      )}
      {tickets.length > 0 && (
        <>
          <SectionLabel style={{ marginTop: 8, marginStart: 4 }}>
            {t('Your conversations')}
          </SectionLabel>
          <ListCard>
            {tickets.map((tk, i) => {
              const replies = tk.messages.filter((m) => m.from === 'ops').length;
              const unread = replies - (seen[tk.id] ?? 0);
              const last = tk.messages.at(-1);
              return (
                <ListRow
                  key={tk.id}
                  icon={tk.resolved ? 'check' : 'msg'}
                  label={t(tk.subject)}
                  sub={
                    last
                      ? `${last.from === 'ops' ? last.author : t('You')}: ${last.text}`
                      : undefined
                  }
                  value={unread > 0 ? t(`${unread} new`) : tk.resolved ? t('Resolved') : undefined}
                  valueColor={unread > 0 ? colors.accent700 : colors.mint700}
                  last={i === tickets.length - 1}
                  onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: tk.id } })}
                />
              );
            })}
          </ListCard>
        </>
      )}
      <SectionLabel style={{ marginTop: 8, marginStart: 4 }}>
        {t('What do you need help with?')}
      </SectionLabel>
      <ListCard>
        {SUPPORT_CATS.map(([icon, label], i) => (
          <ListRow
            key={label}
            icon={icon}
            label={t(label)}
            minHeight={56}
            last={i === SUPPORT_CATS.length - 1}
            onPress={() => openThread(label)}
          />
        ))}
      </ListCard>
      <SectionLabel style={{ marginTop: 8, marginStart: 4 }}>{t('Popular articles')}</SectionLabel>
      {FAQS.map(([q, a]) => {
        const open = openFaq === q;
        return (
          <PressCard
            key={q}
            onPress={() => setOpenFaq(open ? null : q)}
            accessibilityLabel={t(q)}
            style={[card, { paddingVertical: 14, paddingHorizontal: 18, gap: 8 }]}>
            <View style={[styles.row, { gap: 10 }]}>
              <Txt size={15} weight={600} style={{ flex: 1 }}>
                {t(q)}
              </Txt>
              <Icon name={open ? 'chevD' : 'chevR'} size={18} color={colors.neutral500} />
            </View>
            {open && (
              <Txt size={14} color={colors.neutral800}>
                {t(a)}
              </Txt>
            )}
          </PressCard>
        );
      })}
      <Btn
        icon="msg"
        iconSize={20}
        label={t('Contact support')}
        height={58}
        fontSize={18}
        style={{ marginTop: 6 }}
        onPress={() => openThread('Something else')}
      />
      <Txt size={13} color={colors.neutral700} style={{ textAlign: 'center' }}>
        {t('Average reply: 2 min · Français, العربية, English')}
      </Txt>
    </Page>
  );
}

const PERF = [
  {
    label: 'Acceptance rate',
    val: '92%',
    pct: 92,
    note: 'Last 7 days · keep above 85% for priority dispatch',
  },
  {
    label: 'Completion rate',
    val: '98%',
    pct: 98,
    note: '1 cancellation in the last 50 deliveries',
  },
  { label: 'Cancellation rate', val: '2%', pct: 2, note: 'Reported problems do not count' },
  { label: 'Average delivery time', val: '21 min', pct: 70, note: 'Marrakech average: 24 min' },
  { label: 'Online hours', val: '38h', pct: 76, note: 'This week' },
];

export function Performance() {
  const t = useT();
  return (
    <Page title={t('Performance')}>
      <View style={[styles.row, styles.rating]}>
        <Txt h size={56} lh={1.05} color={colors.mint100}>
          4.8
        </Txt>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel="5 stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="star" size={18} color={colors.accent300} />
            ))}
          </View>
          <Txt size={14} color={colors.mint200}>
            {t('Customer rating · last 100 deliveries')}
          </Txt>
        </View>
      </View>
      {PERF.map((pm) => (
        <View key={pm.label} style={[card, { paddingVertical: 16, paddingHorizontal: 18, gap: 8 }]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Txt size={15} weight={600}>
              {t(pm.label)}
            </Txt>
            <Txt h size={24}>
              {t(pm.val)}
            </Txt>
          </View>
          <Progress pct={pm.pct} height={8} track={colors.neutral300} fill={colors.mint500} />
          <Txt size={13} color={colors.neutral700}>
            {t(pm.note)}
          </Txt>
        </View>
      ))}
    </Page>
  );
}

export function Bonuses() {
  const t = useT();
  const challenge = useCourier((s) => s.challenge);
  const list = [
    {
      title: 'Weekend challenge',
      cond: 'Complete 15 deliveries between Fri and Sun',
      reward: '+100 DH',
      pct: (challenge / CHALLENGE_GOAL) * 100,
      progress: `${challenge} / 15 deliveries`,
      exp: 'Ends Sun 23:59',
      bg: colors.accent100,
      bar: colors.accent,
    },
    {
      title: 'Lunch rush · Guéliz',
      cond: '+5 DH per delivery, 12:00–14:30, Guéliz & Hivernage',
      reward: '+5 DH',
      pct: 40,
      progress: '4 deliveries today · +20 DH',
      exp: 'Daily',
      bg: colors.mint200,
      bar: colors.mint500,
    },
    {
      title: 'Late night boost',
      cond: '+8 DH per delivery, 22:00–01:00',
      reward: '+8 DH',
      pct: 0,
      progress: 'Starts at 22:00',
      exp: 'Until 31 Oct',
      bg: colors.surface,
      bar: colors.mint500,
    },
  ];
  return (
    <Page title={t('Bonuses & incentives')}>
      {list.map((bn) => (
        <View
          key={bn.title}
          style={{
            borderRadius: radius.lg,
            backgroundColor: bn.bg,
            paddingVertical: 18,
            paddingHorizontal: 20,
            gap: 10,
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 10,
            }}>
            <View style={{ flex: 1 }}>
              <Txt h size={22} lh={1.2}>
                {t(bn.title)}
              </Txt>
              <Txt size={14} color={colors.neutral800}>
                {t(bn.cond)}
              </Txt>
            </View>
            <Txt h size={22} color={colors.accent800}>
              {bn.reward}
            </Txt>
          </View>
          <Progress pct={bn.pct} height={10} track="rgba(32,30,29,0.1)" fill={bn.bar} />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Txt size={13} color={colors.neutral800}>
              {t(bn.progress)}
            </Txt>
            <Txt size={13} color={colors.neutral800}>
              {t(bn.exp)}
            </Txt>
          </View>
        </View>
      ))}
    </Page>
  );
}

export function HistoryDetail() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useCourier((s) => s.history);
  const hd = history.find((h) => historyKey(h.id) === id) ?? history[0];
  // Live jobs carry their real pay, tip and payment method; demo history keeps the design's split.
  const rows =
    hd.pay !== undefined
      ? [
          ['Delivery fee', `${hd.pay} DH`],
          ['Tip', `${hd.tip ?? 0} DH`],
          ['Payment', hd.payMethod === 'cash' ? 'Cash' : 'Paid online'],
        ]
      : [
          ['Delivery fee', hd.earn - 4 + ' DH'],
          ['Tip', '4 DH'],
          ['Payment', 'Paid online'],
        ];
  return (
    <Page title={t(`Order ${hd.id}`)}>
      <View style={[well, { paddingVertical: 18, paddingHorizontal: 20, gap: 14 }]}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={styles.deliveredTag}>
            <Txt size={11} weight={700} color={colors.mint700}>
              {t(hd.outcome === 'cancelled' ? 'Cancelled' : 'Delivered')}
            </Txt>
          </View>
          <Txt size={14} color={colors.neutral700}>
            {t(hd.date)}
          </Txt>
        </View>
        <View style={[styles.row, { gap: 10 }]}>
          <Dot size={12} color={colors.accent} />
          <View>
            <Txt size={15} weight={700}>
              {t(hd.store)}
            </Txt>
            <Txt size={13} color={colors.neutral700}>
              {t('Picked up')} {hd.pickT}
            </Txt>
          </View>
        </View>
        <View style={[styles.row, { gap: 10 }]}>
          <Dot size={12} color={colors.mint500} />
          <View>
            <Txt size={15} weight={700}>
              {t(hd.cust)} · {hd.area}
            </Txt>
            <Txt size={13} color={colors.neutral700}>
              {t('Delivered')} {hd.time}
            </Txt>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [t('Earned'), `${hd.earn} DH`],
          [t('Distance'), `${hd.km} ${t('km')}`],
          [t('Duration'), `${hd.dur} ${t('min')}`],
        ].map(([l, v]) => (
          <View key={l} style={[card, { flex: 1, borderRadius: 20, padding: 12 }]}>
            <Txt size={12} color={colors.neutral700}>
              {l}
            </Txt>
            <Txt h size={20}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
      <View style={[card, { paddingVertical: 8, paddingHorizontal: 20 }]}>
        {rows.map(([l, v]) => (
          <View key={l} style={[styles.row, styles.lineRow]}>
            <Txt size={15} style={{ flex: 1 }}>
              {t(l)}
            </Txt>
            <Txt size={15} weight={700}>
              {t(v)}
            </Txt>
          </View>
        ))}
      </View>
      <SectionLabel style={{ marginTop: 6, marginStart: 4 }}>{t('Order details')}</SectionLabel>
      <View style={[card, { paddingVertical: 8, paddingHorizontal: 20 }]}>
        {hd.items.map((it) => (
          <View key={it} style={[styles.lineRow, { paddingVertical: 10 }]}>
            <Txt size={15}>{it}</Txt>
          </View>
        ))}
      </View>
      <Btn
        variant="secondary"
        label={t('Report an issue with this order')}
        height={52}
        fontSize={16}
        onPress={() => router.push('/support')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  notif: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
  },
  sos: { borderRadius: radius.lg, backgroundColor: colors.accent800, padding: 20, gap: 12 },
  sosBtn: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.accent100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderHelp: {
    borderRadius: radius.lg,
    backgroundColor: colors.mint200,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  rating: { borderRadius: radius.lg, backgroundColor: colors.mint700, padding: 22, gap: 16 },
  deliveredTag: {
    backgroundColor: colors.mint100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lineRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
});
