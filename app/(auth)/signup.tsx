import { useState, useRef } from 'react';
import {
  View, Text, Image, KeyboardAvoidingView, Platform, ScrollView, TextInput,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing } from '@/constants/design';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const lastNameRef = useRef<TextInput>(null);
  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { signUp, isLoading, error, clearError, emailConfirmPending } = useAuthStore();

  const canSubmit = firstName.trim().length > 0
    && email.trim().length > 0
    && password.length >= 8;

  const handleSignup = async () => {
    clearError();
    if (!canSubmit) return;
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    await signUp(email.trim().toLowerCase(), password, fullName);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.pagePadding }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Image source={require('@/assets/logo.png')} style={{ width: 130, height: 130 }} resizeMode="contain" />
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: 10, letterSpacing: 0.2 }}>
              Book fast · Pay fair · Fly smarter
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginBottom: 28, textAlign: 'center' }}>
            Create your account
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                returnKeyType="next"
                ref={lastNameRef}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            ref={emailRef}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            ref={passwordRef}
            onSubmitEditing={handleSignup}
            error={error ?? undefined}
          />
          {password.length > 0 && password.length < 8 && (
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: -8, marginBottom: 12 }}>
              At least 8 characters
            </Text>
          )}

          <View style={{ marginTop: 8 }}>
            <Button label="Create account" onPress={handleSignup} loading={isLoading} disabled={!canSubmit} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 4 }}>
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Already have an account?</Text>
            <Link href="/(auth)/login">
              <Text style={{ fontSize: fontSize.body, color: colors.accent, fontWeight: '600' }}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
