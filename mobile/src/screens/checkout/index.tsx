import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { HeaderBar } from '@/components/header-bar';
import { Icon, type IconName } from '@/components/icon';
import { RadioRow } from '@/components/radio-row';
import { Screen, useBottomPad } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { SumRows } from '@/components/sum-rows';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { type PayMethod, productById } from '@/data/catalog';
import { useApp, useT } from '@/store/app-store';
import { clock, demoClock, fmt, SCHEDULE_SLOTS, sumRows, totals } from '@/store/derive';
import { colors, radius, shadow } from '@/theme';

const slots = SCHEDULE_SLOTS;

export function CheckoutScreen() {
  const t = useT();
  const bottomPad = useBottomPad(16);
  const s = useApp();
  // Time the screen opened; the ETA is quoted from this moment.
  const [openedAt] = useState(() => Date.now());
  const tt = totals(s.cart, s.promo);
  const cs = tt.store;
  const addr = s.addresses.find((a) => a.id === s.addrId) ?? s.addresses[0];

  const etaBig = cs ? (s.when === 'now' ? `${cs.tMin}–${cs.tMax} min` : slots[s.slot]) : '';
  const arriveText = cs
    ? s.when === 'now'
      ? `${t.arriveAround} ${s.live ? demoClock(s.live.t + cs.tMax * 60) : clock(openedAt + cs.tMax * 60000)}`
      : `${t.schedule} · ${addr.district}`
    : '';
  const instrOptions = [t.q2, t.q1, 'Leave with the gardien', t.q3];
  // Cash on delivery only for now; card payments come later.
  const pays: { id: PayMethod; label: string; sub: string; icon: IconName }[] = [
    { id: 'cash', label: t.cash, sub: t.cashSub, icon: 'cash' },
  ];
  const toggleChip = (x: string) =>
    s.set({
      instrChips: s.instrChips.includes(x)
        ? s.instrChips.filter((y) => y !== x)
        : [...s.instrChips, x],
    });

  return (
    <Screen>
      <HeaderBar title={t.checkout} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={{
              paddingTop: 18,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}>
            <Txt label style={{ marginBottom: 4 }}>
              {t.eta}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="bike" size={28} color={colors.accent} />
              <Txt heading size={42} lh={1}>
                {etaBig}
              </Txt>
            </View>
            <Txt size={13} color={colors.neutral700} style={{ marginTop: 4, marginBottom: 12 }}>
              {arriveText}
            </Txt>
            <Segmented
              options={[
                { value: 'now', label: t.now },
                { value: 'sched', label: t.schedule },
              ]}
              value={s.when}
              onChange={(when) => s.set({ when })}
              padV={8}
              padH={16}
              fontSize={14}
            />
            {s.when === 'sched' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {slots.map((x, i) => (
                  <Chip
                    key={x}
                    label={x}
                    on={s.slot === i}
                    onPress={() => s.set({ slot: i })}
                    height={38}
                    fontSize={14}
                    style={{ paddingHorizontal: 14 }}
                  />
                ))}
              </View>
            )}
          </View>

          <Txt label style={{ marginTop: 22, marginBottom: 8 }}>
            {t.address}
          </Txt>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 14,
              borderRadius: radius.lg,
              backgroundColor: colors.card,
              boxShadow: shadow.sm,
            }}>
            <Icon name="pin" color={colors.accent} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt w={600}>{addr.label}</Txt>
              <Txt size={14}>{`${addr.street}, ${addr.district}, ${addr.city}`}</Txt>
              {!!addr.building && (
                <Txt size={13} color={colors.neutral700}>
                  {addr.building}
                </Txt>
              )}
              {!!addr.landmark && (
                <Txt size={13} color={colors.neutral700}>
                  {`${t.landmark}: ${addr.landmark}`}
                </Txt>
              )}
            </View>
            <Button
              variant="ghost"
              label={t.change}
              fontSize={14}
              onPress={() => router.push('/address')}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>

          <Txt label style={{ marginTop: 22, marginBottom: 8 }}>
            {t.instr}
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {instrOptions.map((x) => (
              <Chip key={x} label={x} on={s.instrChips.includes(x)} onPress={() => toggleChip(x)} />
            ))}
          </View>
          <TextField
            multiline
            value={s.instr}
            onChangeText={(instr) => s.set({ instr })}
            placeholder={t.instrPh}
            minHeight={72}
          />

          <Txt label style={{ marginTop: 22, marginBottom: 4 }}>
            {t.payment}
          </Txt>
          {pays.map((p) => (
            <RadioRow
              key={p.id}
              selected={s.pay === p.id}
              onPress={() => s.set({ pay: p.id })}
              style={{ minHeight: 60 }}>
              <Icon name={p.icon} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Txt w={500}>{p.label}</Txt>
                <Txt size={12} color={colors.neutral700}>
                  {p.sub}
                </Txt>
              </View>
            </RadioRow>
          ))}

          <Txt label style={{ marginTop: 22, marginBottom: 8 }}>
            {cs ? `${t.summary} · ${cs.name}` : t.summary}
          </Txt>
          <View
            style={{
              gap: 6,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}>
            {s.cart.lines.map((l) => (
              <View
                key={l.key}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Txt size={14} style={{ flex: 1 }}>
                  {`${l.qty}× ${productById[l.pid].name}`}
                </Txt>
                <Txt size={14}>{fmt(l.unit * l.qty)}</Txt>
              </View>
            ))}
          </View>
          <View style={{ paddingTop: 10 }}>
            <SumRows rows={sumRows(tt, t)} total={fmt(tt.total)} />
          </View>
        </ScrollView>

        <View
          style={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: bottomPad,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
          }}>
          <Button
            disabled={s.placing || !cs}
            label={s.placing ? t.placing : `${t.confirm} · ${fmt(tt.total)}`}
            fontSize={18}
            onPress={s.placeOrder}
            style={{ height: 56 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
