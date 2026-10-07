import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Btn, RoundButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen, Scroll } from '@/components/screen';
import { SectionLabel, Txt } from '@/components/txt';
import { Circle, Dot, PressCard, Progress, StatusTag, card, well } from '@/components/ui';
import { CHALLENGE_GOAL, fmt } from '@/data/demo';
import { inDelivery, useCourier, useT, useOrder } from '@/store/courier-store';
import { colors, radius, shadow } from '@/theme';
import { goOnlineWithLocation } from '@/device/tracking';
import { activeTag, useEarningsSummary } from './shared';

function ActiveOrderCard() {
  const order = useOrder();
  const t = useT();
  const phase = useCourier((s) => s.phase);
  const tag = activeTag(phase);
  return (
    <View style={styles.activeCard}>
      <View style={styles.rowBetween}>
        <StatusTag tag={tag} label={t(tag.label)} />
        <Txt size={14} color={colors.neutral400}>
          {t('Order')} {order.id}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1, gap: 10 }}>
          {[
            [t(order.store), order.storeAddr, colors.accent400],
            [t(order.cust), order.custAddrShort, colors.mint300],
          ].map(([name, addr, dot]) => (
            <View key={addr} style={[styles.row, { gap: 10 }]}>
              <Dot size={12} color={dot} />
              <View style={{ flex: 1 }}>
                <Txt size={16} weight={700} color={colors.neutral100}>
                  {name}
                </Txt>
                <Txt size={13} color={colors.neutral400} numberOfLines={1}>
                  {addr}
                </Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt h size={34} lh={1} color={colors.accent300}>
            {order.earn} DH
          </Txt>
          <Txt size={13} color={colors.neutral400} style={{ marginTop: 4 }}>
            {order.km} {t('km')} · {order.min} {t('min')}
          </Txt>
        </View>
      </View>
      <Btn
        label={t('View delivery')}
        onPress={() => router.push('/delivery')}
        height={58}
        fontSize={18}
      />
    </View>
  );
}

/** One expanding ring of the "looking for deliveries" pulse. */
function Ring({ delay }: { delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1),
    );
  }, [v, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - v.value),
    transform: [{ scale: 0.6 + 2 * v.value }],
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

function PulseDot() {
  return (
    <View style={styles.pulse}>
      <Ring delay={0} />
      <Ring delay={900} />
      <View style={styles.pulseCore} />
    </View>
  );
}

