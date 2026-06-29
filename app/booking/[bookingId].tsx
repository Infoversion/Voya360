import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/booking';
import { VoyaCard } from '@/components/voya/VoyaCard';
import { useVoya } from '@/hooks/useVoya';
import { colors, fontSize, spacing } from '@/constants/design';

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const PNR_STORAGE_KEY = (id: string) => `voya360_pnr_${id}`;

export default function BookingConfirmedScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { observation, dismiss } = useVoya('post_booking');

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    // Try cache first (offline support)
    try {
      const cached = await AsyncStorage.getItem(PNR_STORAGE_KEY(bookingId as string));
      if (cached) setBooking(JSON.parse(cached));
    } catch {}

    // Fetch fresh from Supabase
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('duffel_order_id', bookingId)
      .single();

    if (data) {
      setBooking(data as Booking);
      // Cache for offline
      try {
        await AsyncStorage.setItem(PNR_STORAGE_KEY(bookingId as string), JSON.stringify(data));
      } catch {}
    }
    setLoading(false);
  };

  const onShare = async () => {
    if (!booking?.pnr) return;
    await Share.share({
      message: `My flight booking — PNR: ${booking.pnr}\n${booking.origin} → ${booking.destination}\nDeparture: ${fmtDateTime(booking.departure_at)}`,
    });
  };

  if (loading && !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Loading booking…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 40 }}>
        {/* Voya post-booking tip */}
        {observation && (
          <View style={{ marginHorizontal: -spacing.pagePadding, marginBottom: 8 }}>
            <VoyaCard observation={observation} onDismiss={dismiss} />
          </View>
        )}

        {/* Logo in top-right */}
        <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
          <Image source={require('@/assets/logo.png')} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
        </View>

        {/* Success header */}
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: `${colors.success}15`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 36 }}>✓</Text>
          </View>
          <Text style={{ fontSize: fontSize.header, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
            Booking confirmed
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' }}>
            Your e-ticket has been issued. Check your email for details.
          </Text>
        </View>

        {/* PNR */}
        <View style={{
          borderWidth: 2, borderColor: colors.accent,
          borderStyle: 'dashed', borderRadius: 14,
          padding: 24, alignItems: 'center', marginBottom: 20,
        }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 4 }}>
            Booking reference
          </Text>
          <Text style={{
            fontSize: fontSize.pnr, fontWeight: '900',
            color: colors.accent, letterSpacing: 6,
          }}>
            {booking?.pnr ?? '———'}
          </Text>
        </View>

        {/* Flight details */}
        {booking && (
          <View style={{
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
            padding: 16, marginBottom: 16,
          }}>
            <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 12 }}>
              FLIGHT DETAILS
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>
                  {booking.origin}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20 }}>→</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{booking.airline}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>
                  {booking.destination}
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Row label="Departure"    value={fmtDateTime(booking.departure_at)} />
              <Row label="Arrival"      value={fmtDateTime(booking.arrival_at)} />
              <Row label="Cabin"        value={booking.cabin_class ?? '—'} />
              <Row label="Passengers"   value={String(booking.passenger_count ?? 1)} />
            </View>
          </View>
        )}

        {/* Cost breakdown */}
        {booking && (
          <View style={{
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
            padding: 16, marginBottom: 24,
          }}>
            <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 12 }}>
              PAYMENT SUMMARY
            </Text>
            <View style={{ gap: 6 }}>
              <Row label="Base fare"    value={`$${booking.base_fare_usd?.toFixed(2) ?? '—'}`} />
              <Row label="Service fee"  value={`$${booking.service_fee_usd.toFixed(2)}`} />
              {(booking.baggage_fee_usd ?? 0) > 0 && (
                <Row label="Baggage"    value={`~$${booking.baggage_fee_usd.toFixed(2)}`} />
              )}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Total paid</Text>
                <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: colors.accent }}>
                  ${booking.total_usd?.toFixed(2) ?? '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          onPress={onShare}
          style={{
            borderWidth: 1.5, borderColor: colors.accent,
            borderRadius: 14, paddingVertical: 14,
            alignItems: 'center', marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>
            Share booking
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14, paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#fff' }}>
            Back to home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: fontSize.label, color: colors.text }}>{value}</Text>
    </View>
  );
}
