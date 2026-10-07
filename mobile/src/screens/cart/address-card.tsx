import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Txt } from '@/components/txt';
import { selectAddress, useApp, useT } from '@/store/app-store';
import { colors, radius, shadow } from '@/theme';

/** Tappable delivery-address card that opens the address sheet. */
export function AddressCard() {
  const t = useT();
  const addr = useApp(selectAddress);
  return (
    <Pressable
      onPress={() => router.push('/address')}
      accessibilityRole="button"
      accessibilityLabel={addr ? `${t.address}: ${addr.label}. ${t.change}` : t.setAddress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: radius.lg,
        backgroundColor: pressed ? colors.neutral100 : colors.card,
        boxShadow: shadow.sm,
      })}>
      <Icon name="pin" color={colors.accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={600}>{addr ? addr.label : t.setAddress}</Txt>
        {addr && (
          <Txt size={13} color={colors.neutral700}>
            {`${addr.street}, ${addr.district}, ${addr.city}`}
          </Txt>
        )}
      </View>
      <Txt size={14} w={500} color={colors.accent700}>
        {t.change}
      </Txt>
    </Pressable>
  );
}
