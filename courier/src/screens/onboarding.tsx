import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackButton, Btn, Spacer } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen, useBottomPad } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Circle, CodeBoxes, Keypad, haptic } from '@/components/ui';
import type { Lang } from '@/data/i18n';
import { useCourier, useT, type Vehicle } from '@/store/courier-store';
import { colors, fontFamily, radius, shadow } from '@/theme';

/** Signing in starts the demo courier offline; live, availability comes from the server. */
const signIn = (s: { source: 'demo' | 'live' }) =>
  s.source === 'demo' ? { signedIn: true, online: false } : { signedIn: true };

const LANGS: Lang[] = ['FR', 'ع', 'EN'];

export function Welcome() {
  const t = useT();
  const lang = useCourier((s) => s.lang);
  const set = useCourier((s) => s.set);
  const bottom = useBottomPad(8);
  const how = ['Go online whenever you like', 'Accept orders near you', 'Get paid every Monday'];
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: bottom,
        }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}>
          <View style={[styles.row, { gap: 8 }]}>
            <Txt h size={26} style={{ letterSpacing: 1.5 }}>
              YALLO
            </Txt>
            <View style={styles.tagAccent}>
              <Txt size={11} weight={600} color={colors.accent800}>
                Courier
              </Txt>
            </View>
          </View>
          <View style={styles.langSwitch} accessibilityRole="radiogroup">
            {LANGS.map((l) => {
              const on = lang === l;
              return (
                <Pressable
                  key={l}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={{ FR: 'Français', ع: 'العربية', EN: 'English' }[l]}
                  onPress={() => set({ lang: l })}
                  style={[styles.langBtn, on && { backgroundColor: colors.text }]}>
                  <Txt size={13} weight={700} color={on ? colors.bg : colors.text}>
                    {l}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Spacer />
        <Txt title size={58} lh={1.05} style={{ marginTop: 48, marginBottom: 16 }}>
          {t('Deliver.')}
          {'\n'}
          {t('Earn.')}
          {'\n'}
          <Txt title size={58} lh={1.05} color={colors.accent700}>
            {t('Grow.')}
          </Txt>
        </Txt>
        <Txt size={17} style={{ marginBottom: 28, maxWidth: 300 }}>
          {t('Deliver food, groceries and pharmacy orders across your city — whenever you choose.')}
        </Txt>
        <View style={{ gap: 14 }}>
          {how.map((h, i) => (
            <View key={h} style={[styles.row, { gap: 14 }]}>
              <Circle size={34} bg={colors.mint700}>
                <Txt h size={16} color={colors.mint100}>
                  {i + 1}
                </Txt>
              </Circle>
              <Txt size={16} weight={600} style={{ flex: 1 }}>
                {t(h)}
              </Txt>
            </View>
          ))}
        </View>
        <Spacer />
        <View style={{ gap: 10, marginTop: 40 }}>
          <Btn
            label={t('Log in')}
            onPress={() => router.push('/login')}
            height={60}
            fontSize={19}
          />
          <Btn
            variant="secondary"
            label={t('Become a courier')}
            onPress={() => router.push('/signup')}
            height={56}
            fontSize={17}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

export function Login() {
  const t = useT();
  const loginPhone = useCourier((s) => s.loginPhone);
  const set = useCourier((s) => s.set);
  const bottom = useBottomPad(8);
  const arabic = useCourier((s) => s.lang === 'ع');
  return (
    <Screen keyboard>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: bottom }}>
        <BackButton onPress={() => router.back()} />
        <Txt title size={36} accessibilityRole="header" style={{ marginTop: 28, marginBottom: 8 }}>
          {t('Welcome back')}
        </Txt>
        <Txt size={16} color={colors.neutral700} style={{ marginBottom: 28 }}>
          {t("Enter your phone number — we'll text you a code.")}
        </Txt>
        <FieldLabel>{t('Phone number')}</FieldLabel>
        <View style={{ flexDirection: 'row', gap: 8, direction: 'ltr' }}>
          <View style={styles.dialCode}>
            <View style={styles.flag}>
              <View style={styles.flagStar} />
            </View>
            <Txt size={17} weight={700}>
              +212
            </Txt>
          </View>
          <TextInput
            value={loginPhone}
            onChangeText={(v) => set({ loginPhone: v })}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            accessibilityLabel={t('Phone number')}
            returnKeyType="done"
            onSubmitEditing={() => router.push('/otp')}
            style={[
              styles.input,
              { flex: 1, height: 56, fontSize: 18, fontFamily: fontFamily('body', 600, arabic) },
            ]}
          />
        </View>
        <Spacer />
        <Btn label={t('Send code')} onPress={() => router.push('/otp')} height={60} fontSize={19} />
        <Btn
          variant="ghost"
          label={t('New to Yallo? Become a courier')}
          onPress={() => router.replace('/signup')}
          height={44}
          style={{ marginTop: 12, alignSelf: 'center' }}
        />
      </View>
    </Screen>
  );
}

export function Otp() {
  const t = useT();
  const loginPhone = useCourier((s) => s.loginPhone);
  const set = useCourier((s) => s.set);
  const showToast = useCourier((s) => s.showToast);
  const [otp, setOtp] = useState('');
  const bottom = useBottomPad();

  // Signs in shortly after the 4th digit lands (demo: any code works).
  useEffect(() => {
    if (otp.length !== 4) return;
    const id = setTimeout(() => {
      haptic.success();
      set(signIn);
      showToast('Welcome back, Karim');
    }, 350);
    return () => clearTimeout(id);
  }, [otp, set, showToast]);

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: bottom }}>
        <BackButton onPress={() => router.back()} />
        <Txt title size={36} accessibilityRole="header" style={{ marginTop: 28, marginBottom: 8 }}>
          {t('Enter the code')}
        </Txt>
        <Txt size={16} color={colors.neutral700} style={{ marginBottom: 28 }}>
          {t('Sent by SMS to')} +212 {loginPhone}
        </Txt>
        <CodeBoxes value={otp} width={68} height={76} fontSize={34} />
        <Txt size={14} color={colors.neutral700} style={{ marginTop: 16 }}>
          {t('Demo: any 4 digits work · Resend in 0:24')}
        </Txt>
        <Spacer />
        <Keypad
          keyHeight={58}
          fontSize={26}
          gap={8}
          onDigit={(d) => setOtp((v) => (v.length < 4 ? v + d : v))}
          onDelete={() => setOtp((v) => v.slice(0, -1))}
        />
      </View>
    </Screen>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt size={12} weight={600} color={colors.neutral700} style={{ marginBottom: 6 }}>
      {children}
    </Txt>
  );
}

