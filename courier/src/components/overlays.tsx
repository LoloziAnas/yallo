import { COURIER_PAY } from '@yallo/shared';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

import { Btn, Spacer } from '@/components/button';
import { openUrl, smsUrl, telUrl } from '@/data/contact';
import { requestForegroundLocation } from '@/device/tracking';
import { Icon, type IconName } from '@/components/icon';
import { useBottomPad, useDirection } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Circle, Dot, haptic, well } from '@/components/ui';
import { mmss } from '@/data/demo';
import { useCourier, useT, type EdgeKind, useOrder } from '@/store/courier-store';
import { colors, radius, shadow } from '@/theme';

/* ---------------- Incoming delivery request ---------------- */

const RING = 194.8; // circumference of the r=31 countdown ring

export function RequestOverlay() {
  const order = useOrder();
  const t = useT();
  const count = useCourier((s) => Math.max(0, s.count));
  const total = useCourier((s) => s.countTotal);
  const accept = useCourier((s) => s.accept);
  const decline = useCourier((s) => s.decline);
  const insets = useSafeAreaInsets();
  const bottom = useBottomPad();
  const direction = useDirection();
  const frac = count / total;
  // How the server priced the job (COURIER_PAY): base + distance, or the minimum fare; tip on top.
  const breakdown = (() => {
    if (order.payKm === undefined) return order.tip ? t(`+ ${order.tip} DH tip`) : null;
    const formula = COURIER_PAY.base + COURIER_PAY.perKm * order.payKm;
    const how =
      formula < COURIER_PAY.min
        ? t('Minimum fare')
        : t(`${COURIER_PAY.base} DH base + ${order.payKm} km × ${COURIER_PAY.perKm} DH`);
    return order.tip ? `${how} · ${t(`+ ${order.tip} DH tip`)}` : how;
  })();
  const muted = colors.neutral400;

  useEffect(() => {
    haptic.alert();
    // The courier must answer: hardware back does nothing while the request is up.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <Animated.View
      entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutDown.duration(220)}
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        styles.request,
        { direction, paddingTop: insets.top + 16, paddingBottom: bottom },
      ]}>
      <StatusBar style="light" />
      <View style={styles.rowBetween}>
        <View>
          <View style={styles.newPill}>
            <Icon name="bell" size={14} color={colors.neutral900} />
            <Txt size={14} weight={700} color={colors.neutral900}>
              {t('New delivery')}
            </Txt>
          </View>
          <Txt size={15} color={muted} style={{ marginTop: 8 }}>
            {t('Order')} {order.id} · {t(order.storeKind)}
          </Txt>
          {order.scheduledFor && (
            <Txt size={15} weight={700} color={colors.accent300} style={{ marginTop: 2 }}>
              {t(`Scheduled for ${order.scheduledFor}`)}
            </Txt>
          )}
        </View>
        <View
          style={{ width: 72, height: 72 }}
          accessibilityLabel={`${Math.ceil(count)} ${t('seconds')}`}>
          <Svg
            width={72}
            height={72}
            viewBox="0 0 72 72"
            style={{ transform: [{ rotate: '-90deg' }] }}>
            <SvgCircle
              cx={36}
              cy={36}
              r={31}
              fill="none"
              stroke={colors.neutral700}
              strokeWidth={6}
            />
            <SvgCircle
              cx={36}
              cy={36}
              r={31}
              fill="none"
              stroke={colors.accent400}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - frac)}
            />
          </Svg>
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Txt h size={26} color={colors.neutral100}>
              {Math.ceil(count)}
            </Txt>
          </View>
        </View>
      </View>

      <View>
        <Txt size={15} color={muted}>
          {t('Estimated earnings')}
        </Txt>
        <Txt h size={88} lh={1.05} color={colors.accent300}>
          {order.earn}{' '}
          <Txt h size={40} color={colors.accent300}>
            DH
          </Txt>
        </Txt>
        {breakdown && (
          <Txt size={14} color={muted} style={{ marginTop: 6 }}>
            {breakdown}
          </Txt>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [t('Distance'), `${order.km} ${t('km')}`],
          [t('Duration'), `${order.min} ${t('min')}`],
          [t('Cash'), order.cash ? `${order.cash} DH` : '—'],
        ].map(([l, v]) => (
          <View key={l} style={styles.darkTile}>
            <Txt size={12} color={muted}>
              {l}
            </Txt>
            <Txt h size={22} color={colors.neutral100}>
              {v}
            </Txt>
          </View>
        ))}
      </View>

      <View style={[styles.stops]}>
        <Stop
          dot={colors.accent400}
          label={`${t('Pickup')} · ${order.toStore} ${t('km')} ${t('away')}`}
          name={t(order.store)}
          addr={order.storeAddr}
        />
        <View style={styles.stopLine} />
        <Stop
          dot={colors.mint300}
          label={`${t('Drop-off')} · ${order.toCust} ${t('km')} ${t('from pickup')}`}
          name={`${t('Customer')} · ${order.dropZone}`}
          addr={order.dropLine}
        />
      </View>

      <Spacer />
      <Txt size={15} color={muted} style={{ textAlign: 'center' }}>
        {t('Accept within')}{' '}
        <Txt size={15} weight={700} color={colors.neutral100}>
          {Math.ceil(count)} {t('seconds')}
        </Txt>
      </Txt>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic.impact();
          accept();
          router.push('/delivery');
        }}
        style={({ pressed }) => [styles.accept, pressed && { backgroundColor: colors.accent400 }]}>
        <View style={[styles.acceptFill, { width: `${Math.round(frac * 100)}%` }]} />
        <Txt h size={26} color={colors.neutral900}>
          {t('Accept')}
        </Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={decline}
        style={({ pressed }) => [
          styles.decline,
          pressed && { backgroundColor: colors.neutral800 },
        ]}>
        <Txt h size={18} color={colors.neutral100}>
          {t('Decline')}
        </Txt>
      </Pressable>
    </Animated.View>
  );
}

