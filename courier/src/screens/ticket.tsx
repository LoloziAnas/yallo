import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen, useBottomPad } from '@/components/screen';
import { Txt } from '@/components/txt';
import { haptic } from '@/components/ui';
import { useCourier, useT } from '@/store/courier-store';
import { colors, fontFamily, radius } from '@/theme';

/**
 * A support conversation with Yallo ops. `id` is a ticket id, or `new` with a `subject` for a
 * conversation that starts with the courier's first message.
 */
export function Ticket() {
  const t = useT();
  const params = useLocalSearchParams<{ id: string; subject?: string }>();
  const [ticketId, setTicketId] = useState<string | null>(params.id === 'new' ? null : params.id);
  const ticket = useCourier((s) => s.tickets.find((tk) => tk.id === ticketId));
  const sendSupport = useCourier((s) => s.sendSupport);
  const set = useCourier((s) => s.set);
  const arabic = useCourier((s) => s.lang === 'ع');
  const bottom = useBottomPad(8);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const subject = ticket?.subject ?? params.subject ?? 'Help & support';
  const messages = ticket?.messages ?? [];
  const opsCount = messages.filter((m) => m.from === 'ops').length;

  // Reading the thread marks ops' replies as seen.
  useEffect(() => {
    if (ticketId) set((s) => ({ repliesSeen: { ...s.repliesSeen, [ticketId]: opsCount } }));
  }, [ticketId, opsCount, set]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const id = await sendSupport(ticketId, subject, text);
    setSending(false);
    if (!id) return;
    haptic.tap();
    setDraft('');
    setTicketId(id);
  };

  return (
    <Screen keyboard>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Txt title size={20} numberOfLines={1} accessibilityRole="header">
            {t(subject)}
          </Txt>
          <Txt size={13} color={colors.neutral700}>
            {ticket?.orderId ? `${t('Order')} ${ticket.orderId} · ` : ''}
            {t(ticket?.resolved ? 'Resolved' : 'Yallo support')}
          </Txt>
        </View>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled">
        {messages.length === 0 && (
          <Txt size={15} color={colors.neutral700} style={{ textAlign: 'center', marginTop: 24 }}>
            {t('Tell us what happened. Average reply: 2 min.')}
          </Txt>
        )}
        {messages.map((m, i) => {
          const mine = m.from === 'requester';
          return (
            <View key={i} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Txt size={12} weight={700} color={mine ? colors.accent800 : colors.mint700}>
                {mine ? t('You') : `${m.author} · ${t('Yallo support')}`} · {m.at}
              </Txt>
              <Txt size={15}>{m.text}</Txt>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: bottom }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('Write a message')}
          placeholderTextColor={colors.neutral500}
          accessibilityLabel={t('Write a message')}
          multiline
          style={[styles.input, { fontFamily: fontFamily('body', 400, arabic) }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Send')}
          accessibilityState={{ disabled: !draft.trim() || sending }}
          disabled={!draft.trim() || sending}
          onPress={send}
          style={({ pressed }) => [
            styles.send,
            (!draft.trim() || sending) && { opacity: 0.45 },
            pressed && { backgroundColor: colors.accent800 },
          ]}>
          <Icon name="nav" size={20} color={colors.white} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent100 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    boxShadow: '0px 1px 2px rgba(75,40,20,0.06)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
