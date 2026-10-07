import { ScrollView, View } from 'react-native';

import { HeaderBar } from '@/components/header-bar';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { useT } from '@/store/app-store';
import { colors, radius } from '@/theme';

/**
 * Terms of service / Privacy policy. The legal text isn't written yet, so the page is clearly
 * marked as a placeholder rather than showing invented terms.
 */
export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = useT();
  return (
    <Screen>
      <HeaderBar title={kind === 'terms' ? t.termsT : t.privacyT} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: radius.md,
            backgroundColor: colors.saffron100,
          }}>
          <Icon name="edit" size={15} color={colors.accent700} />
          <Txt size={13} w={600} color={colors.accent800} style={{ flex: 1 }}>
            {t.legalDraft}
          </Txt>
        </View>
        <Txt color={colors.neutral700}>{t.legalBody}</Txt>
      </ScrollView>
    </Screen>
  );
}