function Stop({
  dot,
  label,
  name,
  addr,
}: {
  dot: string;
  label: string;
  name: string;
  addr: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Dot size={14} color={dot} style={{ marginTop: 4 }} />
      <View style={{ flex: 1 }}>
        <Txt size={12} weight={700} caps color={colors.neutral400} style={{ letterSpacing: 1 }}>
          {label}
        </Txt>
        <Txt size={19} weight={700} color={colors.neutral100}>
          {name}
        </Txt>
        <Txt size={14} color={colors.neutral400}>
          {addr}
        </Txt>
      </View>
    </View>
  );
}

/* ---------------- Edge cases (restaurant / customer / location problems) ---------------- */

interface EdgeDef {
  tone: 'warn' | 'calm';
  icon: IconName;
  title: string;
  body: string;
  timer?: { label: string; value: string };
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
}

/** Leave the delivery screen after an order ends early. */
function leaveDelivery() {
  if (router.canDismiss()) router.dismissTo('/');
}

export function EdgeOverlay({ kind }: { kind: EdgeKind }) {
  const order = useOrder();
  const t = useT();
  const edgeT = useCourier((s) => s.edgeT);
  const set = useCourier((s) => s.set);
  const showToast = useCourier((s) => s.showToast);
  const endOrder = useCourier((s) => s.endOrder);
  const opsComp = useCourier((s) => s.opsComp);
  const insets = useSafeAreaInsets();
  const bottom = useBottomPad();
  const direction = useDirection();

  const go = (edge: EdgeKind | null) => () => set({ edge, edgeT: 0 });
  // Live, the customer can only be reached with a number; otherwise support takes it from here.
  const demo = useCourier((s) => s.source === 'demo');
  const canReach = demo || !!order.phone;
  const toSupport = () => {
    set({ edge: null });
    if (demo) showToast('Connecting you to support…');
    else router.push('/support');
  };
  // The copy below is the design's, written for its order (#1284, Café Marrakech, Youssef, 35 DH)
  // so it matches the translation table; swap in the real job after translating.
  const personal = (text: string) =>
    text
      .replaceAll(t('Café Marrakech'), t(order.store))
      .replaceAll(t('Youssef'), t(order.cust))
      .replaceAll('#1284', order.id)
      .replace(/\b35\b/g, String(order.earn));
  const end = (pay: number, msg: string, reason: string) => () => {
    endOrder(pay, msg, reason);
    leaveDelivery();
  };
  const defs: Record<EdgeKind, EdgeDef> = {
    closed: {
      tone: 'warn',
      icon: 'store',
      title: 'Restaurant closed',
      body: `Order #1284 has been cancelled. You'll receive 10 DH for the trip — it won't affect your completion rate.`,
      primary: 'Back to dashboard',
      onPrimary: end(10, '+10 DH trip compensation added', 'Restaurant closed on arrival'),
    },
    slow: {
      tone: 'warn',
      icon: 'clock',
      title: 'Restaurant is taking longer',
      body: "We've let Café Marrakech know. After 10 minutes of waiting you'll get +5 DH waiting compensation.",
      timer: { label: 'You have been waiting', value: mmss(372 + edgeT) },
      primary: 'Keep waiting',
      onPrimary: go(null),
      secondary: 'Cancel without penalty',
      onSecondary: go('cancelled'),
    },
    unavail: {
      tone: 'warn',
      icon: 'user',
      title: 'Customer unavailable',
      body: "We're calling Youssef too. If there's no answer when the timer ends, you can mark the delivery as failed and still get paid.",
      timer: { label: 'Wait time remaining', value: mmss(300 - edgeT) },
      ...(canReach
        ? {
            primary: 'Call Youssef again',
            onPrimary: () => {
              showToast(`Calling ${order.cust}…`);
              if (order.phone) openUrl(telUrl(order.phone));
            },
          }
        : { primary: 'Chat with support', onPrimary: toSupport }),
      secondary: 'Mark as failed delivery',
      onSecondary: go('failed'),
    },
    failed: {
      tone: 'calm',
      icon: 'pkg',
      title: 'Delivery failed',
      body: "Return the order to Café Marrakech within 30 minutes. You'll still be paid 35 DH once the store confirms the return.",
      primary: 'Return to store',
      onPrimary: end(
        order.earn,
        `Return confirmed · ${order.earn} DH added`,
        'Delivery failed: customer unavailable',
      ),
    },
    address: {
      tone: 'warn',
      icon: 'pin',
      title: 'Checking the address',
      body: "Support is contacting Youssef to confirm his location. Stay where you are — we'll update the pin on your map.",
      ...(canReach
        ? {
            primary: 'Message Youssef',
            onPrimary: () => {
              set({ edge: null });
              showToast(`Message sent to ${order.cust}`);
              if (order.phone) openUrl(smsUrl(order.phone, "I'm at your address"));
            },
          }
        : { primary: 'Chat with support', onPrimary: toSupport }),
      secondary: 'Back to delivery',
      onSecondary: go(null),
    },
    payment: {
      tone: 'warn',
      icon: 'wallet',
      title: "Customer can't pay",
      body: `Don't hand over the order. Support can take a card payment over the phone, or you can return the order and still be paid 35 DH.`,
      primary: 'Call support',
      onPrimary: toSupport,
      secondary: 'Mark as failed delivery',
      onSecondary: go('failed'),
    },
    cancelled: {
      tone: 'calm',
      icon: 'x',
      title: 'Delivery cancelled',
      body: `Yallo support took order #1284 back; it will go to another courier. You don't need to do anything.`,
      primary: 'Back to dashboard',
      onPrimary: end(0, 'Order cancelled', 'Cancelled by courier'),
    },
    opsCancelled: {
      tone: 'calm',
      icon: 'x',
      title: 'Delivery cancelled',
      body: opsComp
        ? `Order #1284 was cancelled by Yallo support. You'll receive ${opsComp} DH for the trip.`
        : 'Order #1284 was cancelled by Yallo support.',
      primary: 'Back to dashboard',
      onPrimary: end(
        opsComp,
        opsComp ? `+${opsComp} DH trip compensation added` : 'Order cancelled',
        'Cancelled by ops',
      ),
    },
    location: {
      tone: 'warn',
      icon: 'locate',
      title: 'Location is off',
      body: 'Yallo needs your location to send nearby deliveries and guide you. We only track it while you are online.',
      primary: 'Allow location access',
      onPrimary: () => {
        set({ edge: null });
        // Re-asks for permission (or opens Settings if it was denied for good).
        requestForegroundLocation().then((ok) => {
          if (ok) useCourier.getState().goOnline(true);
          else set({ edge: 'location', edgeT: 0 });
        });
      },
      secondary: 'Not now',
      onSecondary: go(null),
    },
  };
  const e = defs[kind];
  const warn = e.tone === 'warn';

  useEffect(() => {
    // Hardware back takes the safe way out when there is one, otherwise stays put.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (kind === 'slow' || kind === 'address' || kind === 'location') set({ edge: null });
      return true;
    });
    return () => sub.remove();
  }, [kind, set]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      accessibilityViewIsModal
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.bg,
          direction,
          paddingHorizontal: 24,
          paddingTop: insets.top + 26,
          paddingBottom: bottom,
        },
      ]}>
      <StatusBar style="dark" />
      <Circle size={96} bg={warn ? colors.accent200 : colors.mint200}>
        <Icon name={e.icon} size={42} color={warn ? colors.accent800 : colors.mint700} />
      </Circle>
      <Txt title size={34} accessibilityRole="header" style={{ marginTop: 28, marginBottom: 10 }}>
        {personal(t(e.title))}
      </Txt>
      <Txt size={17} color={colors.neutral800}>
        {personal(t(e.body))}
      </Txt>
      {e.timer && (
        <View style={[well, { marginTop: 24, paddingVertical: 18, paddingHorizontal: 20 }]}>
          <Txt size={14} color={colors.neutral700}>
            {t(e.timer.label)}
          </Txt>
          <Txt h size={48} lh={1.15} style={{ fontVariant: ['tabular-nums'] }}>
            {e.timer.value}
          </Txt>
        </View>
      )}
      <Spacer />
      <Btn label={personal(t(e.primary))} onPress={e.onPrimary} height={62} fontSize={19} />
      {e.secondary && (
        <Btn
          variant="secondary"
          label={personal(t(e.secondary))}
          onPress={e.onSecondary}
          height={56}
          fontSize={17}
          style={{ marginTop: 10 }}
        />
      )}
    </Animated.View>
  );
}

