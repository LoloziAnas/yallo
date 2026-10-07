import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Txt } from '@/components/txt';
import { useApp, useT } from '@/store/app-store';
import { colors, radius } from '@/theme';

/** How long a connection may take before the banner appears (a normal connect never shows it). */
const SHOW_AFTER_MS = 1500;

/**
 * "Connecting to Yallo…" while the live feed isn't up yet: a free API host sleeps and takes about a
 * minute to wake. After WAKE_MS without a connection, Home shows its error state instead.
 */
export function ConnectingBanner() {
  const waiting = useApp((s) => !s.connected && !s.networkError);
  // Mounted fresh each time the wait starts, so its delay starts over.
  return waiting ? <Delayed /> : null;
}

function Delayed() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 14,
        marginHorizontal: 16,
        padding: 12,
        borderRadius: radius.md,
        backgroundColor: colors.saffron100,
      }}>
      <ActivityIndicator color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Txt w={600} size={14}>
          {t.connecting}
        </Txt>
        <Txt size={13} color={colors.neutral700}>
          {t.waking}
        </Txt>
      </View>
    </View>
  );
}
