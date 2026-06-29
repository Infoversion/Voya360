import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useBookingStore } from '@/store/booking.store';
import { useSearchStore } from '@/store/search.store';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { VoyaCard } from '@/components/voya/VoyaCard';
import { useVoya } from '@/hooks/useVoya';
import { getTotalDuration, formatDuration } from '@/engine/total-cost';
import { colors, fontSize, spacing } from '@/constants/design';

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ConfirmScreen() {
  const { selectedOffer, passengers, isCreatingIntent, isConfirming, error } = useBookingStore();
  const { bagCount } = useSearchStore();
  const { startPayment } = useBookingFlow();
  const { observation, dismiss } = useVoya('confirm');

  if (!selectedOffer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>No offer selected.</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent }}>Go home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const slice = selectedOffer.slices[0];
  const firstSeg = slice.segments[0];
  const lastSeg  = slice.segments[slice.segments.length - 1];
  const stops = slice.segments.length - 1;
  const loading = isCreatingIntent || isConfirming;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={{ fontSize: 22, color: loading ? colors.border : colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            Review & pay
          </Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            Step 3 of 3
          </Text>
        </View>
        <Image source={require('@/assets/logo.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 20 }}>
        {/* Voya booking validation insight */}
        {observation && (
          <View style={{ marginHorizontal: -spacing.pagePadding, marginBottom: 4 }}>
            <VoyaCard observation={observation} onDismiss={dismiss} />
          </View>
        )}

        {/* Flight summary */}
        <View style={{
          borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
          padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
            FLIGHT
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                {fmt(firstSeg.departing_at)}
              </Text>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                {slice.origin.iata_code} · {slice.origin.city_name}
              </Text>
            </View>
            <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{getTotalDuration(selectedOffer)}</Text>
              <Text style={{ fontSize: 11, color: stops === 0 ? colors.success : colors.textMuted }}>
                {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                {fmt(lastSeg.arriving_at)}
              </Text>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                {slice.destination.iata_code} · {slice.destination.city_name}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            {fmtDate(firstSeg.departing_at)} · {firstSeg.marketing_carrier.name} {firstSeg.flight_number}
          </Text>
        </View>

        {/* Passengers summary */}
        <View style={{
          borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
          padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
            PASSENGERS
          </Text>
          {passengers.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: fontSize.body, color: colors.text }}>
                {p.givenName} {p.familyName}
              </Text>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                Passport {p.passportCountry} {p.passportNumber.slice(-4).padStart(p.passportNumber.length, '·')}
              </Text>
            </View>
          ))}
        </View>

        {/* Error message */}
        {error && (
          <View style={{
            backgroundColor: '#FEF2F2', borderRadius: 10,
            padding: 12, marginBottom: 16,
          }}>
            <Text style={{ fontSize: fontSize.label, color: '#DC2626' }}>{error}</Text>
          </View>
        )}

        {/* Loading state */}
        {loading && (
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: 6 }}>
              {isCreatingIntent ? 'Preparing payment…' : 'Confirming booking…'}
            </Text>
          </View>
        )}
      </ScrollView>

      <PriceSummary
        offer={selectedOffer}
        bagCount={bagCount}
        label="Confirm & Pay"
        loading={loading}
        disabled={loading}
        onPress={startPayment}
      />
    </SafeAreaView>
  );
}
