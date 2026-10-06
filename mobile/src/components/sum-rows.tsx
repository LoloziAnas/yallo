import { View } from 'react-native';

import { Txt } from '@/components/txt';
import { useT } from '@/store/app-store';
import type { SumRow } from '@/store/derive';
import { colors } from '@/theme';

type Props = {
  rows: SumRow[];
  total: string;
  fontSize?: number;
  /** Hairline above the total (cart) vs. plain spacing (checkout, order details). */
  divided?: boolean;
};

/** Subtotal / fees / discount lines followed by the bold total. */
export function SumRows({ rows, total, fontSize = 14, divided }: Props) {
  const t = useT();
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt size={fontSize} color={colors.neutral700}>
            {r.label}
          </Txt>
          <Txt size={fontSize} w={500} color={r.positive ? colors.mint700 : colors.text}>
            {r.value}
          </Txt>
        </View>
      ))}
      <View
        style={[
          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
          divided
            ? { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, marginTop: 4 }
            : { marginTop: 6 },
        ]}>
        <Txt heading size={18}>
          {t.total}
        </Txt>
        <Txt heading size={23}>
          {total}
        </Txt>
      </View>
    </View>
  );
}
