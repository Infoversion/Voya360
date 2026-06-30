import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/booking';
import { colors, fontSize, spacing } from '@/constants/design';
import { PageLogo } from '@/components/ui/PageLogo';

function statusPill(status: Booking['status']) {
  const map: Record<string, { bg: string; text: string }> = {
    confirmed:        { bg: '#D1FAE5', text: '#065F46' },
    cancelled:        { bg: '#FEE2E2', text: '#991B1B' },
    return_cancelled: { bg: '#FEF3C7', text: '#92400E' },
    refunded:         { bg: '#F3F4F6', text: '#6B7280' },
  };
  return map[status] ?? map.refunded;
}

function BookingCard({ b }: { b: Booking }) {
  const pill = statusPill(b.status);
  const depDate = b.departure_at
    ? new Date(b.departure_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/booking/[bookingId]', params: { bookingId: b.duffel_order_id } })}
      activeOpacity={0.75}
      style={{
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Route + status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
          {b.origin ?? '?'} ✈ {b.destination ?? '?'}
        </Text>
        <View style={{ backgroundColor: pill.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: pill.text, textTransform: 'capitalize' }}>
            {b.status}
          </Text>
        </View>
      </View>

      {/* Date + cabin */}
      {depDate && (
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 2 }}>
          {depDate}
        </Text>
      )}
      {(b.airline || b.cabin_class) && (
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 10 }}>
          {[b.airline, b.cabin_class?.replace('_', ' ')].filter(Boolean).join(' · ')}
          {b.passenger_count ? ` · ${b.passenger_count} pax` : ''}
        </Text>
      )}

      {/* PNR + total */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0',
      }}>
        {b.pnr ? (
          <View>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>PNR</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: 1.5 }}>{b.pnr}</Text>
          </View>
        ) : (
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>—</Text>
        )}
        {b.total_usd != null && (
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>
            ${b.total_usd.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setBookings((data as Booking[]) ?? []);
          setLoading(false);
        });
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontSize: fontSize.header, fontWeight: '800', color: colors.text }}>My Trips</Text>
          <PageLogo variant="tab" />
        </View>

        {loading && (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
        )}

        {!loading && bookings.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48 }}>✈️</Text>
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginTop: 16 }}>
              No trips yet
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Book your first flight and your{'\n'}confirmed tickets will appear here.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={{
                marginTop: 24, backgroundColor: colors.accent,
                borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>Search flights</Text>
            </TouchableOpacity>
          </View>
        )}

        {bookings.map(b => <BookingCard key={b.id} b={b} />)}
      </ScrollView>
    </SafeAreaView>
  );
}