/* ---------------- Banners, toast, splash ---------------- */

/** `waking`: the app hasn't reached the API yet since launch (a sleeping free host takes ~1 min). */
export function NoNetBanner({ waking = false }: { waking?: boolean }) {
  const t = useT();
  const { top } = useSafeAreaInsets();
  const direction = useDirection();
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { top: top + 4, direction }]}>
      <Icon name="wifiOff" size={18} color={colors.accent300} />
      <Txt size={14} weight={600} color={colors.neutral100} style={{ flex: 1 }}>
        {t(waking ? 'Connecting to Yallo…' : 'No internet · Reconnecting…')}
      </Txt>
      <Txt size={12} color={colors.neutral400}>
        {t(waking ? 'Server waking up' : 'Actions will sync')}
      </Txt>
    </Animated.View>
  );
}

export function Toast() {
  const t = useT();
  const toast = useCourier((s) => s.toast);
  const { bottom } = useSafeAreaInsets();
  const direction = useDirection();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: bottom + 92, direction }]}>
      <Animated.View
        key={toast.until}
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        accessibilityLiveRegion="polite"
        style={styles.toast}>
        <Icon name="check" size={16} color={colors.mint300} />
        <Txt size={15} weight={600} color={colors.neutral100}>
          {t(toast.text)}
        </Txt>
      </Animated.View>
    </View>
  );
}

