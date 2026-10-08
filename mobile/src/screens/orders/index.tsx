// Reads the live catalogue, which changes in place: opt out of React Compiler memoisation.
'use no memo';

import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { cardRole } from '@/components/card-role';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Screen } from '@/components/screen';
import { Tag } from '@/components/tag';
import { Txt } from '@/components/txt';
import { type Order, storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { useLiveOrder } from '@/hooks/use-live-order';
import { fmt, itemsText, storeIcon } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';

import { arriveAtText, stepLabel } from '../tracking/order-text';
import { ProgressSegments } from '../tracking/progress-segments';
import { useCatalog } from '@/hooks/use-catalog';

/** Orders tab: the live order card plus previous orders with reorder and details. */
export function Orders() {
  useCatalog();
  const t = useT();
  const live = useLiveOrder();
  const active = live?.active;
  const orders = useApp((s) => s.orders);
  const reorder = useApp((s) => s.reorder);
  const step = live?.step ?? 0;
  const goTrack = () => router.push('/tracking');

  return (
    <Screen>
      <View
        style={{
          paddingTop: 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}>
        <Txt heading size={36}>
          {t.orders}
        </Txt>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {active && (
          <>
            <Txt label style={{ marginTop: 20, marginBottom: 10 }}>
              {t.current}
            </Txt>
            <Pressable
              onPress={goTrack}
              accessibilityRole={cardRole}
              style={({ pressed }) => ({
                padding: 14,
                gap: 10,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                boxShadow: shadow.sm,
                opacity: pressed ? 0.9 : 1,
              })}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                <Txt heading size={18}>
                  {storeById[active.storeId].name}
                </Txt>
                <Txt mono size={11} color={colors.neutral600}>
                  {active.id}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tag label={stepLabel(step, t)} tone={step < 0 ? 'neutral' : 'accent'} />
                {step >= 0 && step < 4 && (
                  <Txt size={13} color={colors.neutral700}>
                    {active.scheduledFor
                      ? `${t.arriveAround} ${active.scheduledFor}`
                      : arriveAtText(live?.eta ?? 1, t, live?.now)}
                  </Txt>
                )}
              </View>
              <ProgressSegments step={step} />
              <Button onPress={goTrack} accessibilityLabel={t.track} style={{ height: 46 }}>
                <Icon name="nav" size={15} color={colors.white} />
                <Txt w={600} size={16} lh={1.2} color={colors.white}>
                  {t.track}
                </Txt>
              </Button>
            </Pressable>
          </>
        )}

        <Txt label style={{ marginTop: 24, marginBottom: 2 }}>
          {t.previous}
        </Txt>
        {orders.length === 0 && (
          <View style={{ paddingVertical: 40 }}>
            <Txt heading size={24} center>
              {t.noOrders}
            </Txt>
            <Txt color={colors.neutral700} center>
              {t.noOrdersBody}
            </Txt>
          </View>
        )}
        {orders.map((o) => (
          <PastOrder key={o.id} order={o} onReorder={() => reorder(o)} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function PastOrder({ order, onReorder }: { order: Order; onReorder: () => void }) {
  const t = useT();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
      <Photo
        icon={storeIcon(order.storeId)}
        iconSize={28}
        style={{ width: 56, height: 56, borderRadius: radius.md }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Txt heading size={19} style={{ flexShrink: 1 }}>
            {storeById[order.storeId].name}
          </Txt>
          <Txt w={600}>{fmt(order.total)}</Txt>
        </View>
        <Txt size={12} color={colors.neutral700}>
          {order.date} · {t.s4}
        </Txt>
        <Txt size={13} color={colors.neutral800}>
          {itemsText(order.lines)}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <Button
            variant="secondary"
            icon="rotate"
            label={t.reorder}
            fontSize={14}
            onPress={onReorder}
            style={{ height: 38, paddingHorizontal: 14 }}
          />
          <Button
            variant="ghost"
            label={t.details}
            fontSize={14}
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
            style={{ height: 38 }}
          />
        </View>
      </View>
    </View>
  );
}
