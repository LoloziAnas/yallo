import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
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
  // Set when "Use my location" opened this form: it couldn't locate the device, or found the
  // place but no street (then the fields start from the GPS fix and the pin is kept).
  const { reason } = useLocalSearchParams<{ reason?: 'denied' | 'unavailable' | 'needsStreet' }>();
  const saveAddress = useApp((s) => s.saveAddress);
  const saveLocated = useApp((s) => s.saveLocated);
  const draft = useApp((s) => (reason === 'needsStreet' ? s.locDraft : null));
  const [na, setNa] = useState(() =>
    draft
      ? {
          ...empty,
          label: t.currentLoc,
          city: cities.find((c) => c === draft.city) ?? 'Marrakech',
          district: draft.district,
        }
      : empty,
  );
  const field = (k: keyof typeof empty) => ({
    value: na[k],
    onChangeText: (v: string) => setNa((x) => ({ ...x, [k]: v })),
  });
  const invalid = !na.district.trim() || !na.street.trim();

  const save = () => {
    if (draft) saveLocated(na);
    else saveAddress(na);
    router.back();
    if (!useApp.getState().signedIn) router.push('/sign-in');
  };

  return (
    <Sheet scroll>
      {reason && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            marginBottom: 12,
            borderRadius: 14,
            backgroundColor: colors.accent100,
          }}>
          <Icon name="nav" size={15} color={colors.accent700} />
          <Txt size={13} color={colors.accent800} style={{ flex: 1 }}>
            {reason === 'needsStreet'
              ? t.locNeedStreet.replace('%s', draft?.district || draft?.city || '…')
              : reason === 'denied'
                ? t.locDenied
                : t.locFailed}
          </Txt>
        </View>
      )}
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
