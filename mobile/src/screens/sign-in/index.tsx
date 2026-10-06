import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Screen, useBottomPad } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useApp, useRtl, useT } from '@/store/app-store';
import { colors, fontFamily, radius } from '@/theme';

/** Phone number → SMS code sign-in, with social and guest shortcuts. */
export function SignIn() {
  const t = useT();
  const rtl = useRtl();
  const enterApp = useApp((s) => s.enterApp);
  const showToast = useApp((s) => s.showToast);
  const bottom = useBottomPad(34);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const digits = phone.replace(/\D/g, '');
  const valid = digits.length === 9 || (digits.length === 10 && digits[0] === '0');

  const onOtp = (v: string) => {
    const code = v.replace(/\D/g, '').slice(0, 4);
    setOtp(code);
    if (code.length === 4) timer.current = setTimeout(enterApp, 350);
  };

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
                {t.signIn}
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
              <Button
                label={t.continue}
                fontSize={18}
                disabled={!valid}
                onPress={() => {
                  setOtp('');
                  setStep('otp');
                }}
                style={{ height: 54, marginTop: 16 }}
              />
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                <Txt size={13} color={colors.neutral600}>
                  {t.or}
                </Txt>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
              </View>
              <View style={{ gap: 10 }}>
                <Button
                  variant="secondary"
                  label={t.google}
                  fontSize={16}
                  onPress={enterApp}
                  style={{ height: 52 }}
                />
                <Button
                  variant="secondary"
                  label={t.apple}
                  fontSize={16}
                  onPress={enterApp}
                  style={{ height: 52 }}
                />
              </View>
              <View style={{ flex: 1, minHeight: 24 }} />
              <Button
                variant="ghost"
                label={t.guest}
                fontSize={16}
                onPress={enterApp}
                style={{ height: 48, alignSelf: 'center' }}
              />
              <Txt size={12} color={colors.neutral600} center style={{ marginTop: 8 }}>
                {t.terms}
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
                  {'⁦+212 ' + (phone || '6 61 23 45 67') + '⁩'}
                </Txt>
              </Txt>
              <TextField
                ltr
                autoFocus
                value={otp}
                onChangeText={onOtp}
                maxLength={4}
                placeholder="• • • •"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                accessibilityLabel={t.otpT}
                minHeight={72}
                fontSize={40}
                style={{
                  textAlign: 'center',
                  letterSpacing: 24,
                  fontFamily: fontFamily('heading', 600, false),
                }}
              />
              <Button
                variant="ghost"
                label={t.resend}
                onPress={() => showToast(t.otpSent + ' +212 ' + phone)}
                style={{ alignSelf: 'flex-start', marginTop: 14 }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
