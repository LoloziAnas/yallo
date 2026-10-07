import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { api } from '@/api/client';
import { IconButton } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useLiveOrder, withName } from '@/hooks/use-live-order';
import { useApp, useT } from '@/store/app-store';
import { colors, radius } from '@/theme';
import { dial } from '@/utils/dial';

import { stepLabel } from '../tracking/order-text';

/**
 * Chat about the current order (sheet). The thread is the order's `chat` in the live feed, so the
 * rider's and support's replies appear as they arrive; quick replies and the composer send through the API.
 */
export function Chat() {
  const t = useT();
  const showToast = useApp((s) => s.showToast);
  const live = useLiveOrder();
  const rider = live?.rider;
  const courier = live?.courier;
  const messages = live?.order?.chat ?? [];
  // Open while the order is under way; the API closes it once delivered or cancelled.
  const open = !!live && !live.active.lost && live.step >= 0 && live.step < 4;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (msg: string) => {
    if (!live || !msg.trim() || sending) return;
    setSending(true);
    try {
      await api.sendOrderMessage(live.active.id, msg.trim());
      setText('');
    } catch (e) {
      showToast(e instanceof Error && /closed/i.test(e.message) ? t.chatClosed : t.chatFailed);
    }
    setSending(false);
  };

  return (
    <Sheet scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent100,
          }}>
          <Txt heading color={colors.accent800}>
            {rider?.initials}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt heading size={21} lh={1}>
            {rider?.short ?? t.rider}
          </Txt>
          <Txt size={12} color={colors.neutral700}>
            {t.rider} · {stepLabel(live?.step ?? 0, t)}
          </Txt>
        </View>
        {rider && courier && open && (
          <IconButton
            name="phone"
            look="float"
            accessibilityLabel={t.call}
            onPress={() => {
              showToast(withName(t.calling, rider.first));
              dial(courier.phone);
            }}
          />
        )}
      </View>

      <View style={{ gap: 8, minHeight: 160, paddingTop: 8, paddingBottom: 14 }}>
        {messages.length === 0 && (
          <Txt size={14} color={colors.neutral600} center style={{ marginTop: 40 }}>
            {open ? t.chatEmpty : t.chatClosed}
          </Txt>
        )}
        {messages.map((m, i) => {
          const me = m.from === 'customer';
          return (
            <View
              key={i}
              style={{
                alignSelf: me ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                gap: 2,
              }}>
              {!me && (
                <Txt size={11} color={colors.neutral600} style={{ marginStart: 6 }}>
                  {m.author}
                </Txt>
              )}
              <View
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: me ? colors.accent : colors.divider,
                  backgroundColor: me ? colors.accent : colors.card,
                }}>
                <Txt size={14} color={me ? colors.white : colors.text}>
                  {m.text}
                </Txt>
              </View>
              <Txt
                size={10}
                color={colors.neutral500}
                style={{ alignSelf: me ? 'flex-end' : 'flex-start', marginHorizontal: 6 }}>
                {m.at}
              </Txt>
            </View>
          );
        })}
        {!open && messages.length > 0 && (
          <Txt size={12} color={colors.neutral600} center>
            {t.chatClosed}
          </Txt>
        )}
      </View>

      {open && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {[t.q1, t.q2, t.q3].map((q) => (
              <Pressable
                key={q}
                onPress={() => send(q)}
                disabled={sending}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  minHeight: 38,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  backgroundColor: pressed ? colors.accent100 : 'transparent',
                })}>
                <Txt w={500} size={13} lh={1.3} color={colors.accent700}>
                  {q}
                </Txt>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextField
              value={text}
              onChangeText={setText}
              placeholder={withName(t.msgPh, rider?.first ?? t.rider)}
              accessibilityLabel={withName(t.msgPh, rider?.first ?? t.rider)}
              maxLength={500}
              multiline
              minHeight={48}
              style={{ flex: 1 }}
            />
            <IconButton
              name="send"
              look="float"
              accessibilityLabel={t.send}
              onPress={() => send(text)}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}
