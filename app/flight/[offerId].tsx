import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { DuffelOffer, DuffelSegment } from '@/types/duffel';
import { useSearchStore }  from '@/store/search.store';
import { useBookingStore } from '@/store/booking.store';
import { getOffer, getSeatMaps, getAvailableServices, SeatMap, BaggageService } from '@/lib/duffel';
import { Button }          from '@/components/ui/Button';
import { AirlineLogo }    from '@/components/ui/AirlineLogo';
import { PageLogo }       from '@/components/ui/PageLogo';
import { SeatMapSelector } from '@/components/booking/SeatMapSelector';
import { VoyaCard }         from '@/components/voya/VoyaCard';
import { useVoya }         from '@/hooks/useVoya';
import { formatDuration, getIncludedCheckedBags, getFareType } from '@/engine/total-cost';
import { SERVICE_FEE_USD } from '@/types/booking';
import { colors, fontSize, spacing } from '@/constants/design';

const fmt     = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ── Timeline segment component ──────────────────────────────────────────────
function SegmentBlock({ seg, layoverMins, isLast }: {
  seg:          DuffelSegment;
  layoverMins:  number | null;
  isLast:       boolean;
}) {
  const cabinClass = seg.passengers?.[0]?.cabin_class ?? '';

  return (
    <View>
      {/* Departure row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 20, alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 }} />
          <View style={{ width: 2, backgroundColor: colors.border, flex: 1, minHeight: 20 }} />
        </View>
        <View style={{ flex: 1, paddingBottom: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 24 }}>
            {fmt(seg.departing_at)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {seg.origin.iata_code} · {seg.origin.city_name}
            </Text>
            {seg.origin_terminal && (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>
                  T{seg.origin_terminal}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{seg.origin.name}</Text>
        </View>
      </View>

      {/* Flight pill */}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
        <View style={{ width: 20, alignItems: 'center' }}>
          <View style={{ width: 2, backgroundColor: colors.border, flex: 1 }} />
        </View>
        <View style={{
          flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10,
          borderWidth: 1, borderColor: colors.border,
          padding: 10, marginVertical: 6,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AirlineLogo
                iataCode={seg.marketing_carrier.iata_code}
                logoUrl={seg.marketing_carrier.logo_symbol_url}
                size={28}
                radius={5}
              />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                {seg.marketing_carrier.name}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
              {seg.marketing_carrier.iata_code}{seg.marketing_carrier_flight_number}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              ⏱ {formatDuration(seg.duration)}
            </Text>
            {cabinClass && (
              <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' }}>
                ✦ {cabinClass.replace('_', ' ')}
              </Text>
            )}
            {seg.aircraft?.name && (
              <Text style={{ fontSize: 11, color: '#2563EB' }}>
                ✈ {seg.aircraft.name}
              </Text>
            )}
            {seg.operating_carrier?.iata_code !== seg.marketing_carrier?.iata_code && (
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Operated by {seg.operating_carrier.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Arrival row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 20, alignItems: 'center' }}>
          <View style={{ width: 2, backgroundColor: colors.border, height: 8 }} />
          <View style={{
            width: 12, height: 12, borderRadius: 6, marginTop: 2,
            backgroundColor: isLast ? colors.accent : colors.warning,
            borderWidth: isLast ? 0 : 2, borderColor: '#fff',
            shadowColor: colors.warning, shadowOpacity: isLast ? 0 : 0.4, shadowRadius: 4,
          }} />
          {!isLast && <View style={{ width: 2, backgroundColor: colors.border, flex: 1, minHeight: 8 }} />}
        </View>
        <View style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 24 }}>
            {fmt(seg.arriving_at)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {seg.destination.iata_code} · {seg.destination.city_name}
            </Text>
            {seg.destination_terminal && (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>
                  T{seg.destination_terminal}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{seg.destination.name}</Text>
        </View>
      </View>

      {/* Layover box */}
      {layoverMins !== null && (
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
          <View style={{ width: 20, alignItems: 'center' }}>
            <View style={{ width: 2, backgroundColor: colors.warning, flex: 1 }} />
          </View>
          <View style={{
            flex: 1, backgroundColor: '#FFF7ED',
            borderRadius: 10, borderWidth: 1.5, borderColor: '#FDE68A',
            padding: 10, marginVertical: 6,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>
              ⏳ Layover at {seg.destination.iata_code}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Duration</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warning }}>
                  {Math.floor(layoverMins / 60)}h {layoverMins % 60}m
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Arrives</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{fmt(seg.arriving_at)}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Departs</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  {/* next seg departing_at is rendered by parent, show the time here too */}
                  {fmt(seg.arriving_at)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function FlightReviewScreen() {
  const { offerId }       = useLocalSearchParams<{ offerId: string }>();
  const { offers }        = useSearchStore();
  const { setOffer, passengers, selectedSeats, setSeat, selectedServices, setSelectedServices } = useBookingStore();

  const [offer, setLocalOffer] = useState<DuffelOffer | null>(
    () => offers?.find(o => o.id === offerId) ?? null,
  );
  const [loading, setLoading]           = useState(!offer);
  const [error, setError]               = useState<string | null>(null);
  const [seatMaps, setSeatMaps]         = useState<SeatMap[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [baggageServices, setBaggageServices] = useState<BaggageService[]>([]);

  useEffect(() => {
    if (offer) { setOffer(offer); return; }
    getOffer(offerId as string)
      .then(o => { setLocalOffer(o); setOffer(o); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [offerId]);

  useEffect(() => {
    if (!offer) return;
    setLoadingSeats(true);
    getSeatMaps(offer.id)
      .then(setSeatMaps)
      .catch(() => setSeatMaps([]))
      .finally(() => setLoadingSeats(false));
    getAvailableServices(offer.id)
      .then(setBaggageServices)
      .catch(() => setBaggageServices([]));
  }, [offer?.id]);

  const { observation: voyaObs, dismiss: voyaDismiss } = useVoya('review');

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }
  if (error || !offer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.pagePadding }}>
        <Text style={{ fontSize: fontSize.body, color: '#DC2626', textAlign: 'center' }}>
          {error ?? 'Could not load flight details.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.accent }}>← Back to results</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isRoundTrip    = offer.slices.length > 1;
  const fareType       = getFareType(offer);
  const includedBags   = getIncludedCheckedBags(offer);
  const baseFare       = parseFloat(offer.base_amount ?? offer.total_amount);
  const taxAmount      = parseFloat(offer.tax_amount ?? '0');
  const servicesFee    = selectedServices.reduce((sum, sel) => {
    const svc = baggageServices.find(b => b.id === sel.id);
    return sum + (svc ? parseFloat(svc.total_amount) * sel.quantity : 0);
  }, 0);
  const totalAmount    = baseFare + taxAmount + SERVICE_FEE_USD + servicesFee;

  const bagTip = includedBags > 0
    ? {
        headline: `${includedBags} bag${includedBags > 1 ? 's' : ''} already included`,
        body: 'No extra baggage fees for this booking. You\'re all set — no need to pay at the airport.',
      }
    : baggageServices.length === 0
    ? {
        headline: 'Add bags at check-in if needed',
        body: 'Airline baggage fees at the airport are typically $50–100 per bag. Adding online in advance is usually cheaper.',
      }
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12, paddingRight: 72,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Review your trip</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Step 1 of 3 · Confirm details before paying</Text>
        </View>
        <PageLogo variant="nav" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Voya baggage insight */}
        {voyaObs && (
          <View style={{ paddingTop: 12, paddingHorizontal: spacing.pagePadding }}>
            <VoyaCard observation={voyaObs} onDismiss={voyaDismiss} />
          </View>
        )}

        {/* ── ITINERARY ── */}
        {offer.slices.map((slice, si) => {
          if (!slice?.segments?.length) return null;
          const firstSeg  = slice.segments[0];
          const lastSeg   = slice.segments[slice.segments.length - 1];
          const stops     = slice.segments.length - 1;
          const carrier   = firstSeg.marketing_carrier;
          const accentCol = si === 0 ? colors.accent : '#2563EB';

          return (
            <View key={slice.id} style={{
              marginHorizontal: spacing.pagePadding, marginTop: 16,
              backgroundColor: colors.background,
              borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
              overflow: 'hidden',
            }}>
              {/* Slice header */}
              <View style={{
                backgroundColor: si === 0 ? `${colors.accent}10` : '#EFF6FF',
                paddingHorizontal: 14, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: colors.border,
              }}>
                {/* Row 1: label + airline */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: accentCol, letterSpacing: 0.8 }}>
                      {isRoundTrip ? (si === 0 ? 'OUTBOUND' : 'RETURN') : 'FLIGHT'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                      {fmtDate(firstSeg.departing_at)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AirlineLogo
                      iataCode={carrier.iata_code}
                      logoUrl={carrier.logo_symbol_url}
                      size={28}
                      radius={6}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{carrier.name}</Text>
                  </View>
                </View>

                {/* Row 2: times + route */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>
                      {fmt(firstSeg.departing_at)}
                      <Text style={{ fontSize: 14, fontWeight: '400', color: colors.textMuted }}> → </Text>
                      {fmt(lastSeg.arriving_at)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {slice.origin.iata_code} → {slice.destination.iata_code}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                      {formatDuration(slice.duration)}
                    </Text>
                    <Text style={{ fontSize: 11, color: stops === 0 ? colors.success : colors.textMuted, marginTop: 2 }}>
                      {stops === 0 ? '✓ Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Timeline */}
              <View style={{ padding: 14 }}>
                {slice.segments.map((seg, i) => {
                  const isLastSeg   = i === slice.segments.length - 1;
                  const nextSeg     = isLastSeg ? null : slice.segments[i + 1];
                  const layoverMins = nextSeg
                    ? Math.round((new Date(nextSeg.departing_at).getTime() - new Date(seg.arriving_at).getTime()) / 60000)
                    : null;
                  return (
                    <SegmentBlock
                      key={seg.id}
                      seg={seg}
                      layoverMins={layoverMins}
                      isLast={isLastSeg}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* ── SEAT SELECTION ── */}
        <View style={{
          marginHorizontal: spacing.pagePadding, marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>SEAT SELECTION</Text>
          </View>
          <View style={{ padding: 14 }}>
            <SeatMapSelector
              seatMaps={seatMaps}
              passengers={passengers}
              selected={selectedSeats}
              duffelPassengerIds={(offer.passengers ?? []).map(p => p.id)}
              onSelect={setSeat}
              loading={loadingSeats}
            />
          </View>
        </View>

        {/* ── BAGGAGE ── */}
        {/* What's included from the offer */}
        <View style={{
          marginHorizontal: spacing.pagePadding, marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>WHAT'S INCLUDED</Text>
          </View>
          <View style={{ padding: 14 }}>
            {(() => {
              const seg     = offer.slices[0].segments[0];
              const pax     = seg.passengers[0];
              const checked = pax?.baggages.filter(b => b.type === 'checked') ?? [];
              const carryOn = pax?.baggages.filter(b => b.type === 'carry_on') ?? [];
              const chkQty  = checked.reduce((s, b) => s + b.quantity, 0);
              const coQty   = carryOn.reduce((s, b) => s + b.quantity, 0);
              return (
                <View style={{ backgroundColor: chkQty > 0 ? '#F0FDF4' : '#FFF7ED', borderRadius: 8, padding: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: chkQty > 0 ? colors.success : colors.warning }}>
                    {chkQty > 0 ? `✓ ${chkQty} checked bag${chkQty > 1 ? 's' : ''} included` : '✗ No checked bags included'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 3 }}>
                    {coQty > 0 ? `✓ ${coQty} carry-on included` : '✗ No carry-on included'}
                  </Text>
                  {(() => {
                    const firstBag = offer.slices[0].segments[0].passengers[0]?.baggages.find(b => b.type === 'checked');
                    return firstBag?.maximum_weight_kg ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                        Up to {firstBag.maximum_weight_kg}kg per bag
                      </Text>
                    ) : null;
                  })()}
                </View>
              );
            })()}
          </View>
        </View>

        {/* Extra baggage add-ons — real Duffel prices */}
        {baggageServices.length > 0 && (
          <View style={{
            marginHorizontal: spacing.pagePadding, marginTop: 8,
            backgroundColor: colors.background,
            borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
          }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>ADD EXTRA BAGS</Text>
            </View>
            <View style={{ padding: 14, gap: 8 }}>
              {baggageServices.map(svc => {
                const qty = selectedServices.find(s => s.id === svc.id)?.quantity ?? 0;
                const weightLabel = svc.metadata.maximum_weight_kg
                  ? ` · up to ${svc.metadata.maximum_weight_kg}kg` : '';
                const typeLabel = svc.metadata.type === 'checked' ? 'Checked bag' : 'Carry-on bag';
                return (
                  <View key={svc.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: qty > 0 ? `${colors.accent}08` : '#F9FAFB',
                    borderRadius: 10, borderWidth: 1,
                    borderColor: qty > 0 ? colors.accent : colors.border,
                    padding: 12,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                        {typeLabel}{weightLabel}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '700', marginTop: 2 }}>
                        +{svc.total_currency} {parseFloat(svc.total_amount).toFixed(2)} per bag
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const next = selectedServices.filter(s => s.id !== svc.id);
                          if (qty > 1) next.push({ id: svc.id, quantity: qty - 1 });
                          setSelectedServices(next);
                        }}
                        disabled={qty === 0}
                        style={{
                          width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: qty === 0 ? '#F3F4F6' : `${colors.accent}20`,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: '700', color: qty === 0 ? '#D1D5DB' : colors.accent }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, minWidth: 16, textAlign: 'center' }}>
                        {qty}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const next = selectedServices.filter(s => s.id !== svc.id);
                          if (qty < svc.maximum_quantity) next.push({ id: svc.id, quantity: qty + 1 });
                          setSelectedServices(next);
                        }}
                        disabled={qty >= svc.maximum_quantity}
                        style={{
                          width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: qty >= svc.maximum_quantity ? '#F3F4F6' : colors.accent,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: '700', color: qty >= svc.maximum_quantity ? '#D1D5DB' : '#fff' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {selectedServices.length > 0 && (
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>
                    ✓ Bags added to your booking — price included in total below
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Voya bag tip */}
        {bagTip && (
          <View style={{
            marginHorizontal: spacing.pagePadding, marginTop: 4,
            backgroundColor: '#FFF7ED', borderRadius: 10,
            borderLeftWidth: 3, borderLeftColor: colors.accent,
            padding: 12,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.5, marginBottom: 3 }}>
              VOYA · BAGGAGE TIP
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
              {bagTip.headline}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
              {bagTip.body}
            </Text>
          </View>
        )}

        {/* ── PRICE BREAKDOWN ── */}
        <View style={{
          marginHorizontal: spacing.pagePadding, marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>PRICE BREAKDOWN</Text>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                Base fare{isRoundTrip ? ' (outbound + return)' : ''}
              </Text>
              <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.text }}>
                ${baseFare.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Taxes & carrier fees</Text>
              <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.text }}>
                ${taxAmount.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Voya360 service fee</Text>
                <View style={{ backgroundColor: `${colors.accent}15`, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>FLAT</Text>
                </View>
              </View>
              <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.text }}>
                ${SERVICE_FEE_USD.toFixed(2)}
              </Text>
            </View>
            {selectedServices.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                  Extra baggage
                </Text>
                <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.warning }}>
                  +${servicesFee.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={{ height: 1.5, backgroundColor: colors.border, marginVertical: 2 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Total you pay</Text>
                <Text style={{ fontSize: 11, color: colors.success }}>✓ All taxes & carrier fees included</Text>
              </View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.accent }}>${Math.round(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* ── FARE CONDITIONS ── */}
        <View style={{
          marginHorizontal: spacing.pagePadding, marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
        }}>
          <View style={{
            paddingHorizontal: 14, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: colors.border,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>FARE CONDITIONS</Text>
            <View style={{ backgroundColor: fareType.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: fareType.color }}>{fareType.label}</Text>
            </View>
          </View>
          <View style={{ padding: 14, flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1, backgroundColor: fareType.refundable ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4, marginBottom: 4 }}>REFUNDABLE</Text>
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: fareType.refundable ? colors.success : '#DC2626' }}>
                {fareType.refundable ? '✓ Yes' : '✗ No'}
              </Text>
              {fareType.refundFee ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>${fareType.refundFee} penalty</Text>
              ) : fareType.refundable ? (
                <Text style={{ fontSize: 11, color: colors.success, marginTop: 3 }}>No penalty</Text>
              ) : null}
            </View>
            <View style={{ flex: 1, backgroundColor: fareType.changeable ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4, marginBottom: 4 }}>CHANGEABLE</Text>
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: fareType.changeable ? colors.success : '#DC2626' }}>
                {fareType.changeable ? '✓ Yes' : '✗ No'}
              </Text>
              {fareType.changeFee ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>${fareType.changeFee} penalty</Text>
              ) : fareType.changeable ? (
                <Text style={{ fontSize: 11, color: colors.success, marginTop: 3 }}>No penalty</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Offer expiry */}
        {offer.expires_at && (
          <View style={{
            marginHorizontal: spacing.pagePadding, marginTop: 12,
            backgroundColor: '#FFFBEB', borderRadius: 10,
            borderWidth: 1, borderColor: '#FDE68A',
            padding: 12, marginBottom: 8,
          }}>
            <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '600' }}>
              ⏳ Price held until {new Date(offer.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — book before it expires
            </Text>
          </View>
        )}
        <View style={{ paddingHorizontal: spacing.pagePadding, paddingTop: 16, paddingBottom: 8 }}>
          <Button label="Continue to passengers" large onPress={() => router.push('/booking/passengers')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
