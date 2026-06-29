import { useState } from 'react';
import {
  View, Text, Image, KeyboardAvoidingView, Platform, ScrollView,
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
  const { signUp, isLoading, error, clearError, emailConfirmPending } = useAuthStore();

  const canSubmit = fullName.trim().length > 0
    && email.trim().length > 0
    && password.length >= 8;

  const handleSignup = async () => {
    clearError();
    if (!canSubmit) return;
    await signUp(email.trim().toLowerCase(), password, fullName.trim());
  };

  if (emailConfirmPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📧</Text>
        <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
          Check your email
        </Text>
        <Text style={{ fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24 }}>
          We sent a confirmation link to {email}. Tap it to activate your account, then come back to sign in.
        </Text>
      </SafeAreaView>
    );
  }

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
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Image
              source={require('@/assets/logo.png')}
              style={{ width: 130, height: 130 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: 10, letterSpacing: 0.2 }}>
              Book fast · Pay fair · Fly smarter
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginBottom: 28, textAlign: 'center' }}>
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
