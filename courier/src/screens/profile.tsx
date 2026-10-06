import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { API_URL, api } from '@/api/client';
import { Btn } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen, Scroll } from '@/components/screen';
import { SectionLabel, Txt } from '@/components/txt';
import { Circle, ListCard, ListRow, PressCard, SegBar, card } from '@/components/ui';
import type { Lang } from '@/data/i18n';
import { useCourier, useT, type Simulate } from '@/store/courier-store';
import { colors } from '@/theme';

interface Row {
  icon: IconName;
  label: string;
  val?: string;
  valColor?: string;
  onPress: () => void;
}

const LANGS_LONG: [Lang, string][] = [
  ['FR', 'Français'],
  ['ع', 'العربية'],
  ['EN', 'English'],
];

export function Profile() {
  const t = useT();
  const lang = useCourier((s) => s.lang);
  const set = useCourier((s) => s.set);
  const showToast = useCourier((s) => s.showToast);
  const logout = useCourier((s) => s.logout);

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Account',
      rows: [
        {
          icon: 'user',
          label: 'Personal information',
          onPress: () => showToast('Personal information'),
        },
        {
          icon: 'moto',
          label: 'Vehicle',
          val: 'Yamaha Crypton · 12345-أ-40',
          onPress: () => showToast('Vehicle information'),
        },
        {
          icon: 'doc',
          label: 'Documents',
          val: 'Approved',
          valColor: colors.mint700,
          onPress: () => showToast('All documents valid'),
        },
        {
          icon: 'card',
          label: 'Payment information',
          val: 'CIH •••• 4417',
          onPress: () => showToast('Payment information'),
        },
      ],
    },
    {
      title: 'Work',
      rows: [
        {
          icon: 'gift',
          label: 'Bonuses & incentives',
          val: '3 active',
          valColor: colors.accent700,
          onPress: () => router.push('/bonuses'),
        },
        { icon: 'trend', label: 'Performance', onPress: () => router.push('/performance') },
        {
          icon: 'bell',
          label: 'Notifications',
          onPress: () => {
            set({ notifRead: true });
            router.push('/notifications');
          },
        },
      ],
    },
    {
      title: 'Help',
      rows: [
        { icon: 'help', label: 'Help & support', onPress: () => router.push('/support') },
        {
          icon: 'file',
          label: 'Terms & conditions',
          onPress: () => showToast('Terms & conditions'),
        },
      ],
    },
  ];

  return (
    <Screen>
      <Scroll>
        <View style={[styles.row, { gap: 16, paddingTop: 8 }]}>
          <Circle size={80} bg={colors.mint300}>
            <Txt h size={30} color={colors.mint900}>
              KE
            </Txt>
          </Circle>
          <View style={{ flex: 1 }}>
            <Txt title size={26}>
              Karim El Amrani
            </Txt>
            <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
              <Icon name="star" size={15} color={colors.accent} />
              <Txt size={14} weight={700}>
                4.8
              </Txt>
              <Txt size={14} color={colors.neutral700}>
                · {t('Motorcycle')} · Marrakech
              </Txt>
            </View>
            <Txt size={13} color={colors.neutral700}>
              +212 6 61 23 45 78 · karim.elamrani@gmail.com
            </Txt>
          </View>
        </View>

        <PressCard
          onPress={() => router.push('/performance')}
          style={[card, { paddingVertical: 18, paddingHorizontal: 20, gap: 12 }]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Txt size={16} weight={700}>
              {t('Performance')}
            </Txt>
            <View style={[styles.row, { gap: 2 }]}>
              <Txt size={14} weight={700} color={colors.accent700}>
                {t('Details')}
              </Txt>
              <Icon name="chevR" size={14} color={colors.accent700} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              ['4.8', 'Rating'],
              ['92%', 'Acceptance'],
              ['98%', 'Completion'],
            ].map(([v, l]) => (
              <View key={l} style={{ flex: 1 }}>
                <Txt h size={26}>
                  {v}
                </Txt>
                <Txt size={12} color={colors.neutral700}>
                  {t(l)}
                </Txt>
              </View>
            ))}
          </View>
        </PressCard>

        {groups.map((g) => (
          <View key={g.title} style={{ gap: 6 }}>
            <SectionLabel style={{ marginTop: 6, marginStart: 4 }}>{t(g.title)}</SectionLabel>
            <ListCard>
              {g.rows.map((r, i) => (
                <ListRow
                  key={r.label}
                  icon={r.icon}
                  label={t(r.label)}
                  value={r.val ? t(r.val) : undefined}
                  valueColor={r.valColor}
                  last={i === g.rows.length - 1}
                  onPress={r.onPress}
                />
              ))}
            </ListCard>
          </View>
        ))}

        <View style={{ gap: 6 }}>
          <SectionLabel style={{ marginTop: 6, marginStart: 4 }}>{t('Language')}</SectionLabel>
          <SegBar<Lang>
            options={LANGS_LONG.map(([key, label]) => ({ key, label }))}
            value={lang}
            onChange={(k) => set({ lang: k })}
          />
        </View>

        {__DEV__ && <DemoControls />}

        <Btn
          variant="secondary"
          icon="logout"
          iconSize={20}
          label={t('Log out')}
          color={colors.accent700}
          onPress={logout}
          height={56}
          fontSize={17}
          style={{ marginTop: 6 }}
        />
        <Txt size={12} color={colors.neutral600} style={{ textAlign: 'center' }}>
          Yallo Courier 2.4.0 · Marrakech
        </Txt>
      </Scroll>
    </Screen>
  );
}

