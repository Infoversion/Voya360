import { View, Text, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { useState } from 'react';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DuffelOffer, DuffelSlice } from '@/types/duffel';
import { calculateCost, formatDuration, getFareType } from '@/engine/total-cost';
import { TrendArrow } from './TrendArrow';
import { colors, fontSize, spacing } from '@/constants/design';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import type { PriceTrend } from '@/engine/price-trends';

const SLICE_COLORS = ['#FFF8F0', '#EFF6FF']; // outbound: warm saffron tint · return: cool blue tint

function fmt(time: string) {
  return new Date(time)
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(/\s?(AM|PM)/i, (_, m) => m.toUpperCase());
}

function SliceRow({ slice, label, isReturn = false }: { slice: DuffelSlice; label?: string; isReturn?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const firstSeg   = slice.segments[0];
  const lastSeg    = slice.segments[slice.segments.length - 1];
  const carrier    = firstSeg?.marketing_carrier;
  const stops      = slice.segments.length - 1;
  const flightNums = slice.segments
    .map(s => `${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number}`)
    .join(' · ');

  // Build stop details from intermediate segment boundaries
  const stopDetails = slice.segments.slice(0, -1).map((seg, i) => {
    const nextSeg     = slice.segments[i + 1];
    const layoverMins = Math.round(
      (new Date(nextSeg.departing_at).getTime() - new Date(seg.arriving_at).getTime()) / 60000,
    );
    return {
      iataCode:          seg.destination.iata_code,
      cityName:          seg.destination.city_name,
      arriveAt:          seg.arriving_at,
      departAt:          nextSeg.departing_at,
      layoverMins,
      arrivalTerminal:   seg.destination_terminal ?? null,
      departureTerminal: nextSeg.origin_terminal ?? null,
      nextFlightNum:     `${nextSeg.marketing_carrier.iata_code}${nextSeg.marketing_carrier_flight_number}`,
      nextAircraft:      nextSeg.aircraft?.name ?? null,
    };
  });

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 0.5, marginBottom: 4 }}>
          {label}
        </Text>
      )}

      {/* Airline + duration */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AirlineLogo iataCode={carrier?.iata_code ?? ''} logoUrl={carrier?.logo_symbol_url} size={26} radius={5} />
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
              {carrier?.name ?? '—'}
            </Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>
              {flightNums}
              {firstSeg?.aircraft?.name ? ` · ${firstSeg.aircraft.name}` : ''}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
            {formatDuration(slice.duration)}
          </Text>
          <Text style={{ fontSize: 10, color: stops === 0 ? colors.success : colors.textMuted }}>
            {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {/* Time + route */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ alignItems: 'flex-start', width: 80 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{fmt(firstSeg?.departing_at ?? '')}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{slice.origin.iata_code}</Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 6 }}>
          {/* Route line with directional airplane */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{
              marginHorizontal: 6,
              fontSize: 16,
              color: '#1E3A8A',
              transform: isReturn ? [{ scaleX: -1 }] : [],
            }}>✈</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
          {stops > 0 && (
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setExpanded(e => !e)}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              >
                <Text style={{
                  fontSize: 10, fontWeight: '700', marginTop: 3,
                  color: colors.accent, textDecorationLine: 'underline',
                }}>
                  via {stopDetails.map(s => s.iataCode).join(', ')} {expanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', width: 80 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{fmt(lastSeg?.arriving_at ?? '')}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{slice.destination.iata_code}</Text>
        </View>
      </View>

      {/* Expanded stopover details */}
      {expanded && stopDetails.length > 0 && (
        <View style={{
          marginTop: 10,
          backgroundColor: '#F9FAFB',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 10,
        }}>
          {stopDetails.map((stop, i) => (
            <View key={`${stop.iataCode}-${i}`}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                  {stop.iataCode} · {stop.cityName}
                </Text>
                {stop.arrivalTerminal && (
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>T{stop.arrivalTerminal}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 1 }}>Arrives</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{fmt(stop.arriveAt)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 1 }}>Departs</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{fmt(stop.departAt)}</Text>
                    {stop.departureTerminal && (
                      <View style={{ backgroundColor: '#F3F4F6', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>T{stop.departureTerminal}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 1 }}>Layover</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warning }}>
                    {Math.floor(stop.layoverMins / 60)}h {stop.layoverMins % 60}m
                  </Text>
                </View>
              </View>
              {stop.nextFlightNum && (
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                  Next: {stop.nextFlightNum}{stop.nextAircraft ? ` · ${stop.nextAircraft}` : ''}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Fare type detail sheet ────────────────────────────────────────────────────
function FareTypeSheet({ offer, visible, onClose }: {
  offer:    DuffelOffer;
  visible:  boolean;
  onClose:  () => void;
}) {
  const ft          = getFareType(offer);
  const airlineName = offer.slices[0]?.segments[0]?.marketing_carrier?.name ?? 'This airline';

  const fmtFee = (amount: string | null) =>
    amount ? `$${parseFloat(amount).toFixed(0)} penalty fee applies` : 'No penalty fee';

  const summaries: Record<string, string> = {
    'Fully flexible': `You have maximum flexibility with this ticket. You can change your travel dates or request a full refund before departure — and ${airlineName} won't charge you a penalty for either.`,
    'Changeable':     `You can change your travel dates before departure${ft.changeFee ? `, but ${airlineName} will charge a $${parseFloat(ft.changeFee).toFixed(0)} change fee` : ` at no extra charge from ${airlineName}`}. However, this ticket is not refundable — you cannot get your money back if you cancel.`,
    'Refundable':     `You can cancel and get a refund before departure${ft.refundFee ? `, but ${airlineName} will deduct a $${parseFloat(ft.refundFee).toFixed(0)} cancellation fee` : ` with no penalty from ${airlineName}`}. However, you cannot change your travel dates.`,
    'Non-refundable': `This is a restricted fare. ${airlineName} does not allow changes or refunds before departure. If your plans change, you will lose the value of this ticket. This fare type is usually the cheapest option.`,
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: 36,
        }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginTop: 14, marginBottom: 20 }} />

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {/* Fare type badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={{ backgroundColor: ft.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: ft.color }}>{ft.label}</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>· {airlineName}</Text>
            </View>

            {/* Plain-language summary */}
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 20 }}>
              {summaries[ft.label]}
            </Text>

            {/* Change policy */}
            <View style={{
              backgroundColor: ft.changeable ? '#F0FDF4' : '#FEF2F2',
              borderRadius: 12, padding: 14, marginBottom: 10,
              borderLeftWidth: 3, borderLeftColor: ft.changeable ? '#16A34A' : '#DC2626',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 }}>
                DATE CHANGES
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: ft.changeable ? '#16A34A' : '#DC2626', marginBottom: 4 }}>
                {ft.changeable ? '✓ Allowed' : '✗ Not allowed'}
              </Text>
              {ft.changeable && (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {fmtFee(ft.changeFee)}
                </Text>
              )}
              {!ft.changeable && (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {airlineName} does not permit date or flight changes on this fare.
                </Text>
              )}
            </View>

            {/* Refund policy */}
            <View style={{
              backgroundColor: ft.refundable ? '#F0FDF4' : '#FEF2F2',
              borderRadius: 12, padding: 14,
              borderLeftWidth: 3, borderLeftColor: ft.refundable ? '#16A34A' : '#DC2626',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 }}>
                CANCELLATION & REFUND
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: ft.refundable ? '#16A34A' : '#DC2626', marginBottom: 4 }}>
                {ft.refundable ? '✓ Refundable' : '✗ Non-refundable'}
              </Text>
              {ft.refundable && (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {fmtFee(ft.refundFee)}
                </Text>
              )}
              {!ft.refundable && (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {airlineName} will not refund this ticket if you cancel.
                </Text>
              )}
            </View>

            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 14, lineHeight: 16 }}>
              * Policies shown are provided by {airlineName} via Duffel. Always review the airline's full conditions of carriage before booking.
            </Text>
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginHorizontal: 20, marginTop: 16,
              backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#fff' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface Props {
  offer:               DuffelOffer;
  bagCount:            number;
  trend?:              PriceTrend;
  isCheapest?:         boolean;
  isFastest?:          boolean;
  isPreferredAirline?: boolean;
  isVoyaPick?:         boolean;
  preferredAirlines?:  string[];
  avoidedAirports?:    string[];
  showSliceIndex?:     number;
  index?:              number;
  total?:              number;
  onPress?:            () => void;
}

