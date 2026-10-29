import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getContactQueryDetail, updateQueryStatus, getAttachmentSignedUrl } from '@/hooks/useAdminContactQueries';
import { sendContactReply } from '@/lib/contact';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing } from '@/constants/design';
import { ContactQuery, ContactQueryStatus } from '@/types/booking';

const STATUSES: ContactQueryStatus[] = ['new', 'in_progress', 'resolved'];

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminContactQueryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [query, setQuery]         = useState<ContactQuery | null>(null);
  const [loading, setLoading]     = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await getContactQueryDetail(id);
    setQuery(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onStatusChange = async (status: ContactQueryStatus) => {
    if (!query) return;
    setQuery({ ...query, status });
    await updateQueryStatus(query.id, status);
  };

  const onOpenAttachment = async (path: string) => {
    const url = await getAttachmentSignedUrl(path);
    if (url) Linking.openURL(url);
    else Alert.alert('Could not open attachment', 'The file may have been removed.');
  };

  const onSendReply = async () => {
    if (!query || !replyText.trim()) return;
    setSending(true);
    try {
      await sendContactReply(query.id, replyText.trim());
      setReplyText('');
      await load();
    } catch (err) {
      Alert.alert('Could not send reply', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!query) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Query not found.</Text>
      </SafeAreaView>
    );
  }

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
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
          {query.subject}
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 40 }}>
        {/* Sender + status */}
        <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            {query.submitter_name || 'Unnamed traveler'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
            {query.submitter_email} · {fmtDateTime(query.created_at)}
          </Text>

          <Text style={{ fontSize: fontSize.label, color: colors.text, lineHeight: 20, marginBottom: 12 }}>
            {query.message}
          </Text>

          {(query.contact_query_attachments?.length ?? 0) > 0 && (
            <View style={{ gap: 6, marginBottom: 12 }}>
              {query.contact_query_attachments!.map(a => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => onOpenAttachment(a.storage_path)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 8,
                  }}
                >
                  <Ionicons name={a.content_type?.startsWith('image/') ? 'image-outline' : 'document-outline'} size={16} color={colors.accent} />
                  <Text style={{ fontSize: 12, color: colors.accent, flex: 1, fontWeight: '600' }} numberOfLines={1}>
                    {a.file_name}
                  </Text>
                  <Ionicons name="open-outline" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Status selector */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => onStatusChange(s)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: query.status === s ? colors.accent : colors.border,
                  backgroundColor: query.status === s ? `${colors.accent}15` : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: query.status === s ? colors.accent : colors.textMuted,
                  textTransform: 'capitalize',
                }}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reply thread */}
        {(query.contact_query_replies?.length ?? 0) > 0 && (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {query.contact_query_replies!.map(r => (
              <View key={r.id} style={{ backgroundColor: `${colors.accent}10`, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5, marginBottom: 4 }}>
                  YOU REPLIED · {fmtDateTime(r.created_at)}
                </Text>
                <Text style={{ fontSize: fontSize.label, color: colors.text, lineHeight: 19 }}>{r.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reply compose */}
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>
          Reply (sent from support@voya360.com)
        </Text>
        <TextInput
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Write your reply…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={{
            minHeight: 100,
            borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
            paddingHorizontal: 14, paddingVertical: 12,
            fontSize: fontSize.body, color: colors.text,
            backgroundColor: colors.background, marginBottom: 12,
          }}
        />
        <Button label="Send reply" icon="✉" onPress={onSendReply} loading={sending} disabled={!replyText.trim() || sending} />
      </ScrollView>
    </SafeAreaView>
  );
}
