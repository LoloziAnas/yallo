import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/txt';
import type { Lang } from '@/data/strings';
import { useApp, useRtl, useT } from '@/store/app-store';
import { appVersion } from '@/utils/version';
import { colors, radius, shadow } from '@/theme';

/** Profile tab: account rows, notifications, language, help/settings and log out. */
export function Profile() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  const notif = useApp((s) => s.notif);
  const setNotif = useApp((s) => s.setNotif);
  const showToast = useApp((s) => s.showToast);
  const logout = useApp((s) => s.logout);
  const addresses = useApp((s) => s.addresses);
  const orders = useApp((s) => s.orders);
  const favStores = useApp((s) => s.favStores);
  const favProducts = useApp((s) => s.favProducts);
  const soon = () => showToast(t.soon);
  const token = useApp((s) => s.token);
  const phone = useApp((s) => s.phone);
  const userName = useApp((s) => s.userName);
  const signIn = () => router.push('/login');
  const displayName = userName || (token ? phone : null) || t.guestName;
  const initials = (userName ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const rows: [IconName, string, string, () => void][] = [
    [
      'user',
      t.personal,
      [userName, token ? phone : null].filter(Boolean).join(' · ') || t.guestName,
      token ? soon : signIn,
    ],
    ['pin', t.addresses, addresses.map((a) => a.label).join(' · '), () => router.push('/address')],
    ['card', t.payments, t.cash, () => router.push('/payments')],
    [
      'receipt',
      t.orders,
      `${orders.length} ${t.previous.toLowerCase()}`,
      () => router.navigate('/orders'),
    ],
    [
      'heart',
      t.favorites,
      `${favStores.length} ${t.stores.toLowerCase()} · ${favProducts.length} ${t.products.toLowerCase()}`,
      () => router.navigate('/favorites'),
    ],
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}>
          <View
            style={{
              width: 68,
              height: 68,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              boxShadow: shadow.sm,
            }}>
            {initials ? (
              <Txt heading size={26} color={colors.accent700}>
                {initials}
              </Txt>
            ) : (
              <Icon name="user" size={28} color={colors.accent700} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Txt heading size={26}>
              {displayName}
            </Txt>
            {token && userName && phone ? (
              <Txt size={14} color={colors.neutral700} style={{ writingDirection: 'ltr' }}>
                {'\u2066' + phone + '\u2069'}
              </Txt>
            ) : !token ? (
              <Button
                variant="ghost"
                label={t.signInCta}
                onPress={signIn}
                style={{ alignSelf: 'flex-start', paddingHorizontal: 0, height: 32 }}
              />
            ) : null}
          </View>
        </View>

        {rows.map(([icon, label, sub, onPress]) => (
          <Row key={label} icon={icon} onPress={onPress} minHeight={62}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt w={500}>{label}</Txt>
              <Txt size={12} color={colors.neutral700} numberOfLines={1}>
                {sub}
              </Txt>
            </View>
          </Row>
        ))}

        <Row icon="bell" minHeight={62}>
          <Txt w={500} style={{ flex: 1 }}>
            {t.notifications}
          </Txt>
          <PillSwitch value={notif} onChange={() => setNotif(!notif)} />
        </Row>
        <Row icon="globe" minHeight={62}>
          <Txt w={500} style={{ flex: 1 }}>
            {t.language}
          </Txt>
          <Segmented<Lang>
            options={[
              { value: 'en', label: 'EN' },
              { value: 'fr', label: 'FR' },
              { value: 'ar', label: 'ع' },
            ]}
            value={lang}
            onChange={setLang}
            padV={6}
            padH={10}
          />
        </Row>

        {(
          [
            ['help', t.help, () => router.push('/help')],
            ['gear', t.settings, soon],
          ] as const
        ).map(([icon, label, onPress]) => (
          <Row key={label} icon={icon} onPress={onPress} minHeight={58}>
            <Txt w={500} style={{ flex: 1 }}>
              {label}
            </Txt>
          </Row>
        ))}

        <Pressable
          onPress={logout}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            minHeight: 58,
            paddingVertical: 8,
            paddingHorizontal: 16,
            backgroundColor: pressed ? colors.accent100 : 'transparent',
          })}>
          <Icon name="logout" color={colors.accent700} />
          <Txt w={500} color={colors.accent700}>
            {t.logout}
          </Txt>
        </Pressable>
        <Txt
          mono
          size={11}
          color={colors.neutral600}
          selectable
          accessibilityLabel={`Version ${appVersion}`}
          style={{ padding: 16 }}>
          {`YALLO ${appVersion} · MARRAKECH · CASABLANCA · RABAT`}
        </Txt>
      </ScrollView>
    </Screen>
  );
}

type RowProps = {
  icon: IconName;
  minHeight: number;
  /** Tappable rows get a chevron and a press highlight. */
  onPress?: () => void;
  children: ReactNode;
};

function Row({ icon, minHeight, onPress, children }: RowProps) {
  const rtl = useRtl();
  const content = (pressed: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    minHeight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: pressed ? colors.accent100 : 'transparent',
  });
  if (!onPress) {
    return (
      <View style={content(false)}>
        <Icon name={icon} color={colors.accent} />
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => content(pressed)}>
      <Icon name={icon} color={colors.accent} />
      {children}
      <Icon name={rtl ? 'chevL' : 'chevR'} size={15} color={colors.neutral500} />
    </Pressable>
  );
}

/** The design's custom notifications switch: 50×30 pill with a sliding knob. */
function PillSwitch({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <Pressable
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Toggle notifications"
      style={{
        direction: 'ltr',
        width: 50,
        height: 30,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: value ? colors.accent : colors.neutral400,
        backgroundColor: value ? colors.accent : 'transparent',
      }}>
      <View
        style={{
          position: 'absolute',
          top: 4,
          left: value ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: value ? colors.white : colors.neutral500,
        }}
      />
    </Pressable>
  );
}
