import { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing } from '@/constants/design';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    await signIn(email.trim().toLowerCase(), password);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.pagePadding }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.accent, marginBottom: 4 }}>
            Voya360
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginBottom: 40 }}>
            Sign in to your account
          </Text>

          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            error={error ?? undefined}
          />

          <View style={{ marginTop: 8 }}>
            <Button label="Sign in" onPress={handleLogin} loading={isLoading} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 24,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>
              No account?
            </Text>
            <Link href="/(auth)/signup">
              <Text style={{ fontSize: fontSize.body, color: colors.accent, fontWeight: '600' }}>
                Create one
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