const SIMULATIONS: [Simulate, string][] = [
  ['none', 'None'],
  ['no-internet', 'No internet'],
  ['poor-gps', 'Weak GPS'],
  ['location-denied', 'Location off'],
  ['no-demand', 'No demand'],
];

/** Development builds only: the design's "Tweaks" for demoing edge cases. */
function DemoControls() {
  const simulate = useCourier((s) => s.simulate);
  const requestSeconds = useCourier((s) => s.requestSeconds);
  const phase = useCourier((s) => s.phase);
  const set = useCourier((s) => s.set);
  const source = useCourier((s) => s.source);
  const connected = useCourier((s) => s.connected);
  const step = (d: number) =>
    set({ requestSeconds: Math.max(5, Math.min(30, requestSeconds + d)) });
  return (
    <View style={[card, { padding: 16, gap: 12 }]}>
      <SectionLabel>Demo controls</SectionLabel>
      <Txt size={13} color={colors.neutral700}>
        {source === 'live'
          ? `Live · ${API_URL} · ${connected ? 'connected' : 'reconnecting…'}`
          : API_URL
            ? `Offline demo · waiting for ${API_URL}`
            : 'Offline demo (no API configured)'}
      </Txt>
      <Txt size={13} color={colors.neutral700}>
        Simulate an edge case
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SIMULATIONS.map(([k, label]) => {
          const on = simulate === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => set({ simulate: k })}
              style={[
                styles.chip,
                on && { backgroundColor: colors.text, borderColor: colors.text },
              ]}>
              <Txt size={13} weight={600} color={on ? colors.bg : colors.text}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {/* Live offers expire on the server's clock (OFFER_SEC). */}
      {source === 'demo' && (
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Txt size={13} color={colors.neutral700}>
            Request timeout · {requestSeconds}s
          </Txt>
          <View style={[styles.row, { gap: 8 }]}>
            <Btn
              variant="secondary"
              label="−"
              onPress={() => step(-5)}
              height={36}
              style={{ width: 44 }}
              accessibilityLabel="Shorter timeout"
            />
            <Btn
              variant="secondary"
              label="+"
              onPress={() => step(5)}
              height={36}
              style={{ width: 44 }}
              accessibilityLabel="Longer timeout"
            />
          </View>
        </View>
      )}
      {source === 'demo' ? (
        <Btn
          variant="secondary"
          icon="bell"
          label="Send a test request"
          disabled={!!phase}
          onPress={() =>
            set({
              online: true,
              phase: 'request',
              count: requestSeconds,
              countTotal: requestSeconds,
            })
          }
        />
      ) : (
        <Btn
          variant="secondary"
          icon="trend"
          label="Reset server demo"
          onPress={() => {
            set({ phase: null, edge: null, nav: false, offerId: null, dropped: [], jobId: null });
            api?.reset().catch(() => {});
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.divider,
    justifyContent: 'center',
  },
});
