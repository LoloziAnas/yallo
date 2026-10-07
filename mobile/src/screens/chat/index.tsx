import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { useLiveOrder, withName } from '@/hooks/use-live-order';
import { useApp, useT } from '@/store/app-store';
import { colors } from '@/theme';
import { dial } from '@/utils/dial';

import { stepLabel } from '../tracking/order-text';

/**
 * Chat with the rider (sheet). In-app chat isn't available yet, so this says so honestly and offers
 * a call instead of showing invented messages.
 */
export function Chat() {
  const t = useT();
  const showToast = useApp((s) => s.showToast);
  const live = useLiveOrder();
  const rider = live?.rider;
  const courier = live?.courier;

  return (
    <Sheet>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          marginBottom: 14,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.divider,
        }}>
        <Icon name="msg" color={colors.neutral600} />
        <Txt size={14} color={colors.neutral700} style={{ flex: 1 }}>
          {withName(t.chatSoon, rider?.first ?? '')}
        </Txt>
      </View>

      {rider && courier && (
        <Button
          icon="phone"
          label={t.call}
          fontSize={16}
          onPress={() => {
            showToast(withName(t.calling, rider.first));
            dial(courier.phone);
          }}
          style={{ height: 50 }}
        />
      )}
    </Sheet>
  );
}
