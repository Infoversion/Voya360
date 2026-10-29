import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize } from '@/constants/design';

// UI-level gate — RLS on the underlying tables is what actually enforces
// this server-side, so a non-admin poking at these routes directly still
// can't read or write anything an admin can.
export default function AdminLayout() {
  const { profile } = useAuthStore();

  if (!profile?.is_admin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
          Not authorized
        </Text>
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>
          This area is for Voya360 admins only.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>← Back to app</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
