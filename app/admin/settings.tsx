import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing } from '@/constants/design';

const NOTIFY_EMAIL_KEY = 'contact_notification_email';

export default function AdminSettingsScreen() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', NOTIFY_EMAIL_KEY)
        .maybeSingle();
      setEmail(data?.value ?? '');
      setLoading(false);
    })();
  }, []);

  const onSave = async () => {
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({ value: email.trim() })
      .eq('key', NOTIFY_EMAIL_KEY);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
    } else {
      Alert.alert('Saved', 'New contact queries will now notify this address.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Admin settings</Text>
      </View>

      <View style={{ padding: spacing.pagePadding }}>
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>
          Contact query notification email
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 17 }}>
          Every new contact query sends a notification here.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="support@infoversion.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                height: spacing.touchTarget,
                borderRadius: 8, borderWidth: 1.5, borderColor: colors.border,
                paddingHorizontal: 14, fontSize: fontSize.body, color: colors.text,
                backgroundColor: colors.background, marginBottom: 16,
              }}
            />
            <Button label="Save" onPress={onSave} loading={saving} disabled={saving} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
