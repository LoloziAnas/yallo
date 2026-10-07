import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { BackButton, Btn, RoundButton, Spacer } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen, useBottomPad } from '@/components/screen';
import { SectionLabel, Txt } from '@/components/txt';
import {
  Circle,
  CodeBoxes,
  Dot,
  Keypad,
  Progress,
  SegBar,
  Stat,
  card,
  haptic,
  well,
} from '@/components/ui';
import { CHALLENGE_GOAL, DEMO_PIN, ROUTES, along, fmt } from '@/data/demo';
import { mapsUrl, openUrl, smsUrl, telUrl } from '@/data/contact';
import { isWeakGps } from '@/device/tracking';
import { etaMin } from '@/data/order-view';
import { totals, useCourier, useT, useOrder } from '@/store/courier-store';
import { colors, radius, shadow } from '@/theme';
import { activeTag } from './shared';

/** The active order, full screen. Which view shows follows the order's phase. */
export function Delivery() {
  const phase = useCourier((s) => s.phase);
  switch (phase) {
    case 'toPickup':
    case 'toCustomer':
      return <MapView />;
    case 'atPickup':
      return <AtPickup />;
    case 'atCustomer':
      return <AtCustomer />;
    case 'confirm':
      return <Confirm />;
    case 'done':
      return <Done />;
    default:
      // The order just ended and this screen is being dismissed.
      return <Screen>{null}</Screen>;
  }
}

const minimise = () => router.back();
const openSupport = () => router.push('/support');
const openProblem = () => router.push('/problem');

/* ---------------- Map + navigation ---------------- */

// The map art is drawn in the design's 390×844 phone space, with y measured from under the status bar.
const MAP_W = 390;
const MAP_H = 844;
const MAP_Y0 = 44;
const MAP_LABEL = { fontSize: 10, fontWeight: '700', fontFamily: 'Figtree_700Bold' } as const;

