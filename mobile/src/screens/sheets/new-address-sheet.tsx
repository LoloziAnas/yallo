import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { LiveMap, type LngLat } from '@/components/live-map';
import { MARRAKECH } from '@/components/live-map/shared';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { nearestZone } from '@/location/locate';
import { zoneForDistrict } from '@/location/zones';
import { useApp, useT } from '@/store/app-store';
import { colors, radius } from '@/theme';

import { useAddressSearch } from './use-address-search';

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
  // Where the address is: the GPS fix, a search result, or a tap on the map.
  const [pin, setPin] = useState<LngLat | null>(() =>
    draft?.lat !== undefined && draft?.lon !== undefined ? [draft.lon, draft.lat] : null,
  );
  const [lookingUp, setLookingUp] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const near = pin ? { lat: pin[1], lon: pin[0] } : { lat: MARRAKECH[1], lon: MARRAKECH[0] };
  const search = useAddressSearch(near);

  /** Fills the fields from a found place (street, neighbourhood, city when served). */
  const fill = (p: { street: string; district: string; city: string }) =>
    setNa((x) => ({
      ...x,
      street: p.street || x.street,
      district: p.district || x.district,
      city: cities.find((c) => c === p.city) ?? x.city,
    }));

  const dropPin = async (at: LngLat) => {
    setPin(at);
    setNotFound(false);
    setLookingUp(true);
    const place = await search.reverse(at[1], at[0]);
    setLookingUp(false);
    if (place?.street) fill(place);
    else setNotFound(true);
  };

  const save = () => {
    const where = pin
      ? {
          lat: pin[1],
          lon: pin[0],
          zone: nearestZone(pin[1], pin[0]) ?? zoneForDistrict(na.district),
        }
      : {};
    if (draft) saveLocated({ ...na, ...where });
    else saveAddress({ ...na, ...where });
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
      <TextField
        value={search.query}
        onChangeText={search.setQuery}
        placeholder={t.searchAddr}
        accessibilityLabel={t.searchAddr}
        autoCorrect={false}
      />
      {search.searching && (
        <Txt size={12} color={colors.neutral600} style={{ marginTop: 6 }}>
          {t.searching}
        </Txt>
      )}
      {search.results.length > 0 && (
        <View
          style={{
            marginTop: 6,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.divider,
            backgroundColor: colors.card,
            overflow: 'hidden',
          }}>
          {search.results.map((p, i) => (
            <Pressable
              key={`${p.lat},${p.lon},${i}`}
              accessibilityRole="button"
              onPress={() => {
                setPin([p.lon, p.lat]);
                setNotFound(false);
                fill(p);
                search.clear();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 11,
                paddingHorizontal: 12,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.divider,
                backgroundColor: pressed ? colors.neutral100 : 'transparent',
              })}>
              <Icon name="pin" size={15} color={colors.accent} />
              <Txt size={14} style={{ flex: 1 }} numberOfLines={2}>
                {p.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
      {/* Where the address is. Tap the map to move the pin; the street fills in from it. */}
      <View style={{ height: 180, marginTop: 10, borderRadius: 14, overflow: 'hidden' }}>
        <LiveMap
          pins={pin ? [{ id: 'home', kind: 'home', lngLat: pin }] : []}
          center={pin ?? MARRAKECH}
          zoom={pin ? 16 : 12}
          onPress={dropPin}
        />
      </View>
      <Txt
        size={12}
        color={notFound ? colors.accent700 : colors.neutral600}
        style={{ marginTop: 6, marginBottom: 14 }}>
        {lookingUp ? t.searching : notFound ? t.noPlace : t.pinHint}
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