function StepHeader({ step, pct }: { step: string; pct: string }) {
  return (
    <View style={[styles.row, { gap: 12, paddingHorizontal: 24, paddingVertical: 12 }]}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.stepTrack} accessibilityRole="progressbar" accessibilityLabel={step}>
        <View style={[styles.stepFill, { width: pct as `${number}%` }]} />
      </View>
      <Txt size={13} weight={700} color={colors.neutral700}>
        {step}
      </Txt>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: 'phone-pad' | 'email-address';
  autoComplete?: 'name' | 'tel' | 'email';
}) {
  const arabic = useCourier((s) => s.lang === 'ع');
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral500}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        accessibilityLabel={label}
        style={[
          styles.input,
          { height: 52, fontSize: 16, fontFamily: fontFamily('body', 400, arabic) },
        ]}
      />
    </View>
  );
}

const CITIES = ['Marrakech', 'Casablanca', 'Rabat', 'Tangier', 'Agadir'];
const VEHICLES: [Vehicle, string, IconName][] = [
  ['bike', 'Bicycle', 'bike'],
  ['moto', 'Motorcycle', 'moto'],
  ['car', 'Car', 'car'],
];

export function Signup() {
  const t = useT();
  const s = useCourier();
  const bottom = useBottomPad();
  const setForm = (k: keyof typeof s.form) => (v: string) =>
    s.set((st) => ({ form: { ...st.form, [k]: v } }));
  const ok = s.form.name.trim().length > 1 && s.form.phone.trim().length > 5;
  const initials =
    s.form.name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'KE';
  return (
    <Screen keyboard>
      <StepHeader step={t('1 of 2')} pct="50%" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Txt title size={32} accessibilityRole="header">
          {t('Tell us about you')}
        </Txt>
        <Pressable
          onPress={() => s.set({ photoAdded: true })}
          accessibilityRole="button"
          style={[styles.row, { gap: 14 }]}>
          <Circle size={76} bg={s.photoAdded ? colors.mint300 : colors.surface}>
            {s.photoAdded ? (
              <Txt h size={28} color={colors.mint900}>
                {initials}
              </Txt>
            ) : (
              <Icon name="camera" size={28} color={colors.neutral700} />
            )}
          </Circle>
          <View style={{ flex: 1 }}>
            <Txt size={16} weight={700}>
              {t(s.photoAdded ? 'Photo added' : 'Add a profile photo')}
            </Txt>
            <Txt size={13} color={colors.neutral700}>
              {t('Clear face, no sunglasses')}
            </Txt>
          </View>
        </Pressable>
        <Field
          label={t('Full name')}
          value={s.form.name}
          onChange={setForm('name')}
          placeholder="Karim El Amrani"
          autoComplete="name"
        />
        <Field
          label={t('Phone')}
          value={s.form.phone}
          onChange={setForm('phone')}
          placeholder="+212 6 61 23 45 78"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <Field
          label={t('Email')}
          value={s.form.email}
          onChange={setForm('email')}
          placeholder="karim@example.ma"
          keyboardType="email-address"
          autoComplete="email"
        />
        <View>
          <FieldLabel>{t('City')}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CITIES.map((c) => {
              const on = s.city === c;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => s.set({ city: c })}
                  style={[
                    styles.chip,
                    {
                      borderColor: on ? colors.text : colors.divider,
                      backgroundColor: on ? colors.text : 'transparent',
                    },
                  ]}>
                  <Txt size={15} weight={600} color={on ? colors.bg : colors.text}>
                    {c}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View>
          <FieldLabel>{t('Vehicle')}</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {VEHICLES.map(([k, label, icon]) => {
              const on = s.vehicle === k;
              const ink = on ? colors.accent800 : colors.text;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => s.set({ vehicle: k })}
                  style={[
                    styles.vehicle,
                    {
                      borderColor: on ? colors.accent : 'transparent',
                      backgroundColor: on ? colors.accent100 : colors.card,
                    },
                  ]}>
                  <Icon name={icon} size={30} color={ink} />
                  <Txt size={14} weight={700} color={ink}>
                    {t(label)}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: bottom }}>
        <Btn
          label={t('Continue')}
          disabled={!ok}
          onPress={() => router.push('/documents')}
          height={60}
          fontSize={19}
        />
      </View>
    </Screen>
  );
}

const DOC_DEFS: [string, string, string, IconName][] = [
  ['id', 'National ID (CIN)', 'Front and back', 'card'],
  ['lic', 'Driving licence', 'Category A for motorcycles', 'doc'],
  ['veh', 'Vehicle registration & insurance', 'Carte grise + attestation', 'file'],
  ['bank', 'Bank details (RIB)', 'For weekly payouts', 'wallet'],
];

export function Documents() {
  const t = useT();
  const vehicle = useCourier((s) => s.vehicle);
  const docs = useCourier((s) => s.docs);
  const set = useCourier((s) => s.set);
  const bottom = useBottomPad();
  // Bicycles need neither a licence nor registration.
  const defs = DOC_DEFS.filter((d) => vehicle !== 'bike' || (d[0] !== 'lic' && d[0] !== 'veh'));
  const ready = defs.every((d) => docs[d[0]]);
  return (
    <Screen>
      <StepHeader step={t('2 of 2')} pct="100%" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <Txt title size={32} accessibilityRole="header">
          {t('Documents')}
        </Txt>
        <Txt size={15} color={colors.neutral700} style={{ marginBottom: 8 }}>
          {t('Tap to scan each one with your camera. We only use them to verify your account.')}
        </Txt>
        {defs.map(([k, label, sub, icon]) => {
          const ok = !!docs[k];
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ checked: ok }}
              onPress={() => {
                haptic.tap();
                set((st) => ({ docs: { ...st.docs, [k]: true } }));
              }}
              style={({ pressed }) => [
                styles.docRow,
                { backgroundColor: ok ? colors.mint100 : colors.card },
                pressed && { opacity: 0.85 },
              ]}>
              <Circle size={48} bg={ok ? colors.mint500 : colors.surface}>
                <Icon
                  name={ok ? 'check' : icon}
                  size={22}
                  color={ok ? colors.white : colors.text}
                />
              </Circle>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={16} weight={700}>
                  {t(label)}
                </Txt>
                <Txt size={13} color={colors.neutral700}>
                  {t(sub)}
                </Txt>
              </View>
              <Txt size={13} weight={700} color={ok ? colors.mint700 : colors.accent700}>
                {t(ok ? 'Added' : 'Scan')}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: bottom }}>
        <Btn
          label={t('Submit for review')}
          disabled={!ready}
          onPress={() => router.replace('/verify')}
          height={60}
          fontSize={19}
        />
      </View>
    </Screen>
  );
}

