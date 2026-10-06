import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { useLiveOrder } from '@/hooks/use-live-order';
import { useApp, useT } from '@/store/app-store';
import { colors, radius } from '@/theme';

import { stepLabel } from '../tracking/order-text';

/** Chat with the rider (sheet): header, message bubbles and quick replies. */
export function Chat() {
  const t = useT();
  const chat = useApp((s) => s.chat);
  const live = useLiveOrder();
  const rider = live?.rider;
  const sendChat = useApp((s) => s.sendChat);

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
        <View>
          <Txt heading size={21} lh={1}>
            {rider?.short}
          </Txt>
          <Txt size={12} color={colors.neutral700}>
            {t.rider} · {stepLabel(live?.step ?? 0, t)}
          </Txt>
        </View>
      </View>

      <View style={{ gap: 8, minHeight: 160, paddingTop: 8, paddingBottom: 14 }}>
        {chat.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.me ? 'flex-end' : 'flex-start',
              maxWidth: '78%',
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: m.me ? colors.accent : colors.divider,
              backgroundColor: m.me ? colors.accent : colors.card,
            }}>
            <Txt size={14} color={m.me ? colors.white : colors.text}>
              {m.text}
            </Txt>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[t.q1, t.q2, t.q3].map((q) => (
          <Pressable
            key={q}
            onPress={() => sendChat(q)}
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
    </Sheet>
  );
}