export function Home() {
  const t = useT();
  const s = useCourier();
  const busy = inDelivery(s.phase);
  const sum = useEarningsSummary();
  const sim = s.simulate;
  return (
    <Screen>
      <Scroll>
        <View style={[styles.row, { gap: 12 }]}>
          <RoundButton
            bg={colors.mint300}
            accessibilityLabel={t('Profile')}
            onPress={() => router.navigate('/profile')}>
            <Txt h size={20} color={colors.mint900}>
              KE
            </Txt>
          </RoundButton>
          <View style={{ flex: 1 }}>
            <Txt size={18} weight={700} lh={1.25}>
              {t('Salam, Karim')}
            </Txt>
            <View style={[styles.row, { gap: 6 }]}>
              <Dot size={9} color={s.online ? colors.mint500 : colors.neutral500} />
              <Txt size={14} color={colors.neutral700}>
                {t(busy ? 'On a delivery' : s.online ? 'Online · Guéliz' : 'Offline')}
              </Txt>
            </View>
          </View>
          <RoundButton
            bg={colors.surface}
            icon="bell"
            accessibilityLabel={t('Notifications')}
            onPress={() => {
              s.set({ notifRead: true });
              router.push('/notifications');
            }}>
            {!s.notifRead && <View style={styles.unread} />}
          </RoundButton>
        </View>

        {busy && <ActiveOrderCard />}

        {!s.online ? (
          <View style={[well, { padding: 22, gap: 16 }]}>
            <View style={[styles.row, { gap: 14 }]}>
              <Circle size={56} bg={colors.neutral300}>
                <Icon name="power" size={24} color={colors.neutral700} />
              </Circle>
              <View style={{ flex: 1 }}>
                <Txt title size={24}>
                  {t("You're offline")}
                </Txt>
                <Txt size={15} color={colors.neutral700}>
                  {t('Go online to receive delivery requests')}
                </Txt>
              </View>
            </View>
            <Btn
              icon="power"
              iconSize={22}
              label={t('Go online')}
              onPress={goOnlineWithLocation}
              height={68}
              fontSize={21}
            />
          </View>
        ) : (
          <View style={styles.onlineCard}>
            <View style={[styles.row, { gap: 16 }]}>
              <PulseDot />
              <View style={{ flex: 1 }}>
                <Txt title size={24} color={colors.mint900}>
                  {t("You're online")}
                </Txt>
                <Txt size={15} color={colors.mint700}>
                  {t(
                    busy
                      ? 'New requests paused during delivery'
                      : sim === 'no-internet'
                        ? 'Waiting for connection…'
                        : 'Looking for deliveries…',
                  )}
                </Txt>
              </View>
            </View>
            {sim === 'no-demand' && (
              <View style={styles.noDemand}>
                <Txt size={14} color={colors.mint900}>
                  <Txt size={14} weight={700} color={colors.mint900}>
                    {t('No deliveries nearby right now.')}
                  </Txt>{' '}
                  {t('Orders pick up around 19:30. Busier zones: Hivernage, Jemaa el-Fna.')}
                </Txt>
              </View>
            )}
            <View style={styles.rowBetween}>
              <View style={[styles.row, { gap: 6, flexShrink: 1 }]}>
                <Icon name="pin" size={16} color={colors.mint900} />
                <Txt size={14} weight={600} color={colors.mint900}>
                  Guéliz, Marrakech
                </Txt>
              </View>
              <Btn
                variant="secondary"
                label={t('Go offline')}
                onPress={s.goOffline}
                color={colors.mint900}
                style={{ borderColor: colors.mint500 }}
              />
            </View>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <SectionLabel style={{ marginTop: 4 }}>{t('Today')}</SectionLabel>
          <PressCard onPress={() => router.navigate('/earnings')} style={[card, styles.earnCard]}>
            <View>
              <Txt size={14} color={colors.neutral700}>
                {t('Earnings')}
              </Txt>
              <Txt h size={40} lh={1.1}>
                {fmt(sum.total)}{' '}
                <Txt h size={22}>
                  DH
                </Txt>
              </Txt>
            </View>
            <Icon name="chevR" size={22} color={colors.neutral600} />
          </PressCard>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              [t('Deliveries'), String(sum.jobs)],
              ...(sum.live
                ? [
                    [t('Tips'), `${fmt(sum.tips)} DH`],
                    [t('Cash held'), `${fmt(sum.cashHeld)} DH`],
                  ]
                : [
                    [t('Online'), '6h 24m'],
                    [t('This week'), fmt(Math.round(sum.week))],
                  ]),
            ].map(([label, val]) => (
              <View key={label} style={[card, { flex: 1, padding: 14 }]}>
                <Txt size={13} color={colors.neutral700} numberOfLines={1}>
                  {label}
                </Txt>
                <Txt h size={24} numberOfLines={1} adjustsFontSizeToFit>
                  {val}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <PressCard onPress={() => router.push('/bonuses')} style={styles.challenge}>
          <View style={styles.rowBetween}>
            <Txt
              size={11}
              weight={700}
              caps
              color={colors.accent700}
              style={{ letterSpacing: 1.1 }}>
              {t('Weekend challenge')}
            </Txt>
            <Txt h size={18} color={colors.accent800}>
              +100 DH
            </Txt>
          </View>
          <Txt size={16} weight={600}>
            {t('Complete 15 deliveries by Sunday')}
          </Txt>
          <Progress
            pct={(s.challenge / CHALLENGE_GOAL) * 100}
            height={12}
            track={colors.accent200}
            fill={colors.accent}
          />
          <Txt size={13} color={colors.accent800}>
            {s.challenge} / 15 · {t('ends Sun 4 Oct, 23:59')}
          </Txt>
        </PressCard>
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
  unread: {
    position: 'absolute',
    top: 12,
    end: 13,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  activeCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.neutral900,
    padding: 20,
    gap: 14,
    boxShadow: shadow.md,
  },
  onlineCard: { borderRadius: radius.lg, backgroundColor: colors.mint200, padding: 22, gap: 14 },
  noDemand: {
    borderRadius: 20,
    backgroundColor: colors.mint100,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pulse: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mint500,
  },
  pulseCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.mint700,
    boxShadow: `0px 0px 0px 4px ${colors.mint100}`,
  },
  earnCard: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challenge: {
    borderRadius: radius.lg,
    backgroundColor: colors.accent100,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
});
