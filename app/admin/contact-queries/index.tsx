import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminContactQueries } from '@/hooks/useAdminContactQueries';
import { colors, fontSize, spacing } from '@/constants/design';
import { ContactQueryStatus } from '@/types/booking';

const FILTERS: Array<{ value: ContactQueryStatus | 'all'; label: string }> = [
  { value: 'all',         label: 'All' },
  { value: 'new',         label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved',    label: 'Resolved' },
];

const STATUS_COLOR: Record<ContactQueryStatus, { bg: string; text: string }> = {
  new:         { bg: '#DBEAFE', text: '#1E40AF' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  resolved:    { bg: '#D1FAE5', text: '#065F46' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminContactQueriesScreen() {
  const { queries, loading, refresh } = useAdminContactQueries();
  const [filter, setFilter] = useState<ContactQueryStatus | 'all'>('all');

  const filtered = useMemo(
    () => filter === 'all' ? queries : queries.filter(q => q.status === filter),
    [queries, filter],
  );

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Contact queries</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{queries.length} total</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/admin/settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.pagePadding, paddingVertical: 10, gap: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              borderWidth: 1.5,
              borderColor: filter === f.value ? colors.accent : colors.border,
              backgroundColor: filter === f.value ? `${colors.accent}15` : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.value ? colors.accent : colors.text }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.pagePadding, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>
            No queries here.
          </Text>
        ) : (
          filtered.map(q => {
            const s = STATUS_COLOR[q.status];
            const attachCount = q.contact_query_attachments?.length ?? 0;
            return (
              <TouchableOpacity
                key={q.id}
                onPress={() => router.push({ pathname: '/admin/contact-queries/[id]', params: { id: q.id } })}
                activeOpacity={0.75}
                style={{
                  borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
                  padding: 14, marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                    {q.subject}
                  </Text>
                  <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: s.text }}>
                      {q.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                  {q.submitter_name || q.submitter_email} · {fmtDate(q.created_at)}
                  {attachCount > 0 ? ` · 📎 ${attachCount}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
