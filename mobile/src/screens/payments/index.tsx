import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { colors } from '@/theme';

/** Saved payment methods (sheet). */
export function Payments() {
  const t = useT();
  const showToast = useApp((s) => s.showToast);
  const methods: [IconName, string, string][] = [
    ['cash', t.cash, t.cashSub],
    ['card', 'Visa •••• 4821', t.cardSub],
  ];

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
      <Button
        variant="ghost"
        icon="plus"
        label={t.addCard}
        onPress={() => showToast(t.soon)}
        style={{ alignSelf: 'flex-start', marginTop: 10, height: 44 }}
      />
    </Sheet>
  );
}