function MapView() {
  const order = useOrder();
  const t = useT();
  const phase = useCourier((s) => s.phase);
  const nav = useCourier((s) => s.nav);
  const prog = useCourier((s) => s.prog);
  const weakGps = useCourier(isWeakGps);
  const set = useCourier((s) => s.set);
  const showToast = useCourier((s) => s.showToast);
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottom = useBottomPad(-2);

  const isPick = phase === 'toPickup';
  // The map art is the design's scene; distances come from the job (live: from the server position).
  const R = ROUTES[isPick ? 'toPickup' : 'toCustomer'];
  const live = order.legKm !== undefined;
  const legKm = live ? order.legKm! : R.km;
  const legMin = live ? etaMin(legKm) : R.min;
  const navKm = live ? legKm.toFixed(1) : (R.km * (1 - prog)).toFixed(1);
  const navMin = live ? legMin : Math.max(1, Math.ceil(R.min * (1 - prog)));
  const pos = along(R.pts, prog);
  const last = R.pts[R.pts.length - 1];
  const ii = Math.min(3, Math.floor(prog * 4));
  const turnDist = Math.max(20, Math.round(((1 - (prog * 4 - ii)) * 450) / 10) * 10);
  const tag = activeTag(phase);

  // Cover the screen like `preserveAspectRatio="xMidYMid slice"` and map design points to screen points.
  const sc = Math.max(W / MAP_W, H / MAP_H);
  const offX = (W - MAP_W * sc) / 2;
  const offY = (H - MAP_H * sc) / 2;
  const toScreen = (x: number, y: number) => ({ x: x * sc + offX, y: (y + MAP_Y0) * sc + offY });
  const pin = toScreen(last[0], last[1]);
  const me = toScreen(pos.x, pos.y);
  const pts = R.pts.map((p) => p.join(',')).join(' ');
  const done = pos.done.map((p) => p.join(',')).join(' ');

  const sheet = isPick
    ? {
        kicker: 'Pick up from',
        name: t(order.store),
        addr: order.storeAddr,
        thirdLabel: 'Order',
        third: order.id,
        note: order.storeNote && `${order.storeNote} Order will be ready in 6 min.`,
        callLabel: 'Call store',
        call: `Calling ${order.store}…`,
      }
    : {
        kicker: 'Deliver to',
        name: t(order.custFull),
        addr: order.dropAddr,
        thirdLabel: 'Collect',
        third: order.cash ? order.cash + ' DH' : t('Paid online'),
        note: order.note,
        callLabel: `Call ${order.cust}`,
        call: `Calling ${order.cust}…`,
      };
  // Real directions in the courier's navigation app, to the store or to the customer's GPS fix.
  const openExternal = (app: 'google' | 'waze') => () => {
    showToast('Opening route in your navigation app');
    openUrl(mapsUrl(isPick ? order.navTo.store : order.navTo.customer, app));
  };
  // Calls really dial when the customer app sent a number; the store and demo orders stay simulated.
  const callSheet = () => {
    showToast(sheet.call);
    if (!isPick && order.phone) openUrl(telUrl(order.phone));
  };

  return (
    <Screen edgeToEdge bg={colors.neutral200}>
      {/* Decorative map art: hidden from screen readers; the sheet below carries the information. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
        <Svg
          width={W}
          height={H}
          viewBox={`0 ${-MAP_Y0} ${MAP_W} ${MAP_H}`}
          preserveAspectRatio="xMidYMid slice">
          <Rect x={0} y={-44} width={390} height={844} fill="#ece2cf" />
          <Rect x={200} y={40} width={80} height={66} rx={22} fill={colors.mint300} />
          <Rect x={84} y={420} width={92} height={96} rx={30} fill={colors.mint200} />
          <Rect
            x={304}
            y={440}
            width={120}
            height={150}
            rx={36}
            fill={colors.accent200}
            opacity={0.6}
          />
          <G stroke="#f9f4ed" strokeLinecap="round" fill="none">
            <Path
              d="M-20 60H410M-20 130H410M-20 210H410M-20 330H410M-20 400H410M-20 520H410M-20 620H410M-20 720H410"
              strokeWidth={12}
            />
            <Path
              d="M70 -60V820M160 -60V820M190 -60V820M290 -60V820M360 -60V820"
              strokeWidth={12}
            />
            <Path d="M-30 610L420 20" strokeWidth={22} />
          </G>
          <SvgText x={238} y={78} textAnchor="middle" fill={colors.mint700} {...MAP_LABEL}>
            Jardin Majorelle
          </SvgText>
          <SvgText
            x={330}
            y={96}
            fill={colors.neutral600}
            transform="rotate(-52 330 96)"
            {...MAP_LABEL}>
            Av. Mohammed V
          </SvgText>
          <SvgText x={130} y={470} textAnchor="middle" fill={colors.mint700} {...MAP_LABEL}>
            Parc Harti
          </SvgText>
          <Polyline
            points={pts}
            fill="none"
            stroke="#fff"
            strokeWidth={14}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Polyline
            points={pts}
            fill="none"
            stroke={colors.accent}
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Polyline
            points={done}
            fill="none"
            stroke={colors.neutral400}
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Destination pin */}
      <View
        pointerEvents="none"
        style={[styles.pinWrap, { left: pin.x - 80, top: pin.y - 18 * sc - 76 }]}>
        <View style={styles.pinLabel}>
          <Txt size={12} weight={700} color={colors.neutral100} numberOfLines={1}>
            {t(isPick ? order.store : order.cust)}
          </Txt>
        </View>
        <Circle size={44} bg={R.pinBg} style={{ boxShadow: `0px 0px 0px 4px #fff, ${shadow.md}` }}>
          <Icon name={R.pin} size={20} color={colors.neutral100} />
        </Circle>
      </View>

      {/* Courier position */}
      <View pointerEvents="none" style={[styles.me, { left: me.x - 32, top: me.y - 32 }]}>
        <Circle size={36} bg={colors.neutral900} style={{ boxShadow: '0px 0px 0px 3px #fff' }}>
          <Icon name="nav" size={16} color={colors.neutral100} />
        </Circle>
      </View>

      {!nav ? (
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <RoundButton
            icon="chevD"
            bg={colors.bg}
            floating
            onPress={minimise}
            accessibilityLabel="Minimise"
          />
          <View style={styles.statusPill}>
            <Dot size={10} color={tag.dot} />
            <Txt size={15} weight={700} numberOfLines={1}>
              {t((isPick ? 'Going to pickup · ' : 'Going to customer · ') + order.id)}
            </Txt>
          </View>
          <RoundButton
            icon="help"
            bg={colors.bg}
            floating
            onPress={openSupport}
            accessibilityLabel={t('Help & support')}
          />
        </View>
      ) : (
        <View style={[styles.turn, { top: insets.top + 8 }]} accessibilityLiveRegion="polite">
          <Circle size={56} bg={colors.mint500}>
            <Icon name={R.instr[ii][0]} size={28} color={colors.white} />
          </Circle>
          <View style={{ flex: 1 }}>
            <Txt h size={30} lh={1.05} color={colors.mint100}>
              {turnDist} m
            </Txt>
            <Txt size={16} weight={600} color={colors.mint100} style={{ marginTop: 4 }}>
              {t(R.instr[ii][1])}
            </Txt>
          </View>
        </View>
      )}
      {weakGps && (
        <View style={[styles.gps, { top: insets.top + 112 }]}>
          <Icon name="locate" size={18} color={colors.accent900} />
          <Txt size={14} weight={600} color={colors.accent900} style={{ flex: 1 }}>
            {t('Weak GPS signal — your position may be off by 100 m')}
          </Txt>
        </View>
      )}

      <View style={[styles.sheet, { paddingBottom: bottom }]}>
        <View style={styles.grabber} />
        {!nav ? (
          <View style={{ gap: 14 }}>
            <View>
              <Txt
                size={11}
                weight={700}
                caps
                color={colors.accent700}
                style={{ letterSpacing: 1.1 }}>
                {t(sheet.kicker)}
              </Txt>
              <Txt title size={28} style={{ marginVertical: 2 }}>
                {sheet.name}
              </Txt>
              <Txt size={15} color={colors.neutral700}>
                {sheet.addr}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Stat label={t('Distance')} value={`${legKm} ${t('km')}`} />
              <Stat label={t('ETA')} value={`${legMin} ${t('min')}`} />
              <Stat label={t(sheet.thirdLabel)} value={sheet.third} />
            </View>
            {sheet.note !== '' && (
              <View style={styles.note}>
                <Icon name="msg" size={16} color={colors.accent900} />
                <Txt size={14} color={colors.accent900} style={{ flex: 1 }}>
                  {t(sheet.note)}
                </Txt>
              </View>
            )}
            <Btn
              icon="nav"
              iconSize={20}
              label={t('Start navigation')}
              onPress={() => {
                haptic.impact();
                set({ nav: true, prog: 0 });
                showToast('Navigation started');
              }}
              height={62}
              fontSize={19}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn
                variant="secondary"
                stacked
                icon="phone"
                iconSize={18}
                label={t(sheet.callLabel)}
                fontSize={14}
                height={52}
                style={{ flex: 1 }}
                onPress={callSheet}
              />
              <Btn
                variant="secondary"
                stacked
                icon="ext"
                iconSize={18}
                label="Google Maps"
                fontSize={14}
                height={52}
                style={{ flex: 1 }}
                onPress={openExternal('google')}
              />
              <Btn
                variant="secondary"
                stacked
                icon="alert"
                iconSize={18}
                label={t('Problem')}
                fontSize={14}
                height={52}
                style={{ flex: 1 }}
                onPress={openProblem}
              />
            </View>
            <Btn
              variant="ghost"
              label={t("I'm already here")}
              fontSize={14}
              height={36}
              style={{ alignSelf: 'center', marginVertical: -4 }}
              onPress={() =>
                set({ nav: false, prog: 0, phase: isPick ? 'atPickup' : 'atCustomer' })
              }
            />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Txt h size={40} lh={1.05}>
                {navMin} {t('min')}
              </Txt>
              <Txt size={16} color={colors.neutral700} style={{ flexShrink: 1 }}>
                {navKm} {t('km')} · {t('to')} {sheet.name}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn
                variant="secondary"
                icon="ext"
                iconSize={18}
                label={t('Open in Waze')}
                fontSize={16}
                height={56}
                style={{ flex: 1 }}
                onPress={openExternal('waze')}
              />
              <Btn
                variant="secondary"
                label={t('Stop')}
                fontSize={16}
                height={56}
                style={{ width: 100 }}
                onPress={() => set({ nav: false })}
              />
            </View>
            <View style={[styles.rowC, { gap: 8 }]}>
              <Icon name="shield" size={15} color={colors.neutral700} />
              <Txt size={13} color={colors.neutral700} style={{ flex: 1 }}>
                {t("Eyes on the road — we'll alert you when you arrive.")}
              </Txt>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

/* ---------------- Arrival screens ---------------- */

/** Coloured header that runs under the status bar on the pickup and drop-off screens. */
function ArrivalHeader({
  bg,
  btnBg,
  children,
}: {
  bg: string;
  btnBg: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.arrivalHeader, { backgroundColor: bg, paddingTop: top + 12 }]}>
      <View style={[styles.rowC, { justifyContent: 'space-between', marginBottom: 10 }]}>
        <RoundButton
          icon="chevD"
          size={48}
          bg={btnBg}
          onPress={minimise}
          accessibilityLabel="Minimise"
        />
        <RoundButton
          icon="help"
          size={48}
          bg={btnBg}
          onPress={openSupport}
          accessibilityLabel={t('Help & support')}
        />
      </View>
      {children}
    </View>
  );
}

function AtPickup() {
  const order = useOrder();
  const t = useT();
  const checked = useCourier((s) => s.checked);
  const set = useCourier((s) => s.set);
  const showToast = useCourier((s) => s.showToast);
  const pickUp = useCourier((s) => s.pickUp);
  // Live, the food must be ready (status 'picking') before it can leave the store.
  const preparing = useCourier((s) => s.jobStatus !== null && s.jobStatus !== 'picking');
  const bottom = useBottomPad();
  const count = order.items.filter((_, i) => checked[i]).length;
  return (
    <Screen edgeToEdge>
      <ArrivalHeader bg={colors.mint200} btnBg={colors.mint100}>
        <View style={[styles.rowC, styles.arrivedTag]}>
          <Icon name="check" size={13} color={colors.mint100} />
          <Txt size={13} weight={700} color={colors.mint100}>
            {t('Arrived at pickup')}
          </Txt>
        </View>
        <Txt
          title
          size={36}
          color={colors.mint900}
          accessibilityRole="header"
          style={{ marginTop: 6 }}>
          {t("You've arrived")}
        </Txt>
        <Txt size={16} color={colors.mint900}>
          {t(order.store)} · {order.storeAddr}
        </Txt>
      </ArrivalHeader>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 18, gap: 14 }}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            well,
            styles.rowC,
            { paddingVertical: 16, paddingHorizontal: 20, justifyContent: 'space-between' },
          ]}>
          <View>
            <Txt size={13} color={colors.neutral700}>
              {t('Show staff this order number')}
            </Txt>
            <Txt h size={48} lh={1.1}>
              {order.id}
            </Txt>
          </View>
          <Txt size={13} color={colors.neutral700} style={{ maxWidth: 130, textAlign: 'right' }}>
            {t(order.storeNote)}
          </Txt>
        </View>
        <View style={[styles.rowC, { justifyContent: 'space-between' }]}>
          <SectionLabel>{t('Check the bag')}</SectionLabel>
          <Txt size={13} color={colors.neutral700}>
            {count} / {order.items.length}
          </Txt>
        </View>
        <View style={[card, { overflow: 'hidden' }]}>
          {order.items.map((it, i) => {
            const c = !!checked[i];
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: c }}
                onPress={() => {
                  haptic.tap();
                  set((st) => ({ checked: { ...st.checked, [i]: !st.checked[i] } }));
                }}
                style={({ pressed }) => [
                  styles.itemRow,
                  i < order.items.length - 1 && styles.divider,
                  pressed && { backgroundColor: colors.neutral100 },
                ]}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: c ? colors.mint500 : colors.neutral400,
                      backgroundColor: c ? colors.mint500 : 'transparent',
                    },
                  ]}>
                  {c && <Icon name="check" size={14} color={colors.white} />}
                </View>
                <Txt size={15} weight={700} style={{ width: 26 }}>
                  {it.q}×
                </Txt>
                <Txt size={15} style={{ flex: 1 }}>
                  {it.n}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn
            variant="secondary"
            icon="phone"
            iconSize={18}
            label={t('Call restaurant')}
            height={52}
            style={{ flex: 1 }}
            onPress={() => showToast(`Calling ${order.store}…`)}
          />
          <Btn
            variant="secondary"
            icon="alert"
            iconSize={18}
            label={t('Report problem')}
            height={52}
            style={{ flex: 1 }}
            onPress={openProblem}
          />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom }}>
        {preparing && (
          <Txt
            size={14}
            weight={600}
            color={colors.neutral700}
            accessibilityLiveRegion="polite"
            style={{ textAlign: 'center', marginBottom: 10 }}>
            {t('The restaurant is still preparing this order.')}
          </Txt>
        )}
        <Btn
          disabled={preparing}
          icon="pkg"
          iconSize={20}
          label={t("I've picked up the order")}
          height={64}
          fontSize={19}
          onPress={() => {
            haptic.success();
            pickUp();
          }}
        />
      </View>
    </Screen>
  );
}

