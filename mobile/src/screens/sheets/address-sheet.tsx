import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { RadioRow } from '@/components/radio-row';
import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { colors } from '@/theme';

import { SheetBody } from './sheet-body';

/** Pick the delivery address, use the current location, or add a new one. */
export function AddressSheet() {
  const t = useT();
  const addresses = useApp((s) => s.addresses);
  const addrId = useApp((s) => s.addrId);
  const set = useApp((s) => s.set);
  const locateMe = useApp((s) => s.locateMe);
  const [locating, setLocating] = useState(false);

  return (
    <SheetBody scroll>
      <Txt heading size={27} style={{ marginBottom: 12 }}>
        {t.address}
      </Txt>
      <Button
        variant="secondary"
        disabled={locating}
        onPress={async () => {
          setLocating(true);
          const result = await locateMe();
          setLocating(false);
          if (result === 'ok') router.back();
          else router.replace({ pathname: '/new-address', params: { reason: result } });
        }}
        accessibilityLabel={t.useLoc}
        style={{ height: 48, justifyContent: 'flex-start', gap: 10, paddingHorizontal: 14 }}>
        <Icon name="nav" color={colors.accent} />
        <Txt w={600}>{locating ? t.locating : t.useLoc}</Txt>
      </Button>
      {addresses.map((a) => (
        <RadioRow
          key={a.id}
          alignTop
          selected={a.id === addrId}
          onPress={() => {
            set({ addrId: a.id });
            router.back();
          }}
          style={{ paddingVertical: 14 }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt w={600}>{a.label}</Txt>
            <Txt size={13}>{`${a.street}, ${a.district} · ${a.city}`}</Txt>
            {!!(a.building || a.landmark) && (
              <Txt size={12} color={colors.neutral700}>
                {[a.building, a.landmark].filter(Boolean).join(' · ')}
              </Txt>
            )}
          </View>
        </RadioRow>
      ))}
      <Button
        variant="ghost"
        icon="plus"
        label={t.addNew}
        onPress={() => router.replace('/new-address')}
        style={{ alignSelf: 'flex-start', marginTop: 10, height: 44 }}
      />
    </SheetBody>
  );
}
