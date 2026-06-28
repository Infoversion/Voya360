import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing } from '@/constants/design';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }}>
        <Text
          style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text, marginBottom: 24 }}
        >
          Profile
        </Text>

        {profile && (
          <View style={{ marginBottom: 32 }}>
            <ProfileRow label="Name"        value={profile.full_name ?? '—'} />
            <ProfileRow label="Email"       value={profile.email} />
            <ProfileRow
              label="Home route"
              value={
                profile.home_origin && profile.home_destination
                  ? `${profile.home_origin} ↔ ${profile.home_destination}`
                  : 'Not set'
              }
            />
            <ProfileRow
              label="Default bags"
              value={`${profile.default_bag_count} checked bag${profile.default_bag_count !== 1 ? 's' : ''}`}
            />
            <ProfileRow label="Meal preference" value={profile.dietary_preference ?? 'Not set'} />
          </View>
        )}

        <Button label="Sign out" onPress={handleSignOut} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: fontSize.body, color: colors.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
