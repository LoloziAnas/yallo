import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { HeaderBar } from '@/components/header-bar';
import { Icon } from '@/components/icon';
import { Photo } from '@/components/photo';
import { Screen, useBottomPad } from '@/components/screen';
import { SumRows } from '@/components/sum-rows';
import { Tag } from '@/components/tag';
import { Txt } from '@/components/txt';
import { productById, storeById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { fmt, storeIcon, sumRows } from '@/store/derive';
import { colors, radius } from '@/theme';

import { payLabel } from '../tracking/order-text';

/** A past order: items, totals, address and payment, with help and reorder actions. */
export function OrderDetail({ id }: { id: string }) {
  const t = useT();
  const bottom = useBottomPad();
  const orders = useApp((s) => s.orders);
  const addresses = useApp((s) => s.addresses);
  const reorder = useApp((s) => s.reorder);
  const order = orders.find((o) => o.id === id) ?? orders[0];
  if (!order) return <Screen>{null}</Screen>;
  const addr = addresses.find((a) => a.id === order.addrId) ?? addresses[0];

  return (
    <Screen>
      <HeaderBar title={t.orderDetails} subtitle={order.id} monoSubtitle />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Photo
            icon={storeIcon(order.storeId)}
            iconSize={28}
            style={{ width: 56, height: 56, borderRadius: radius.md }}
          />
          <View style={{ flex: 1 }}>
            <Txt heading size={24}>
              {storeById[order.storeId].name}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag label={t.s4} />
              <Txt size={13} color={colors.neutral700}>
                {order.date}
              </Txt>
            </View>
          </View>
        </View>

        <Txt label style={{ marginTop: 24, marginBottom: 8 }}>
          {t.summary}
        </Txt>
        <View
          style={{
            gap: 6,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}>
          {order.lines.map((l) => (
            <View
              key={l.key}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Txt style={{ flex: 1 }}>
                {l.qty}× {productById[l.pid].name}
              </Txt>
              <Txt>{fmt(l.unit * l.qty)}</Txt>
            </View>
          ))}
        </View>
        <View style={{ paddingTop: 10 }}>
          <SumRows rows={sumRows(order, t)} total={fmt(order.total)} />
        </View>

        <Txt label style={{ marginTop: 24, marginBottom: 8 }}>
          {t.address}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="pin" size={15} color={colors.accent} />
          <Txt size={14} style={{ flex: 1 }}>
            {addr.label} · {addr.street}, {addr.district}
          </Txt>
        </View>
        <Txt label style={{ marginTop: 20, marginBottom: 8 }}>
          {t.payment}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="cash" size={15} color={colors.accent} />
          <Txt size={14} style={{ flex: 1 }}>
            {payLabel(order.pay, t)}
          </Txt>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: bottom,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        }}>
        <Button
          variant="secondary"
          icon="help"
          label={t.getHelp}
          fontSize={16}
          onPress={() => router.push({ pathname: '/help', params: { orderId: order.id } })}
          style={{ flex: 1, height: 54 }}
        />
        <Button
          icon="rotate"
          label={t.reorder}
          fontSize={17}
          onPress={() => reorder(order)}
          style={{ flex: 1.4, height: 54 }}
        />
      </View>
    </Screen>
  );
}