function AtCustomer() {
  const order = useOrder();
  const t = useT();
  const set = useCourier((s) => s.set);
  const showToast = useCourier((s) => s.showToast);
  const bottom = useBottomPad();
  const ink = colors.accent900;
  return (
    <Screen edgeToEdge>
      <ArrivalHeader bg={colors.accent200} btnBg={colors.accent100}>
        <Txt title size={36} color={ink} accessibilityRole="header">
          {t("You're almost there")}
        </Txt>
        <Txt h size={24} color={ink}>
          {t(order.custFull)}
        </Txt>
        <Txt size={16} color={ink}>
          {order.custAddr}
          {'\n'}
          {order.custArea}
        </Txt>
      </ArrivalHeader>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 18, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        {order.note !== '' && (
          <View style={[well, { paddingVertical: 18, paddingHorizontal: 20, gap: 4 }]}>
            <Txt size={13} weight={700} color={colors.neutral700}>
              {t('Delivery instructions')}
            </Txt>
            <Txt size={19} weight={600} lh={1.35}>
              “{t(order.note)}”
            </Txt>
          </View>
        )}
        <View style={[styles.rowC, styles.cod]}>
          <View style={{ flex: 1 }}>
            <Txt size={13} weight={700} color={colors.mint700}>
              {t(order.cash ? 'Cash on delivery' : 'Payment')}
            </Txt>
            <Txt size={15} color={colors.mint900}>
              {t(order.cash ? 'Collect from customer' : 'Paid online')}
            </Txt>
          </View>
          {order.cash > 0 && (
            <Txt h size={30} color={colors.mint900}>
              {order.cash} DH
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn
            variant="secondary"
            icon="phone"
            iconSize={20}
            label={t('Call')}
            fontSize={16}
            height={64}
            style={{ flex: 1 }}
            onPress={() => {
              showToast(`Calling ${order.cust}…`);
              if (order.phone) openUrl(telUrl(order.phone));
            }}
          />
          <Btn
            variant="secondary"
            icon="msg"
            iconSize={20}
            label={t('Message')}
            fontSize={16}
            height={64}
            style={{ flex: 1 }}
            onPress={() => {
              showToast("Message sent: “I'm outside”");
              if (order.phone) openUrl(smsUrl(order.phone, "I'm outside"));
            }}
          />
        </View>
        <Btn
          variant="ghost"
          icon="alert"
          iconSize={16}
          label={t('Report a problem')}
          height={44}
          style={{ alignSelf: 'center' }}
          onPress={openProblem}
        />
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: bottom }}>
        <Btn
          icon="pin"
          iconSize={20}
          label={t("I've arrived")}
          height={64}
          fontSize={19}
          onPress={() => {
            set({ phase: 'confirm' });
            showToast(`${order.cust} has been notified`);
          }}
        />
      </View>
    </Screen>
  );
}

