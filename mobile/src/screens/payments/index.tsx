import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { useT } from '@/store/app-store';
import { colors } from '@/theme';

/** Saved payment methods (sheet). */
export function Payments() {
  const t = useT();
  // Cash on delivery only for now; card payments come later.
  const methods: [IconName, string, string][] = [['cash', t.cash, t.cashSub]];

  return (
    <Sheet>
      <Txt heading size={27} style={{ marginBottom: 8 }}>
        {t.payments}
      </Txt>
      {methods.map(([icon, label, sub]) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 60,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}>
          <Icon name={icon} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt w={500}>{label}</Txt>
            <Txt size={12} color={colors.neutral700}>
              {sub}
            </Txt>
          </View>
        </View>
      ))}
    </Sheet>
  );
}
