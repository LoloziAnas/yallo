// Reads the live catalogue, which changes in place: opt out of React Compiler memoisation.
'use no memo';

import { View } from 'react-native';

import { Photo } from '@/components/photo';
import { Stepper } from '@/components/stepper';
import { Txt } from '@/components/txt';
import { type CartLine, productById } from '@/data/catalog';
import { useApp } from '@/store/app-store';
import { fmt, optionText, storeIcon } from '@/store/derive';
import { colors, radius } from '@/theme';
import { useCatalog } from '@/hooks/use-catalog';

export function CartLineRow({ line }: { line: CartLine }) {
  useCatalog();
  const changeQty = useApp((s) => s.changeQty);
  const p = productById[line.pid];
  const opts = optionText(p, line.sel);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
      <Photo
        icon={storeIcon(p.storeId)}
        iconSize={28}
        style={{ width: 60, height: 60, borderRadius: radius.md }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={500} lh={1.3}>
          {p.name}
        </Txt>
        {!!opts && (
          <Txt size={12} color={colors.neutral700}>
            {opts}
          </Txt>
        )}
        <Txt heading size={17} style={{ marginTop: 2 }}>
          {fmt(line.unit * line.qty)}
        </Txt>
      </View>
      <Stepper
        qty={line.qty}
        trashAtOne
        onInc={() => changeQty(line.key, 1)}
        onDec={() => changeQty(line.key, -1)}
      />
    </View>
  );
}