const VERIFY_STEPS = [
  ['Pending', 'Documents received'],
  ['Under review', 'Our team is checking your documents'],
  ['Approved', 'You can start delivering'],
];
const VERIFY_STEP_MS = 1800;

export function Verify() {
  const t = useT();
  const s = useCourier();
  const [vstep, setVstep] = useState(0);
  const bottom = useBottomPad();

  // Demo review: each step completes on its own.
  useEffect(() => {
    if (vstep >= 2) return;
    const id = setTimeout(() => setVstep((v) => v + 1), VERIFY_STEP_MS);
    return () => clearTimeout(id);
  }, [vstep]);

  const done = vstep === 2;
  useEffect(() => {
    if (done) haptic.success();
  }, [done]);

  const vehicleWord = s.vehicle === 'bike' ? 'bicycle' : s.vehicle === 'car' ? 'car' : 'motorcycle';
  const first = s.form.name ? ', ' + s.form.name.split(' ')[0] : '';
  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: bottom }}>
        <Txt title size={34} accessibilityRole="header" style={{ marginBottom: 8 }}>
          {t(done ? "You're approved!" : 'Verifying your account')}
        </Txt>
        <Txt size={16} color={colors.neutral700} style={{ marginBottom: 36 }}>
          {t(
            done
              ? `Welcome to Yallo${first}. Your ${vehicleWord} account in ${s.city} is ready.`
              : 'Usually under 24 hours. We will send you an SMS as soon as you are approved.',
          )}
        </Txt>
        {VERIFY_STEPS.map(([label, sub], i) => {
          const past = i < vstep || done;
          const cur = i === vstep && !done;
          return (
            <View key={label} style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Circle
                  size={44}
                  bg={past ? colors.mint500 : cur ? colors.accent : colors.neutral300}>
                  <Icon
                    name={past ? 'check' : cur ? 'clock' : 'x'}
                    size={20}
                    color={past || cur ? colors.white : colors.neutral600}
                  />
                </Circle>
                <View
                  style={{
                    width: 3,
                    flex: 1,
                    minHeight: 32,
                    borderRadius: 2,
                    backgroundColor:
                      i === 2 ? 'transparent' : past ? colors.mint500 : colors.neutral300,
                  }}
                />
              </View>
              <View style={{ paddingTop: 8, paddingBottom: 24, flex: 1 }}>
                <Txt h size={20} color={past || cur ? colors.text : colors.neutral600}>
                  {t(label)}
                </Txt>
                <Txt size={14} color={colors.neutral700}>
                  {t(sub)}
                </Txt>
              </View>
            </View>
          );
        })}
        <Spacer />
        <Btn
          label={t('Start delivering')}
          disabled={!done}
          onPress={() => {
            s.set(signIn);
            s.showToast('Account approved');
          }}
          height={60}
          fontSize={19}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagAccent: {
    backgroundColor: colors.accent100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  langSwitch: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.card,
    boxShadow: shadow.sm,
    borderRadius: 999,
    padding: 4,
  },
  langBtn: {
    minWidth: 40,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dialCode: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flag: {
    width: 20,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.accent700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagStar: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: colors.mint300 },
  input: {
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  stepTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.neutral300,
    overflow: 'hidden',
  },
  stepFill: { height: '100%', borderRadius: 999, backgroundColor: colors.accent },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  vehicle: {
    flex: 1,
    height: 96,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
  },
});
