import { router } from 'expo-router';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { useLiveOrder, withName } from '@/hooks/use-live-order';
import { demoClock, fmt, stepTime } from '@/store/derive';
import { colors, photoPlaceholder, radius, shadow } from '@/theme';

import { arriveAtText, payLabel, statusLabels } from './order-text';
import { ProgressSegments } from './progress-segments';
import { TrackingMap } from './tracking-map';

const MAP_H = 320;

/** Live order tracking: map, ETA or rating, status timeline, rider card and order summary. */
export function Tracking() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const live = useLiveOrder();
  const rating = useApp((s) => s.rating);
  const chat = useApp((s) => s.chat);
  const set = useApp((s) => s.set);
  const showToast = useApp((s) => s.showToast);
  const finishOrder = useApp((s) => s.finishOrder);

  // The order can disappear (Done pressed) while this screen is still mounted.
  if (!live) return <Screen edges={[]}>{null}</Screen>;

  const { active, order, merchant, status, step, rider, courier, eta, now } = live;
  const store = storeById[active.storeId];
  const labels = statusLabels(t);
  const subs = [t.s0b, t.s1b, t.s2b, t.s3b, t.s4b];
  // When each step happened, from the API (the same times ops and the courier see).
  const times = [0, 1, 2, 3, 4].map((i) => stepTime(order?.statusAt, i));
  const count = active.lines.reduce((a, l) => a + l.qty, 0);
  const mapH = MAP_H + insets.top;

  const openChat = () => {
    if (!chat.length) set({ chat: [{ me: false, text: t.chatHi }] });
    router.push('/chat');
  };

  return (
    <Screen edges={[]}>
      <View>
        <TrackingMap
          width={width}
          height={mapH}
          topInset={insets.top + 56}
          status={status}
          store={merchant?.pos}
          dropoff={order?.dropoff}
          courier={courier?.pos}
        />
        <View
          style={{
            position: 'absolute',
            top: insets.top + 6,
            left: 12,
            right: 12,
            direction: 'ltr',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <IconButton
            name="chevL"
            look="float"
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: radius.pill,
              backgroundColor: colors.card,
              boxShadow: shadow.sm,
            }}>
            <Txt mono size={12} lh={1.3}>
              {active.id}
            </Txt>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom }}>
        {step >= 0 && step < 4 ? (
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}>
            {/* Scheduled orders show the chosen slot instead of a countdown. */}
            <Txt label>{active.scheduledFor ? t.eta : t.arriving}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Txt heading size={56} lh={1}>
                {active.scheduledFor ?? eta}
              </Txt>
              {!active.scheduledFor && (
                <Txt heading size={24}>
                  {t.min}
                </Txt>
              )}
              <Txt size={14} color={colors.neutral700} style={{ marginStart: 'auto' }}>
                {active.scheduledFor ? t.schedule : arriveAtText(eta, t, now)}
              </Txt>
            </View>
            <ProgressSegments step={step} style={{ marginTop: 10 }} />
          </View>
        ) : (
          <View
            style={{
              paddingVertical: 18,
              paddingHorizontal: 16,
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: step < 0 ? colors.neutral600 : colors.mint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name={step < 0 ? 'x' : 'check'} color={colors.white} />
              </View>
              <Txt heading size={30} style={{ flex: 1 }}>
                {step < 0 ? t.cancelledT : `${t.s4} · ${t.s4b}`}
              </Txt>
            </View>
            {step < 0 ? (
              <Txt color={colors.neutral700}>{t.cancelledB}</Txt>
            ) : (
              <Txt style={{ marginTop: 6 }}>{t.rate}</Txt>
            )}
            <View style={{ flexDirection: 'row', gap: 6, display: step < 0 ? 'none' : 'flex' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => set({ rating: n })}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${n}`}
                  accessibilityState={{ selected: n <= rating }}
                  style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="star" size={34} color={colors.saffron} filled={n <= rating} />
                </Pressable>
              ))}
            </View>
            <Button
              label={t.done}
              fontSize={17}
              onPress={finishOrder}
              style={{ height: 50, marginTop: 4 }}
            />
          </View>
        )}

        <View style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 4 }}>
          {labels.map((label, i) => (
            <View key={label} style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 16, alignItems: 'center' }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    marginTop: 4,
                    borderWidth: 1.5,
                    borderColor: i <= step ? colors.accent : colors.neutral400,
                    backgroundColor:
                      i < step || (i === step && step === 4) ? colors.accent : colors.card,
                  }}
                />
                {i < 4 && (
                  <View
                    style={{
                      flex: 1,
                      width: 1.5,
                      minHeight: 22,
                      backgroundColor: i < step ? colors.accent : colors.divider,
                    }}
                  />
                )}
              </View>
              <View
                style={{
                  flex: 1,
                  paddingBottom: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 8,
                }}>
                <View style={{ flex: 1 }}>
                  <Txt
                    w={i === step ? 600 : 400}
                    color={i <= step ? colors.text : colors.neutral600}>
                    {label}
                  </Txt>
                  {i === step && (
                    <Txt size={13} color={colors.neutral700}>
                      {withName(subs[i], rider?.first ?? '')}
                    </Txt>
                  )}
                </View>
                <Txt size={13} color={colors.neutral600}>
                  {i <= step && times[i] !== undefined ? demoClock(times[i]!) : ''}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        {/* Rider card: hidden for cancelled orders, whose message is shown above. */}
        <View
          style={{
            display: step < 0 ? 'none' : 'flex',
            marginTop: 6,
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 14,
            gap: 12,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            boxShadow: shadow.sm,
          }}>
          {rider && courier ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.neutral200,
                    experimental_backgroundImage: photoPlaceholder,
                  }}>
                  <Txt heading size={20} color={colors.accent800}>
                    {rider.initials}
                  </Txt>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={12} color={colors.neutral700}>
                    {t.rider}
                  </Txt>
                  <Txt heading size={20}>
                    {rider.short}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="star" size={13} color={colors.saffron} filled />
                    <Txt size={13} color={colors.neutral700}>
                      {courier.rating.toFixed(1)} · {courier.vehicle}
                    </Txt>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  variant="secondary"
                  onPress={() => showToast(withName(t.calling, rider.first))}
                  accessibilityLabel={t.call}
                  style={{ flex: 1, height: 48 }}>
                  <Icon name="phone" size={15} />
                  <Txt w={600} size={16} lh={1.2}>
                    {t.call}
                  </Txt>
                </Button>
                <Button
                  variant="secondary"
                  onPress={openChat}
                  accessibilityLabel={t.chat}
                  style={{ flex: 1, height: 48 }}>
                  <Icon name="msg" size={15} />
                  <Txt w={600} size={16} lh={1.2}>
                    {t.chat}
                  </Txt>
                </Button>
              </View>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="bike" color={colors.accent} />
              <Txt size={14} color={colors.neutral700} style={{ flex: 1 }}>
                {t.findingRider}
              </Txt>
            </View>
          )}
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 28,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
          }}>
          <Txt size={14} style={{ flex: 1 }}>
            <Txt size={14} w={600}>
              {store.name}
            </Txt>{' '}
            · {count} {t.items} · {payLabel(active.pay, t)}
          </Txt>
          <Txt size={14} w={600}>
            {fmt(active.total)}
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}
