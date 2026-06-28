import { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing } from '@/constants/design';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const canSubmit = fullName.trim().length > 0
    && email.trim().length > 0
    && password.length >= 8;

  const handleSignup = async () => {
    clearError();
    if (!canSubmit) return;
    await signUp(email.trim().toLowerCase(), password, fullName.trim());
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
            Create your account
          </Text>

          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />
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
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
            error={error ?? undefined}
          />
          {password.length > 0 && password.length < 8 && (
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: -8, marginBottom: 12 }}>
              At least 8 characters
            </Text>
          )}

          <View style={{ marginTop: 8 }}>
            <Button
              label="Create account"
              onPress={handleSignup}
              loading={isLoading}
              disabled={!canSubmit}
            />
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
              Already have an account?
            </Text>
            <Link href="/(auth)/login">
              <Text style={{ fontSize: fontSize.body, color: colors.accent, fontWeight: '600' }}>
                Sign in
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
