import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { DuffelOffer, DuffelSegment } from '@/types/duffel';
import { useSearchStore }  from '@/store/search.store';
import { useBookingStore } from '@/store/booking.store';
import { getOffer }        from '@/lib/duffel';
import { PriceSummary }    from '@/components/booking/PriceSummary';
import { VoyaCard }        from '@/components/voya/VoyaCard';
import { useVoya }         from '@/hooks/useVoya';
import { formatDuration, getIncludedCheckedBags } from '@/engine/total-cost';
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {seg.origin.iata_code} · {seg.origin.city_name}
          </Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {seg.marketing_carrier.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {seg.flight_number}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              ⏱ {formatDuration(seg.duration)}
            </Text>
            {cabinClass && (
              <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' }}>
                ✦ {cabinClass.replace('_', ' ')}
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {seg.destination.iata_code} · {seg.destination.city_name}
          </Text>
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
  const { setOffer }      = useBookingStore();
  const { bagCount }      = useSearchStore();

  const [offer, setLocalOffer] = useState<DuffelOffer | null>(
    () => offers?.find(o => o.id === offerId) ?? null,
  );
  const [loading, setLoading]       = useState(!offer);
  const [error, setError]           = useState<string | null>(null);
  const [localBagCount, setLocalBagCount] = useState(bagCount);

  useEffect(() => {
    if (offer) { setOffer(offer); return; }
    getOffer(offerId as string)
      .then(o => { setLocalOffer(o); setOffer(o); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [offerId]);

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
  const refund         = offer.conditions?.refund_before_departure;
  const change         = offer.conditions?.change_before_departure;
  const includedBags   = getIncludedCheckedBags(offer);
  const extraBags      = Math.max(0, localBagCount - includedBags);
  const baggageFee     = extraBags * 65;
  const baseFare       = parseFloat(offer.base_amount ?? offer.total_amount);
  const taxAmount      = parseFloat(offer.tax_amount ?? '0');
  const totalAmount    = baseFare + taxAmount + SERVICE_FEE_USD + baggageFee;

  // Vayo baggage tip
  const bagTip = extraBags > 0
    ? {
        headline: 'Add bags now — it\'s cheaper',
        body: `Adding ${extraBags} bag${extraBags > 1 ? 's' : ''} online now is typically $20–40 cheaper per bag than paying at the airport. Airlines charge $50–100 per bag at check-in. Our estimate: $65/bag.`,
      }
    : includedBags > 0
    ? {
        headline: `${includedBags} bag${includedBags > 1 ? 's' : ''} already included`,
        body: 'No extra baggage fees for this booking. You\'re all set — no need to pay at the airport.',
      }
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Review your trip</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Step 1 of 3 · Confirm details before paying</Text>
        </View>
        <Image source={require('@/assets/logo.png')} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
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
          const firstSeg = slice.segments[0];
          const stops    = slice.segments.length - 1;

          return (
            <View key={slice.id} style={{
              marginHorizontal: spacing.pagePadding, marginTop: 16,
              backgroundColor: colors.background,
              borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
              overflow: 'hidden',
            }}>
              {/* Slice header */}
              <View style={{
                backgroundColor: isRoundTrip ? (si === 0 ? `${colors.accent}10` : '#EFF6FF') : `${colors.accent}10`,
                paddingHorizontal: 14, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: colors.border,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: si === 0 ? colors.accent : '#2563EB', letterSpacing: 0.8 }}>
                    {isRoundTrip ? (si === 0 ? 'OUTBOUND' : 'RETURN') : 'FLIGHT'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    {fmtDate(firstSeg.departing_at)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                    {slice.origin.iata_code} ✈ {slice.destination.iata_code}
                  </Text>
                  <Text style={{ fontSize: 11, color: stops === 0 ? colors.success : colors.textMuted }}>
                    {formatDuration(slice.duration)} · {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
                  </Text>
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

        {/* ── BAGGAGE ── */}
        <View style={{
          marginHorizontal: spacing.pagePadding, marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>BAGGAGE</Text>
          </View>
          <View style={{ padding: 14 }}>
            {/* What's included */}
            {(() => {
              const seg      = offer.slices[0].segments[0];
              const pax      = seg.passengers[0];
              const checked  = pax?.baggages.filter(b => b.type === 'checked') ?? [];
              const carryOn  = pax?.baggages.filter(b => b.type === 'carry_on') ?? [];
              const chkQty   = checked.reduce((s, b) => s + b.quantity, 0);
              const coQty    = carryOn.reduce((s, b) => s + b.quantity, 0);
              return (
                <View style={{
                  backgroundColor: chkQty > 0 ? '#F0FDF4' : '#FFF7ED',
                  borderRadius: 8, padding: 10, marginBottom: 14,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: chkQty > 0 ? colors.success : colors.warning }}>
                    {chkQty > 0 ? `✓ ${chkQty} checked bag${chkQty > 1 ? 's' : ''} included` : '✗ No checked bags included'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 3 }}>
                    {coQty > 0 ? `✓ ${coQty} carry-on included` : '✗ No carry-on included'}
                  </Text>
                </View>
              );
            })()}

            {/* Bag stepper */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Checked bags needed</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {includedBags > 0 ? `${includedBags} included · ` : ''}{extraBags > 0 ? `+${extraBags} at ~$65/bag` : 'No extra charge'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                <TouchableOpacity
                  onPress={() => setLocalBagCount(n => Math.max(0, n - 1))}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    borderWidth: 1.5, borderColor: localBagCount === 0 ? colors.border : colors.accent,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700', color: localBagCount === 0 ? colors.border : colors.accent, lineHeight: 24 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, width: 36, textAlign: 'center' }}>
                  {localBagCount}
                </Text>
                <TouchableOpacity
                  onPress={() => setLocalBagCount(n => Math.min(5, n + 1))}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    borderWidth: 1.5, borderColor: localBagCount === 5 ? colors.border : colors.accent,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700', color: localBagCount === 5 ? colors.border : colors.accent, lineHeight: 24 }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Vayo bag tip */}
            {bagTip && (
              <View style={{
                backgroundColor: '#FFF7ED', borderRadius: 10,
                borderLeftWidth: 3, borderLeftColor: colors.accent,
                padding: 12, marginTop: 4,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.5, marginBottom: 3 }}>
                  VAYO · BAGGAGE TIP
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                  {bagTip.headline}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
                  {bagTip.body}
                </Text>
              </View>
            )}
          </View>
        </View>

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
            {extraBags > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                  Added baggage · {extraBags} bag{extraBags > 1 ? 's' : ''} (est.)
                </Text>
                <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.warning }}>
                  ~${baggageFee.toFixed(2)}
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
            {extraBags > 0 && (
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                * Baggage fee is an estimate. Final price confirmed at booking.
              </Text>
            )}
          </View>
        </View>

        {/* ── FARE CONDITIONS ── */}
        <View style={{
          marginHorizontal: spacing.pagePadding, marginTop: 16,
          backgroundColor: colors.background,
          borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 }}>FARE CONDITIONS</Text>
          </View>
          <View style={{ padding: 14, flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Refundable</Text>
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: refund?.allowed ? colors.success : '#DC2626' }}>
                {refund?.allowed ? '✓ Yes' : '✗ No'}
              </Text>
              {refund?.penalty_amount && (
                <Text style={{ fontSize: 11, color: colors.textMuted }}>${refund.penalty_amount} fee</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>Changeable</Text>
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: change?.allowed ? colors.success : '#DC2626' }}>
                {change?.allowed ? '✓ Yes' : '✗ No'}
              </Text>
              {change?.penalty_amount && (
                <Text style={{ fontSize: 11, color: colors.textMuted }}>${change.penalty_amount} fee</Text>
              )}
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
      </ScrollView>

      <PriceSummary
        offer={offer}
        bagCount={localBagCount}
        label="Continue to passengers"
        onPress={() => router.push('/booking/passengers')}
      />
    </SafeAreaView>
  );
}
