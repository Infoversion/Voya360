import { Image, View, ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/constants/design';

function ProfileTabIcon({ color, size, avatarUrl }: { color: string | ColorValue; size: number; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <View style={{
        width: size + 2, height: size + 2, borderRadius: (size + 2) / 2,
        borderWidth: 1.5, borderColor: color, overflow: 'hidden',
      }}>
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }
  return <Ionicons name="person-outline" size={size} color={color} />;
}

export default function TabLayout() {
  const { profile } = useAuthStore();
  const avatarUrl   = profile?.avatar_url ?? null;

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle:             { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <ProfileTabIcon color={color} size={size} avatarUrl={avatarUrl} />
          ),
        }}
      />
    </Tabs>
  );
}
