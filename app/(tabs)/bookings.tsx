import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/constants/design';

export default function BookingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.pagePadding }}>
        <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text }}>
          Bookings
        </Text>
        <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginTop: 8 }}>
          Your confirmed tickets will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
