import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/constants/design';

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.pagePadding }}>
        <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text }}>
          {firstName ? `Welcome back, ${firstName}` : 'Where to next?'}
        </Text>
        <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginTop: 8 }}>
          Flight search coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