function Spinner() {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1);
  }, [rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return <Animated.View style={[styles.spinner, style]} />;
}

/** Brand splash shown for a moment after the native splash, as in the design. */
export function SplashOverlay() {
  return (
    <Animated.View exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, styles.splash]}>
      <StatusBar style="light" />
      <Txt h size={52} lh={1.1} color={colors.white} style={{ letterSpacing: 3 }}>
        YALLO
      </Txt>
      <Txt
        size={13}
        weight={600}
        color={colors.accent100}
        style={{ letterSpacing: 2.6, textTransform: 'uppercase' }}>
        Courier
      </Txt>
      <View style={{ marginTop: 40 }}>
        <Spinner />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  request: {
    backgroundColor: colors.neutral900,
    paddingHorizontal: 22,
    gap: 18,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  newPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  darkTile: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral800,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stops: { borderRadius: radius.lg, backgroundColor: colors.neutral800, padding: 18, gap: 6 },
  stopLine: { width: 2, height: 18, backgroundColor: colors.neutral600, marginStart: 6 },
  accept: {
    height: 76,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  acceptFill: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  decline: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.neutral600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 20,
    backgroundColor: colors.neutral900,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: shadow.md,
  },
  toastWrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  toast: {
    borderRadius: 999,
    backgroundColor: colors.neutral900,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: shadow.lg,
  },
  splash: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(245,234,216,0.35)',
    borderTopColor: colors.bg,
  },
});