export function FlightCard({
  offer, bagCount, trend = 'stable',
  isCheapest, isFastest, isPreferredAirline, isVoyaPick,
  preferredAirlines = [], avoidedAirports = [],
  showSliceIndex, index, total, onPress,
}: Props) {
  const cost          = calculateCost(offer, bagCount);
  const fareType      = getFareType(offer);
  const isRoundTrip   = offer.slices.length > 1;
  const [showFare, setShowFare] = useState(false);

  // Which slices to display: single slice (two-step mode) or all slices (bundled mode)
  const slicesToShow = showSliceIndex !== undefined
    ? offer.slices.filter((_, i) => i === showSliceIndex)
    : offer.slices;

  const hasAvoidedAirport = slicesToShow.some(sl =>
    sl.segments.some(s =>
      avoidedAirports.includes(s.origin.iata_code) ||
      avoidedAirports.includes(s.destination.iata_code),
    ),
  );

  const borderColor = isPreferredAirline ? '#7C3AED' : hasAvoidedAirport ? colors.warning : colors.border;

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.push({ pathname: '/flight/[offerId]', params: { offerId: offer.id } }))}
      style={{
        backgroundColor: colors.background,
        borderRadius:    14,
        borderWidth:     1.5,
        borderColor,
        marginHorizontal: spacing.pagePadding,
        marginBottom:    12,
        paddingHorizontal: 16,
        paddingTop:      12,
        paddingBottom:   8,
        shadowColor:     '#000',
        shadowOpacity:   0.05,
        shadowRadius:    8,
        shadowOffset:    { width: 0, height: 2 },
        elevation:       2,
      }}
    >
      {/* Compact icon strip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {/* Left: counter */}
        {index !== undefined && total !== undefined && (
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, marginRight: 8 }}>
            {index + 1}/{total}
          </Text>
        )}

        {/* Icon row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {isCheapest && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="pricetag-outline" size={14} color={colors.success} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>Cheapest</Text>
            </View>
          )}
          {isFastest && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="flash-outline" size={14} color="#2563EB" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563EB' }}>Fastest</Text>
            </View>
          )}
          {isVoyaPick && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="sparkles-outline" size={14} color="#9333EA" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9333EA' }}>Voya pick</Text>
            </View>
          )}
          {isPreferredAirline && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="star-outline" size={14} color="#7C3AED" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED' }}>Your airline</Text>
            </View>
          )}
        </View>

        {/* Right: baggage + fare type icons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Baggage icon */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="briefcase-outline" size={14} color={cost.bagsIncluded > 0 ? colors.success : colors.warning} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: cost.bagsIncluded > 0 ? colors.success : colors.warning }}>
              {cost.bagsIncluded > 0 ? `${cost.bagsIncluded}✓` : '✗'}
            </Text>
          </View>
          {/* Fare type icon — tappable to open detail sheet */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); setShowFare(true); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={fareType.refundable && fareType.changeable
                ? 'shield-checkmark-outline'
                : fareType.refundable
                ? 'refresh-outline'
                : fareType.changeable
                ? 'swap-horizontal-outline'
                : 'close-circle-outline'}
              size={14}
              color={fareType.color}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Slices — either all (bundled) or just the selected one (stepwise) */}
      {slicesToShow.map((slice, i) => {
        const globalIndex = showSliceIndex !== undefined ? showSliceIndex : i;
        const sliceLabel = isRoundTrip
          ? (globalIndex === 0 ? 'OUTBOUND' : 'RETURN')
          : undefined;
        const sliceBg = SLICE_COLORS[globalIndex] ?? SLICE_COLORS[0];
        return (
          <View key={slice.id}>
            {i > 0 && <View style={{ height: 10 }} />}
            <View style={{ backgroundColor: sliceBg, borderRadius: 10, padding: 12 }}>
              <SliceRow slice={slice} label={sliceLabel} isReturn={globalIndex === 1} />
            </View>
          </View>
        );
      })}

      {/* Bottom row: label left, price right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Total you pay</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>incl. of all taxes and fees</Text>
        </View>
        <Text style={{ fontSize: 36, fontWeight: '800', color: colors.accent }}>
          ${Math.round(cost.total)}
        </Text>
      </View>

      {/* Trend arrow + avoided airport warning */}
      {(trend !== 'stable' || hasAvoidedAirport) && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
          {trend !== 'stable' && <TrendArrow trend={trend} />}
          {hasAvoidedAirport && (
            <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>⚠ Avoid-list airport</Text>
          )}
        </View>
      )}
      <FareTypeSheet offer={offer} visible={showFare} onClose={() => setShowFare(false)} />
    </TouchableOpacity>
  );
}
