import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '@/store/auth.store';
import { useContactQueries } from '@/hooks/useContactQueries';
import { submitContactQuery, uploadContactAttachment, UploadedAttachment } from '@/lib/contact';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageLogo } from '@/components/ui/PageLogo';
import { colors, fontSize, spacing } from '@/constants/design';
import { ContactQuery, ContactQueryStatus } from '@/types/booking';

const MAX_ATTACHMENTS = 3;

interface PickedFile {
  uri:         string;
  fileName:    string;
  contentType: string;
}

const STATUS_LABEL: Record<ContactQueryStatus, { label: string; bg: string; text: string }> = {
  new:         { label: 'New',         bg: '#DBEAFE', text: '#1E40AF' },
  in_progress: { label: 'In progress', bg: '#FEF3C7', text: '#92400E' },
  resolved:    { label: 'Resolved',    bg: '#D1FAE5', text: '#065F46' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function QueryHistoryCard({ q }: { q: ContactQuery }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_LABEL[q.status];
  const replies = q.contact_query_replies ?? [];

  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.7}
      style={{
        borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
        padding: 14, marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {q.subject}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{fmtDate(q.created_at)}</Text>
        </View>
        <View style={{ backgroundColor: status.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: status.text }}>{status.label}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </View>

      {expanded && (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 }}>
          <Text style={{ fontSize: fontSize.label, color: colors.text, lineHeight: 19 }}>{q.message}</Text>
          {(q.contact_query_attachments?.length ?? 0) > 0 && (
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              📎 {q.contact_query_attachments!.length} attachment{q.contact_query_attachments!.length > 1 ? 's' : ''}
            </Text>
          )}
          {replies.map(r => (
            <View key={r.id} style={{ backgroundColor: `${colors.accent}10`, borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5, marginBottom: 4 }}>
                VOYA360 SUPPORT · {fmtDate(r.created_at)}
              </Text>
              <Text style={{ fontSize: fontSize.label, color: colors.text, lineHeight: 19 }}>{r.message}</Text>
            </View>
          ))}
          {replies.length === 0 && (
            <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>
              No reply yet — we'll email you at {q.submitter_email}.
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ContactScreen() {
  const { profile } = useAuthStore();
  const { queries, loading: loadingHistory, refresh } = useContactQueries();

  const [subject,     setSubject]     = useState('');
  const [message,     setMessage]     = useState('');
  const [files,       setFiles]       = useState<PickedFile[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !submitting;

  const addFile = (f: PickedFile) => {
    if (files.length >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    setFiles(prev => [...prev, f]);
  };

  const removeFile = (uri: string) => setFiles(prev => prev.filter(f => f.uri !== uri));

  const pickAttachment = () => {
    Alert.alert('Add attachment', '', [
      { text: 'Take Photo', onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!r.canceled && r.assets[0]) {
          addFile({ uri: r.assets[0].uri, fileName: r.assets[0].fileName ?? `photo-${Date.now()}.jpg`, contentType: r.assets[0].mimeType ?? 'image/jpeg' });
        }
      }},
      { text: 'Choose Photo', onPress: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!r.canceled && r.assets[0]) {
          addFile({ uri: r.assets[0].uri, fileName: r.assets[0].fileName ?? `photo-${Date.now()}.jpg`, contentType: r.assets[0].mimeType ?? 'image/jpeg' });
        }
      }},
      { text: 'Choose Document', onPress: async () => {
        const r = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
        if (!r.canceled && r.assets[0]) {
          addFile({ uri: r.assets[0].uri, fileName: r.assets[0].name, contentType: r.assets[0].mimeType ?? 'application/octet-stream' });
        }
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onSubmit = async () => {
    if (!canSubmit || !profile) return;
    setSubmitting(true);
    try {
      const uploaded: UploadedAttachment[] = [];
      for (const f of files) {
        uploaded.push(await uploadContactAttachment(profile.id, f.uri, f.fileName, f.contentType));
      }
      await submitContactQuery({ subject: subject.trim(), message: message.trim(), attachments: uploaded });
      setSubject('');
      setMessage('');
      setFiles([]);
      setJustSubmitted(true);
      await refresh();
      setTimeout(() => setJustSubmitted(false), 4000);
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12, paddingRight: 72,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Contact us</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>We usually reply within a day</Text>
        </View>
        <PageLogo variant="nav" />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 40 }}
      >
        {justSubmitted && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: '#D1FAE5', borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
          }}>
            <Ionicons name="checkmark-circle" size={18} color="#065F46" />
            <Text style={{ fontSize: fontSize.label, color: '#065F46', flex: 1 }}>
              Thanks — we'll get back to you at {profile?.email}.
            </Text>
          </View>
        )}

        <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="What's this about?" />

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>
            Message
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what's going on — include a booking reference if relevant."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={{
              minHeight: 120,
              borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
              paddingHorizontal: 14, paddingVertical: 12,
              fontSize: fontSize.body, color: colors.text,
              backgroundColor: colors.background,
            }}
          />
        </View>

        {/* Attachments */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 6, fontWeight: '500' }}>
            Attachments ({files.length}/{MAX_ATTACHMENTS})
          </Text>
          {files.map(f => (
            <View key={f.uri} style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
            }}>
              <Ionicons name={f.contentType.startsWith('image/') ? 'image-outline' : 'document-outline'} size={16} color={colors.textMuted} />
              <Text style={{ fontSize: 12, color: colors.text, flex: 1 }} numberOfLines={1}>{f.fileName}</Text>
              <TouchableOpacity onPress={() => removeFile(f.uri)}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          {files.length < MAX_ATTACHMENTS && (
            <TouchableOpacity
              onPress={pickAttachment}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed',
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                justifyContent: 'center',
              }}
            >
              <Ionicons name="attach-outline" size={16} color={colors.accent} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>Add photo or document</Text>
            </TouchableOpacity>
          )}
        </View>

        <Button label="Send message" icon="✉" large onPress={onSubmit} loading={submitting} disabled={!canSubmit} />

        {/* Past queries */}
        {queries.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 10 }}>
              YOUR PAST MESSAGES
            </Text>
            {loadingHistory ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              queries.map(q => <QueryHistoryCard key={q.id} q={q} />)
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