/* ---------------- Proof of delivery ---------------- */

function Confirm() {
  const order = useOrder();
  const t = useT();
  const set = useCourier((s) => s.set);
  const complete = useCourier((s) => s.complete);
  const bottom = useBottomPad();
  const [method, setMethod] = useState<'pin' | 'photo'>('pin');
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(0);
  const [photo, setPhoto] = useState(false);
  const [cash, setCash] = useState(false);

  const pinBad = pinErr > 0 && pin.length === 0;
  // Card orders have nothing to collect.
  const ready = (cash || order.cash === 0) && (method === 'pin' ? pin.length === 4 : photo);
  const confirm = () => {
    if (method === 'pin' && pin !== DEMO_PIN) {
      haptic.error();
      setPin('');
      setPinErr((n) => n + 1);
      return;
    }
    haptic.success();
    complete();
  };

  return (
    <Screen>
      <View
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottom, gap: 14 }}>
        <View style={[styles.rowC, { gap: 12 }]}>
          <BackButton onPress={() => set({ phase: 'atCustomer' })} />
          <Txt title size={22} style={{ flex: 1 }} accessibilityRole="header">
            {t('Confirm delivery')}
          </Txt>
          <Txt size={14} color={colors.neutral700}>
            {order.id}
          </Txt>
        </View>
        <SegBar
          options={[
            { key: 'pin', label: t('PIN code'), icon: 'file' },
            { key: 'photo', label: t('Photo'), icon: 'camera' },
          ]}
          value={method}
          onChange={setMethod}
        />
        {method === 'pin' ? (
          <View style={{ gap: 12, alignItems: 'center' }}>
            <Txt size={17} weight={600}>
              {t(`Enter ${order.cust}'s 4-digit PIN`)}
            </Txt>
            <CodeBoxes value={pin} error={pinBad} width={64} height={72} fontSize={32} />
            <Txt
              size={14}
              weight={600}
              color={pinBad ? colors.accent700 : colors.neutral700}
              accessibilityLiveRegion="polite"
              style={{ minHeight: 20 }}>
              {t(
                pinBad
                  ? `PIN doesn't match — ${Math.max(0, 3 - pinErr)} attempts left`
                  : `Demo PIN: ${DEMO_PIN}`,
              )}
            </Txt>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.tap();
              setPhoto((p) => !p);
            }}
            style={[
              styles.photoBox,
              {
                borderColor: photo ? colors.mint500 : colors.neutral400,
                backgroundColor: photo ? colors.mint200 : colors.card,
              },
            ]}>
            <Icon
              name={photo ? 'check' : 'camera'}
              size={40}
              color={photo ? colors.mint900 : colors.neutral700}
            />
            <Txt size={17} weight={700} color={photo ? colors.mint900 : colors.neutral700}>
              {t(photo ? 'Photo captured' : 'Take a photo at the door')}
            </Txt>
            <Txt size={14} color={photo ? colors.mint900 : colors.neutral700}>
              {t(photo ? 'Tap to retake' : 'Show the bag and the door number')}
            </Txt>
          </Pressable>
        )}
        {order.cash > 0 && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cash }}
            onPress={() => {
              haptic.tap();
              setCash((c) => !c);
            }}
            style={[
              styles.rowC,
              styles.cashRow,
              { backgroundColor: cash ? colors.mint200 : colors.card },
            ]}>
            <View
              style={[
                styles.cashBox,
                {
                  borderColor: cash ? colors.mint500 : colors.neutral400,
                  backgroundColor: cash ? colors.mint500 : 'transparent',
                },
              ]}>
              {cash && <Icon name="check" size={16} color={colors.white} />}
            </View>
            <Txt size={15} weight={600} style={{ flex: 1 }}>
              {t(`I collected ${order.cash} DH in cash`)}
            </Txt>
          </Pressable>
        )}
        <Spacer />
        {method === 'pin' && (
          <Keypad
            keyHeight={52}
            fontSize={24}
            gap={6}
            onDigit={(d) => setPin((v) => (v.length < 4 ? v + d : v))}
            onDelete={() => setPin((v) => v.slice(0, -1))}
          />
        )}
        <Btn
          label={t('Confirm delivery')}
          disabled={!ready}
          onPress={confirm}
          height={62}
          fontSize={19}
          style={{ marginTop: 4 }}
        />
      </View>
    </Screen>
  );
}

