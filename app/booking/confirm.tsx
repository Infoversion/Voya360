import { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBookingStore } from '@/store/booking.store';
import { useSearchStore } from '@/store/search.store';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { VoyaCard } from '@/components/voya/VoyaCard';
import { useVoya } from '@/hooks/useVoya';
import { getTotalDuration, getFareType } from '@/engine/total-cost';
import { colors, fontSize, spacing } from '@/constants/design';

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function maskPassport(num: string) {
  if (!num || num.length < 4) return num;
  return '·'.repeat(num.length - 4) + num.slice(-4);
}

function CheckRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}
      activeOpacity={0.7}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? colors.success : colors.textMuted}
      />
      <Text style={{ fontSize: fontSize.label, color: checked ? colors.success : colors.textMuted, flex: 1, fontWeight: checked ? '600' : '400' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ConfirmScreen() {
  const { selectedOffer, passengers, isCreatingIntent, isConfirming, error } = useBookingStore();
  const { bagCount } = useSearchStore();
  const { startPayment } = useBookingFlow();
  const { observation, dismiss } = useVoya('confirm');

  const [flightChecked,     setFlightChecked]     = useState(false);
  const [passengersChecked, setPassengersChecked] = useState(false);
  const [checkError,        setCheckError]        = useState(false);

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

  const slice    = selectedOffer.slices[0];
  const firstSeg = slice.segments[0];
  const lastSeg  = slice.segments[slice.segments.length - 1];
  const stops    = slice.segments.length - 1;
  const fareType = getFareType(selectedOffer);
  const loading  = isCreatingIntent || isConfirming;
  const allChecked = flightChecked && passengersChecked;

  const handlePay = () => {
    if (!allChecked) {
      setCheckError(true);
      return;
    }
    setCheckError(false);
    startPayment();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: loading ? colors.border : colors.accent }}>←</Text>
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

        {/* Verification banner */}
        <View style={{
          backgroundColor: '#FFFBEB', borderRadius: 12,
          borderWidth: 1, borderColor: '#FDE68A',
          padding: 12, marginBottom: 16,
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        }}>
          <Ionicons name="warning-outline" size={18} color="#D97706" style={{ marginTop: 1 }} />
          <Text style={{ fontSize: fontSize.label, color: '#92400E', flex: 1, lineHeight: 20 }}>
            Please verify your flight details and passenger information carefully. Name errors and date mistakes cannot be corrected after the ticket is issued.
          </Text>
        </View>

        {/* Flight card */}
        <View style={{
          borderWidth: 1.5, borderColor: flightChecked ? colors.success : colors.border,
          borderRadius: 14, padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
            FLIGHT DETAILS
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
              <Text style={{ fontSize: 13, color: '#1E3A8A' }}>✈</Text>
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

          <View style={{ gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              {fmtDate(firstSeg.departing_at)}
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              {firstSeg.marketing_carrier.name} · {firstSeg.flight_number}
            </Text>
            {lastSeg.arriving_at.slice(0, 10) !== firstSeg.departing_at.slice(0, 10) && (
              <Text style={{ fontSize: fontSize.label, color: colors.warning, fontWeight: '600' }}>
                ⚠ Arrives {fmtDate(lastSeg.arriving_at)}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <View style={{ backgroundColor: fareType.refundable ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: fareType.refundable ? colors.success : '#DC2626' }}>
                {fareType.refundable ? '✓ Refundable' : '✗ Non-refundable'}
              </Text>
            </View>
            <View style={{ backgroundColor: fareType.changeable ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: fareType.changeable ? colors.success : '#DC2626' }}>
                {fareType.changeable ? '✓ Changeable' : '✗ No changes'}
              </Text>
            </View>
          </View>

          <CheckRow
            checked={flightChecked}
            onToggle={() => setFlightChecked(v => !v)}
            label="I have verified the flight date, time, and route"
          />
        </View>

        {/* Passengers card */}
        <View style={{
          borderWidth: 1.5, borderColor: passengersChecked ? colors.success : colors.border,
          borderRadius: 14, padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 12 }}>
            PASSENGER DETAILS
          </Text>

          {passengers.map((p, i) => (
            <View key={p.id} style={[
              { paddingBottom: 12 },
              i < passengers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 },
            ]}>
              {/* Name + type */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
                  {p.givenName} {p.familyName}
                </Text>
                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' }}>
                    {p.type === 'infant_without_seat' ? 'Infant' : p.type}
                  </Text>
                </View>
              </View>

              {/* Details grid */}
              <View style={{ gap: 5 }}>
                {p.dateOfBirth ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Date of birth</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>{p.dateOfBirth}</Text>
                  </View>
                ) : null}
                {p.gender ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Gender</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>
                      {p.gender === 'm' ? 'Male' : 'Female'}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Passport no.</Text>
                  <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600', letterSpacing: 1 }}>
                    {maskPassport(p.passportNumber)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Nationality</Text>
                  <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>{p.passportCountry}</Text>
                </View>
                {p.passportExpiry ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Passport expiry</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>{p.passportExpiry}</Text>
                  </View>
                ) : null}
                {p.dietary ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Meal preference</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600', textTransform: 'capitalize' }}>{p.dietary}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          <CheckRow
            checked={passengersChecked}
            onToggle={() => setPassengersChecked(v => !v)}
            label="I confirm all passenger names and passport details are correct"
          />
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

        {/* Inline error when user taps Pay without checking boxes */}
        {checkError && !allChecked && (
          <View style={{
            backgroundColor: '#FEF2F2', borderRadius: 10,
            padding: 12, marginBottom: 8,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={{ fontSize: fontSize.label, color: '#DC2626', flex: 1 }}>
              Please tick both checkboxes before paying
            </Text>
          </View>
        )}

        <PriceSummary
          offer={selectedOffer}
          bagCount={bagCount}
          label="Confirm & Pay"
          loading={loading}
          disabled={loading}
          onPress={handlePay}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
