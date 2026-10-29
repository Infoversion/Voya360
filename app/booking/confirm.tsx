import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useBookingStore } from '@/store/booking.store';
import { useSearchStore } from '@/store/search.store';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { SeatMapSelector } from '@/components/booking/SeatMapSelector';
import { getSeatMaps, SeatMap } from '@/lib/duffel';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import { VoyaCard } from '@/components/voya/VoyaCard';
import { useVoya } from '@/hooks/useVoya';
import { getFareType, getPassengerBaggageAllowance } from '@/engine/total-cost';
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
  const { selectedOffer, passengers, selectedSeats, setSeat, isCreatingIntent, isConfirming, error, updatePassenger } = useBookingStore();
  const { bagCount } = useSearchStore();
  const { startPayment } = useBookingFlow();
  const { observation, dismiss } = useVoya('confirm');

  const [seatMaps,      setSeatMaps]      = useState<SeatMap[]>([]);
  const [loadingSeats,  setLoadingSeats]  = useState(false);
  const [flightChecked,     setFlightChecked]     = useState(false);
  const [passengersChecked, setPassengersChecked] = useState(false);
  const [checkError,        setCheckError]        = useState(false);
  const [phoneError,        setPhoneError]        = useState<string | null>(null);

  useEffect(() => {
    if (!selectedOffer) return;
    setLoadingSeats(true);
    getSeatMaps(selectedOffer.id)
      .then(setSeatMaps)
      .catch(() => setSeatMaps([]))
      .finally(() => setLoadingSeats(false));
  }, [selectedOffer?.id]);

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

  const isRoundTrip = selectedOffer.slices.length > 1;
  const fareType    = getFareType(selectedOffer);
  const loading  = isCreatingIntent || isConfirming;
  const allChecked = flightChecked && passengersChecked;

  const handlePay = () => {
    if (!allChecked) {
      setCheckError(true);
      return;
    }
    setCheckError(false);

    // Only the primary (first) passenger's phone is collected — validate
    // and normalise it to E.164, then copy to everyone else so both the
    // summary below and the booking payload match.
    const primary  = passengers[0];
    const stripped = (primary?.phone ?? '').replace(/[^\d+]/g, '');
    const e164     = stripped.startsWith('+') ? stripped : `+${stripped}`;
    if (!/^\+[1-9]\d{10,14}$/.test(e164)) {
      setPhoneError(
        `${primary?.givenName || 'Primary passenger'}: phone number must include country code — e.g. +1 555 000 0000`
      );
      return;
    }
    setPhoneError(null);
    passengers.forEach((p, i) => {
      if (i === 0) {
        if (p.phone !== e164) updatePassenger(p.id, { phone: e164 });
      } else {
        updatePassenger(p.id, { phone: e164, email: primary?.email ?? p.email });
      }
    });
    startPayment();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12, paddingRight: 72,
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
        <Image source={require('@/assets/logo.png')} style={{ position: 'absolute', right: spacing.pagePadding, top: '50%', marginTop: -37, width: 74, height: 74 }} resizeMode="contain" />
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

        {/* Flight cards — one per slice */}
        <View style={{
          borderWidth: 1.5, borderColor: flightChecked ? colors.success : colors.border,
          borderRadius: 14, marginBottom: 16, overflow: 'hidden',
        }}>
          {selectedOffer.slices.map((slice, si) => {
            if (!slice?.segments?.length) return null;
            const firstSeg = slice.segments[0];
            const lastSeg  = slice.segments[slice.segments.length - 1];
            const stops    = slice.segments.length - 1;
            const carrier  = firstSeg.marketing_carrier;
            const accentCol = si === 0 ? colors.accent : '#2563EB';

            return (
              <View key={slice.id} style={si > 0 ? { borderTopWidth: 1.5, borderTopColor: colors.border } : undefined}>
                {/* Slice label */}
                <View style={{
                  backgroundColor: si === 0 ? `${colors.accent}10` : '#EFF6FF',
                  paddingHorizontal: 16, paddingVertical: 8,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: accentCol, letterSpacing: 0.8 }}>
                    {isRoundTrip ? (si === 0 ? 'OUTBOUND' : 'RETURN') : 'FLIGHT'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AirlineLogo iataCode={carrier.iata_code} logoUrl={carrier.logo_symbol_url} size={22} radius={4} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{carrier.name}</Text>
                  </View>
                </View>

                {/* Route + date/time */}
                <View style={{ padding: 16, paddingBottom: 12 }}>
                  {/* IATA codes with plane divider */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>
                      {slice.origin.iata_code}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                        <View style={{ flex: 1, height: 1.5, backgroundColor: colors.border }} />
                        <Text style={{ fontSize: 16, marginHorizontal: 6, color: accentCol }}>✈</Text>
                        <View style={{ flex: 1, height: 1.5, backgroundColor: colors.border }} />
                      </View>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 3 }}>
                        {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>
                      {slice.destination.iata_code}
                    </Text>
                  </View>

                  {/* City names + date/time below each */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{slice.origin.city_name}</Text>
                      <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                        {fmtDate(firstSeg.departing_at)}
                      </Text>
                      <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
                        {fmt(firstSeg.departing_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{slice.destination.city_name}</Text>
                      {(() => {
                        const depDay = new Date(firstSeg.departing_at.slice(0, 10)).getTime();
                        const arrDay = new Date(lastSeg.arriving_at.slice(0, 10)).getTime();
                        const diff   = Math.round((arrDay - depDay) / 86400000);
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
                              {fmtDate(lastSeg.arriving_at)}
                            </Text>
                            {diff > 0 && (
                              <View style={{ backgroundColor: colors.warning + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>
                                  +{diff} Day{diff > 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}
                      <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
                        {fmt(lastSeg.arriving_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Flight numbers + cabin class */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      {slice.segments.map(s => `${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number}`).join(' · ')}
                    </Text>
                    {(() => {
                      const cabin = firstSeg.passengers?.[0]?.cabin_class ?? null;
                      const label = cabin
                        ? cabin.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        : null;
                      return label ? (
                        <View style={{ backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{label}</Text>
                        </View>
                      ) : null;
                    })()}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Fare badges + checkbox — outside the slice loop, once at the bottom */}
          <View style={{ padding: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
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
              label={isRoundTrip ? 'I have verified both outbound and return flights' : 'I have verified the flight date, time, and route'}
            />
          </View>
        </View>

        {/* Passengers card */}
        <View style={{
          borderWidth: 1.5, borderColor: passengersChecked ? colors.success : colors.border,
          borderRadius: 14, padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 12 }}>
            PASSENGER DETAILS
          </Text>

          {passengers.map((p, i) => {
            const duffelPaxId = selectedOffer.passengers?.[i]?.id;
            const allowance   = duffelPaxId ? getPassengerBaggageAllowance(selectedOffer, duffelPaxId) : null;
            const segmentIds  = selectedOffer.slices.flatMap(sl => sl.segments.map(seg => seg.id));
            const seats       = duffelPaxId
              ? segmentIds.map(segId => selectedSeats[`${segId}__${duffelPaxId}`]?.designator).filter((d): d is string => !!d)
              : [];
            return (
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
                {p.passportNumber ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Passport no.</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600', letterSpacing: 1 }}>
                      {maskPassport(p.passportNumber)}
                    </Text>
                  </View>
                ) : null}
                {p.passportCountry ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Nationality</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>{p.passportCountry}</Text>
                  </View>
                ) : null}
                {p.passportExpiry ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Passport expiry</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>{p.passportExpiry}</Text>
                  </View>
                ) : null}
                {p.email ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Email</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600', flex: 1 }}>{p.email}</Text>
                  </View>
                ) : null}
                {p.phone ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Phone</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>{p.phone}</Text>
                  </View>
                ) : null}
                {allowance ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Checked bags</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600', flex: 1 }}>
                      {allowance.checkedCount > 0
                        ? `${allowance.checkedCount} free${allowance.checkedMaxWeightKg ? ` · up to ${allowance.checkedMaxWeightKg}kg each` : ''}`
                        : 'Not included in this fare'}
                    </Text>
                  </View>
                ) : null}
                {allowance ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Carry-on</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600', flex: 1 }}>
                      {allowance.carryOnCount > 0
                        ? `${allowance.carryOnCount} bag${allowance.carryOnCount > 1 ? 's' : ''}${allowance.carryOnMaxWeightKg ? ` · up to ${allowance.carryOnMaxWeightKg}kg each` : ''}`
                        : 'Not included in this fare'}
                    </Text>
                  </View>
                ) : null}
                {seats.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, width: 110 }}>Seat</Text>
                    <Text style={{ fontSize: fontSize.label, color: colors.accent, fontWeight: '700' }}>
                      {seats.join(', ')}
                    </Text>
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
            );
          })}

          <CheckRow
            checked={passengersChecked}
            onToggle={() => setPassengersChecked(v => !v)}
            label="I confirm all passenger names and passport details are correct"
          />
        </View>

        {/* Seat selection — placed after passengers so names populate the tabs */}
        <View style={{
          borderWidth: 1.5, borderColor: colors.border,
          borderRadius: 14, padding: 16, marginBottom: 16,
        }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 12 }}>
            SEAT SELECTION
          </Text>
          <SeatMapSelector
            seatMaps={seatMaps}
            passengers={passengers}
            selected={selectedSeats}
            duffelPassengerIds={(selectedOffer.passengers ?? []).map(p => p.id)}
            onSelect={setSeat}
            loading={loadingSeats}
          />
        </View>

        {/* Phone validation error */}
        {phoneError && (
          <View style={{
            backgroundColor: '#FEF2F2', borderRadius: 10,
            padding: 12, marginBottom: 12,
            flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          }}>
            <Ionicons name="call-outline" size={16} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: fontSize.label, color: '#DC2626', flex: 1 }}>{phoneError}</Text>
          </View>
        )}

        {/* Error message from booking flow */}
        {error && (
          <View style={{
            backgroundColor: '#FEF2F2', borderRadius: 10,
            padding: 12, marginBottom: 16, gap: 10,
          }}>
            <Text style={{ fontSize: fontSize.label, color: '#DC2626' }}>{error}</Text>
            {error.toLowerCase().includes('expired') && (
              <TouchableOpacity
                onPress={() => router.replace('/(tabs)')}
                style={{ backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.label }}>Search again</Text>
              </TouchableOpacity>
            )}
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
          disabled={loading || !allChecked}
          onPress={handlePay}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
