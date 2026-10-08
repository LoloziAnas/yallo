import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, shadow } from '@/theme';

import type { PinKind } from './shared';

/** Map pins in the Zanqa style: the store a dark tile, the courier a paprika disc, home a paprika ring. */
export function PinView({ kind }: { kind: PinKind }) {
  if (kind === 'store') {
    return (
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.text,
          borderWidth: 2,
          borderColor: colors.white,
          boxShadow: shadow.md,
        }}>
        <Icon name="store" size={17} color={colors.white} />
      </View>
    );
  }
  if (kind === 'courier') {
    return (
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
          borderWidth: 3,
          borderColor: colors.white,
          boxShadow: shadow.accent,
        }}>
        <Icon name="bike" size={20} color={colors.white} />
      </View>
    );
  }
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent100,
        borderWidth: 2,
        borderColor: colors.accent,
        boxShadow: shadow.sm,
      }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent800 }} />
    </View>
  );
}
