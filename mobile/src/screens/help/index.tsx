import type { Ticket } from '@yallo/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Sheet } from '@/components/sheet';
import { Tag } from '@/components/tag';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { type HelpTopic, helpTopics } from '@/data/help';
import { useApp, useT } from '@/store/app-store';
import { colors } from '@/theme';

/** The person's ticket about this order (or their latest general one), from the live feed. */
function findTicket(all: Ticket[] | undefined, mine: string[], orderId?: string) {
  const own = (all ?? []).filter((x) => mine.includes(x.id));
  const about = (x: Ticket) =>
    orderId
      ? x.orderId === orderId || !!x.messages[0]?.text.endsWith(`(Order ${orderId})`)
      : !x.orderId && !x.resolved;
  return own.reverse().find(about);
}

/**
 * Get help (sheet): pick a topic and describe the problem to open a support ticket, then follow the
 * conversation with Yallo support live, and reply.
 */
export function HelpSheet() {
  const t = useT();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const mine = useApp((s) => s.tickets);
  const allTickets = useApp((s) => s.live?.tickets);
  const openTicket = useApp((s) => s.openTicket);
  const replyTicket = useApp((s) => s.replyTicket);
  const showToast = useApp((s) => s.showToast);

  const [topic, setTopic] = useState<HelpTopic | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Set right after sending, until the live feed brings the ticket back.
  const [sent, setSent] = useState<string | null>(null);

  const ticket = findTicket(allTickets, mine, orderId);
  const token = useApp((s) => s.token);

  const send = async () => {
    setSending(true);
    const ok = ticket
      ? await replyTicket(ticket.id, text)
      : !!(await openTicket(topic!, text, orderId ?? null));
    setSending(false);
    if (!ok) return showToast(t.helpFailed);
    if (!ticket) setSent(text.trim());
    setText('');
  };

  const composer = (
    <View style={{ gap: 10, marginTop: 14 }}>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={ticket || sent ? t.replyPh : t.helpPh}
        multiline
        minHeight={ticket || sent ? 48 : 96}
        maxLength={1000}
      />
      <Button
        label={t.send}
        fontSize={16}
        disabled={sending || !text.trim() || (!ticket && !sent && !topic)}
        onPress={send}
        style={{ height: 50 }}
      />
    </View>
  );

  // Conversation view, once a ticket exists (or was just sent).
  if (ticket || sent) {
    const messages = ticket?.messages ?? [
      { from: 'requester' as const, author: '', text: sent!, at: '' },
    ];
    return (
      <Sheet scroll>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Txt heading size={27} style={{ flex: 1 }}>
            {t.support}
          </Txt>
          {ticket?.resolved && <Tag label={t.resolved} tone="mint" />}
        </View>
        <Txt size={13} color={colors.neutral700} style={{ marginBottom: 12 }}>
          {[ticket?.subject, ticket?.id, orderId].filter(Boolean).join(' · ')}
        </Txt>
        {!ticket && (
          <Txt size={13} color={colors.mint700} style={{ marginBottom: 8 }}>
            {t.helpSent}
          </Txt>
        )}
        <View style={{ gap: 8 }}>
          {messages.map((m, i) => {
            const me = m.from === 'requester';
            return (
              <View
                key={i}
                style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%', gap: 2 }}>
                <Txt
                  size={11}
                  color={colors.neutral600}
                  style={{ alignSelf: me ? 'flex-end' : 'flex-start' }}>
                  {[me ? t.you : m.author || t.support, m.at].filter(Boolean).join(' · ')}
                </Txt>
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
              </View>
            );
          })}
        </View>
        {ticket && composer}
      </Sheet>
    );
  }

  // Support tickets belong to an account: guests sign in first (the sheet stays open underneath).
  if (!token) {
    return (
      <Sheet>
        <Txt heading size={27} style={{ marginBottom: 8 }}>
          {t.helpT}
        </Txt>
        <Txt color={colors.neutral700} style={{ marginBottom: 16 }}>
          {t.phoneHint}
        </Txt>
        <Button
          label={t.signInCta}
          fontSize={16}
          onPress={() => router.push('/login')}
          style={{ height: 50 }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet scroll>
      <Txt heading size={27} style={{ marginBottom: 4 }}>
        {t.helpT}
      </Txt>
      {!!orderId && (
        <Txt mono size={12} color={colors.neutral600} style={{ marginBottom: 12 }}>
          {orderId}
        </Txt>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {helpTopics.map((tp) => (
          <Chip
            key={tp.id}
            label={t[tp.label]}
            on={topic === tp.id}
            onPress={() => setTopic(tp.id)}
          />
        ))}
      </View>
      {composer}
    </Sheet>
  );
}
