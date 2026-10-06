import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { colors } from '@/theme';

const cities = ['Marrakech', 'Casablanca', 'Rabat'] as const;

const empty = {
  label: '',
  city: 'Marrakech',
  district: '',
  street: '',
  building: '',
  landmark: '',
};

/** New address form. From onboarding ("Enter address manually") it continues to sign-in. */
export function NewAddressSheet() {
  const t = useT();
  const saveAddress = useApp((s) => s.saveAddress);
  const [na, setNa] = useState(empty);
  const field = (k: keyof typeof empty) => ({
    value: na[k],
    onChangeText: (v: string) => setNa((x) => ({ ...x, [k]: v })),
  });
  const invalid = !na.district.trim() || !na.street.trim();

  const save = () => {
    saveAddress(na);
    router.back();
    if (!useApp.getState().signedIn) router.push('/sign-in');
  };

  return (
    <Sheet scroll>
      <Txt heading size={27} style={{ marginBottom: 12 }}>
        {t.addNew}
      </Txt>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <Txt size={12} w={600} color={colors.neutral700}>
            {t.city}
          </Txt>
          <Segmented
            options={cities.map((c) => ({ value: c, label: c }))}
            value={na.city as (typeof cities)[number]}
            onChange={(city) => setNa((x) => ({ ...x, city }))}
            padV={8}
            padH={14}
            fontSize={14}
          />
        </View>
        <TextField label={t.district} placeholder="Guéliz, Maârif, Agdal…" {...field('district')} />
        <TextField label={t.street} placeholder="12 Rue de la Liberté" {...field('street')} />
        <TextField
          label={t.building}
          placeholder="Imm. 4, 2e étage, Appt 8"
          {...field('building')}
        />
        <TextField label={t.landmark} placeholder={t.landmarkPh} {...field('landmark')} />
        <TextField label={t.label} placeholder="Home, Work, Dar lwalida…" {...field('label')} />
        <Button
          label={t.save}
          fontSize={17}
          disabled={invalid}
          onPress={save}
          style={{ height: 52, marginTop: 4 }}
        />
      </View>
    </Sheet>
  );
}
