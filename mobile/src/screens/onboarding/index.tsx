import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen, useBottomPad } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/txt';
import { categories } from '@/data/catalog';
import type { Lang } from '@/data/strings';
import { useApp, useRtl, useT } from '@/store/app-store';
import { categoryIcon } from '@/store/derive';
import { colors, monoFont, radius, shadow } from '@/theme';

export const langOptions: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
  { value: 'ar', label: 'ع' },
];

/** Three-step intro ending with the location prompt. */
export function Onboarding() {
  const t = useT();
  const rtl = useRtl();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  const set = useApp((s) => s.set);
  const showToast = useApp((s) => s.showToast);
  const bottom = useBottomPad(34);
  const [step, setStep] = useState(0);

  const title = [t.onb1t, t.onb2t, t.onb3t][step];
  const body = [t.onb1b, t.onb2b, t.onb3b][step];

  return (
    <Screen style={{ paddingHorizontal: 20, paddingBottom: bottom }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          marginTop: 4,
        }}>
        <Txt heading size={26} style={{ letterSpacing: 26 * 0.06 }}>
          YALLO
        </Txt>
        <Segmented options={langOptions} value={lang} onChange={setLang} padV={6} padH={12} />
      </View>

      <View
        style={{
          marginTop: 14,
          height: 330,
          borderRadius: 28,
          overflow: 'hidden',
          backgroundColor: colors.card,
          boxShadow: shadow.sm,
        }}>
        {step === 0 && <CategoryGrid />}
        {step === 1 && <SpeedPanel />}
        {step === 2 && <MapPanel />}
      </View>

      <View style={{ marginTop: 26, flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                height: 6,
                borderRadius: 3,
                width: i === step ? 32 : 12,
                backgroundColor: i <= step ? colors.accent : colors.neutral300,
              }}
            />
          ))}
        </View>
        <Txt heading size={40} lh={1.02} style={{ marginBottom: 10 }}>
          {title}
        </Txt>
        <Txt size={16} color={colors.neutral700}>
          {body}
        </Txt>
      </View>

      {step < 2 ? (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Button
            variant="ghost"
            label={t.skip}
            fontSize={17}
            color={colors.neutral700}
            onPress={() => setStep(2)}
            style={{ height: 52, paddingHorizontal: 16 }}
          />
          <Button
            label={t.next}
            iconEnd={rtl ? 'arrowL' : 'arrowR'}
            fontSize={18}
            onPress={() => setStep(Math.min(2, step + 1))}
            style={{ flex: 1, height: 54 }}
          />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Button
            label={t.allow}
            icon="nav"
            fontSize={18}
            onPress={() => {
              set({ addrId: 'a1' });
              showToast(t.located);
              router.push('/sign-in');
            }}
            style={{ height: 54 }}
          />
          <Button
            variant="secondary"
            label={t.manual}
            fontSize={17}
            onPress={() => router.push('/new-address')}
            style={{ height: 52 }}
          />
        </View>
      )}
    </Screen>
  );
}

function CategoryGrid() {
  const t = useT();
  const rows = [categories.slice(0, 2), categories.slice(2, 4), categories.slice(4, 6)];
  return (
    <View style={{ flex: 1, gap: 1, backgroundColor: colors.divider }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 1 }}>
          {row.map((c) => (
            <View
              key={c}
              style={{
                flex: 1,
                backgroundColor: colors.bg,
                justifyContent: 'space-between',
                padding: 12,
              }}>
              <Icon name={categoryIcon[c]} size={40} color={colors.accent} />
              <Txt
                mono
                size={10}
                lh={1.3}
                color={colors.accent800}
                style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {t[`cat_${c}`]}
              </Txt>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function SpeedPanel() {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 1, backgroundColor: colors.divider }}>
      <View
        style={{ flex: 1.4, backgroundColor: colors.bg, justifyContent: 'flex-end', padding: 16 }}>
        <Txt heading size={120} lh={0.85} color={colors.accent} style={{ letterSpacing: -2 }}>
          30
        </Txt>
        <Txt
          mono
          size={10}
          lh={1.3}
          color={colors.accent800}
          style={{ marginTop: 8, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          min · avg. to your door
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="cart" size={40} color={colors.accent} />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="pill" size={40} color={colors.accent} />
        </View>
      </View>
    </View>
  );
}

function MapPanel() {
  return (
    <View style={{ flex: 1, direction: 'ltr', borderRadius: radius.lg }}>
      <Svg viewBox="0 0 350 330" width="100%" height="100%">
        <Path
          d="M0 110H350M0 220H350M90 0V330M230 0V330M0 300L350 30"
          stroke={colors.divider}
          strokeWidth={14}
          fill="none"
        />
        <Circle
          cx={175}
          cy={165}
          r={70}
          fill={colors.accent100}
          stroke={colors.accent}
          strokeDasharray="4 5"
        />
        <Circle cx={175} cy={165} r={8} fill={colors.accent} />
        <Circle cx={175} cy={165} r={18} fill="none" stroke={colors.accent} />
        <SvgText
          x={16}
          y={322}
          fontFamily={monoFont}
          fontSize={10}
          fontWeight="500"
          letterSpacing={0.6}
          fill={colors.accent800}>
          GUÉLIZ · MARRAKECH
        </SvgText>
      </Svg>
    </View>
  );
}