function Done() {
  const order = useOrder();
  const t = useT();
  const challenge = useCourier((s) => s.challenge);
  const today = useCourier((s) => s.today);
  const set = useCourier((s) => s.set);
  const bottom = useBottomPad();
  const tot = totals(today);

  useEffect(() => {
    // Leaving by swipe-back also closes out the order.
    return () => {
      if (useCourier.getState().phase === 'done') set({ phase: null });
    };
  }, [set]);

  // Closing this screen finishes the order (see the cleanup above).
  const finish = (to: '/' | '/earnings') => router.dismissTo(to);

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 46, paddingBottom: bottom }}>
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <Circle size={104} bg={colors.mint500}>
            <Icon name="check" size={52} color={colors.white} />
          </Circle>
        </Animated.View>
        <Txt title size={38} accessibilityRole="header" style={{ marginTop: 26, marginBottom: 4 }}>
          {t('Delivery completed')}
        </Txt>
        <Txt size={17} color={colors.neutral700}>
          {order.id} · {t(order.store)} → {t(order.cust)}
        </Txt>
        <Txt size={16} weight={600} style={{ marginTop: 28 }}>
          {t('You earned')}
        </Txt>
        <Txt h size={80} lh={1.05} color={colors.accent700}>
          {order.earn} DH
        </Txt>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
          <Txt size={15} color={colors.neutral700}>
            {t('Delivery fee')} {order.fee} DH
          </Txt>
          <Txt size={15} color={colors.neutral700}>
            {t('Tip')} {order.tip} DH
          </Txt>
        </View>
        <View style={styles.challenge}>
          <View style={[styles.rowC, { justifyContent: 'space-between' }]}>
            <Txt size={15} weight={600}>
              {t('Weekend challenge')}
            </Txt>
            <Txt size={15} weight={600} color={colors.accent800}>
              {challenge} / 15
            </Txt>
          </View>
          <Progress
            pct={(challenge / CHALLENGE_GOAL) * 100}
            height={10}
            track={colors.accent200}
            fill={colors.accent}
          />
          <Txt size={13} color={colors.accent800}>
            {t(`${Math.max(0, CHALLENGE_GOAL - challenge)} more for +100 DH`)}
          </Txt>
        </View>
        <Txt size={15} color={colors.neutral700} style={{ marginTop: 12 }}>
          {t('Today')}:{' '}
          <Txt size={15} weight={700}>
            {fmt(tot.today)} DH
          </Txt>{' '}
          · {today.dels} {t('deliveries')}
        </Txt>
        <Spacer />
        <Btn label={t('Back to dashboard')} height={62} fontSize={19} onPress={() => finish('/')} />
        <Btn
          variant="ghost"
          label={t('See earnings')}
          height={48}
          fontSize={16}
          style={{ alignSelf: 'center', marginTop: 6 }}
          onPress={() => finish('/earnings')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  pinWrap: { position: 'absolute', width: 160, alignItems: 'center', gap: 4 },
  pinLabel: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.neutral900,
    boxShadow: shadow.md,
    maxWidth: 160,
  },
  me: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(122,138,94,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.bg,
    boxShadow: shadow.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  turn: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.mint700,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: shadow.lg,
  },
  gps: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 20,
    backgroundColor: colors.accent200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: shadow.sm,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.bg,
    boxShadow: '0px -8px 30px rgba(46,43,37,0.18)',
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 14,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.neutral400,
    alignSelf: 'center',
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 20,
    backgroundColor: colors.accent100,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  arrivalHeader: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 24,
    gap: 6,
  },
  arrivedTag: {
    alignSelf: 'flex-start',
    gap: 6,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.mint700,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    minHeight: 56,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cod: {
    borderRadius: radius.lg,
    backgroundColor: colors.mint200,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  photoBox: {
    height: 250,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cashRow: { gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.lg },
  cashBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challenge: {
    marginTop: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.accent100,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 8,
  },
});
