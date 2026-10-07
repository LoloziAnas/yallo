import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { api } from '@/api/client';
import { Button, IconButton } from '@/components/button';
import { Screen, useBottomPad } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useApp, useRtl, useT } from '@/store/app-store';
import { colors, fontFamily, radius } from '@/theme';

const CODE_LENGTH = 6;

/**
 * Phone number → SMS code sign-in against the API.
 * - `onboarding`: the first-run screen, with "Continue as guest" for browsing.
 * - `login`: opened later (at checkout, from Profile or Help); returns where it came from, or on
 *   to checkout when `then=checkout`.
 */
export function SignIn({ mode = 'onboarding' }: { mode?: 'onboarding' | 'login' }) {
  const t = useT();
  const rtl = useRtl();
  const { then } = useLocalSearchParams<{ then?: 'checkout' }>();
  const enterApp = useApp((s) => s.enterApp);
  const signIn = useApp((s) => s.signIn);
  const showToast = useApp((s) => s.showToast);
  const bottom = useBottomPad(34);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  // The number as the API normalised it ("+212612345678"), shown on the code step.
  const [sentTo, setSentTo] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const digits = phone.replace(/\D/g, '');
  const valid = digits.length === 9 || (digits.length === 10 && digits[0] === '0');
  const message = (e: unknown) => (e instanceof Error && e.message) || t.signInFailed;

  const requestCode = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.requestOtp(digits, 'customer');
      setSentTo(r.phone);
      setOtp('');
      setStep('otp');
    } catch (e) {
      setError(message(e));
    }
    setBusy(false);
  };

  const verify = async (code: string) => {
    setBusy(true);
    setError('');
    try {
      const session = await api.verifyOtp(digits, code, name.trim() || undefined);
      signIn(session);
      if (mode === 'onboarding') enterApp();
      else {
        router.back();
        if (then === 'checkout') router.push('/checkout');
      }
    } catch (e) {
      // A wrong code says so in the user's language; other refusals (too many tries…) come from the API.
      setError(e instanceof Error && /wrong code/i.test(e.message) ? t.wrongCode : message(e));
      setOtp('');
    }
    setBusy(false);
  };

  const onOtp = (v: string) => {
    const code = v.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setOtp(code);
    if (code.length === CODE_LENGTH && !busy) verify(code);
  };

  const errorLine = !!error && (
    <Txt size={13} color={colors.accent700} style={{ marginTop: 10 }}>
      {error}
    </Txt>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: bottom,
          }}>
          <IconButton
            name={rtl ? 'chevR' : 'chevL'}
            accessibilityLabel="Back"
            onPress={() => (step === 'otp' ? setStep('phone') : router.back())}
            style={{ marginStart: -10 }}
          />

          {step === 'phone' ? (
            <View style={{ flex: 1 }}>
              <Txt heading size={38} style={{ marginTop: 16, marginBottom: 6 }}>
                {then === 'checkout' ? t.signInToOrder : t.signIn}
              </Txt>
              <Txt color={colors.neutral700} style={{ marginBottom: 24 }}>
                {t.phoneHint}
              </Txt>
              <Txt size={12} w={600} color={colors.neutral700} style={{ marginBottom: 6 }}>
                {t.phone}
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8, direction: 'ltr' }}>
                <View
                  style={{
                    width: 84,
                    minHeight: 52,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.divider,
                    borderRadius: radius.md,
                  }}>
                  <Txt size={17} w={500} center style={{ writingDirection: 'ltr' }}>
                    +212
                  </Txt>
                </View>
                <TextField
                  ltr
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/[^\d ]/g, '').slice(0, 13))}
                  placeholder="6 61 23 45 67"
                  keyboardType="number-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  accessibilityLabel={t.phone}
                  minHeight={52}
                  fontSize={18}
                  style={{ flex: 1, letterSpacing: 0.7 }}
                />
              </View>
              <View style={{ marginTop: 14 }}>
                <TextField
                  label={t.nameLabel}
                  value={name}
                  onChangeText={setName}
                  maxLength={60}
                  textContentType="name"
                  autoComplete="name"
                  accessibilityLabel={t.nameLabel}
                />
              </View>
              {errorLine}
              <Button
                label={busy ? t.sending : t.continue}
                fontSize={18}
                disabled={!valid || busy}
                onPress={requestCode}
                style={{ height: 54, marginTop: 16 }}
              />
              <View style={{ flex: 1, minHeight: 24 }} />
              {mode === 'onboarding' && (
                <Button
                  variant="ghost"
                  label={t.guest}
                  fontSize={16}
                  onPress={() => enterApp()}
                  style={{ height: 48, alignSelf: 'center' }}
                />
              )}
              <Txt size={12} color={colors.neutral600} center style={{ marginTop: 8 }}>
                {/* "[Terms]" and "[Privacy Policy]" in the sentence become links, in every language. */}
                {t.terms.split(/\[([^\]]+)\]/).map((part, i) =>
                  i % 2 ? (
                    <Txt
                      key={i}
                      size={12}
                      w={600}
                      color={colors.accent700}
                      accessibilityRole="link"
                      onPress={() => router.push(i === 1 ? '/terms' : '/privacy')}
                      style={{ textDecorationLine: 'underline' }}>
                      {part}
                    </Txt>
                  ) : (
                    part
                  ),
                )}
              </Txt>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Txt heading size={38} style={{ marginTop: 16, marginBottom: 6 }}>
                {t.otpT}
              </Txt>
              <Txt color={colors.neutral700} style={{ marginBottom: 28 }}>
                {t.otpSent}{' '}
                <Txt w={600} style={{ writingDirection: 'ltr' }}>
                  {'⁦' + sentTo + '⁩'}
                </Txt>
              </Txt>
              <TextField
                ltr
                autoFocus
                value={otp}
                onChangeText={onOtp}
                editable={!busy}
                maxLength={CODE_LENGTH}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                accessibilityLabel={t.otpT}
                minHeight={72}
                fontSize={34}
                style={{
                  textAlign: 'center',
                  letterSpacing: 14,
                  fontFamily: fontFamily('heading', 600, false),
                }}
              />
              {busy && (
                <Txt size={13} color={colors.neutral600} style={{ marginTop: 10 }}>
                  {t.checking}
                </Txt>
              )}
              {errorLine}
              <Button
                variant="ghost"
                label={t.resend}
                disabled={busy}
                onPress={async () => {
                  try {
                    const r = await api.requestOtp(digits, 'customer');
                    showToast(t.otpSent + ' ' + r.phone);
                  } catch (e) {
                    setError(message(e));
                  }
                }}
                style={{ alignSelf: 'flex-start', marginTop: 14 }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
