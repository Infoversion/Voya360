import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { DuffelOffer, DuffelSlice } from '@/types/duffel';
import { calculateCost, formatDuration } from '@/engine/total-cost';
import { BaggageBadge } from './BaggageBadge';
import { SmartBadge }   from './SmartBadge';
import { TrendArrow }   from './TrendArrow';
import { colors, fontSize, spacing } from '@/constants/design';
import type { PriceTrend } from '@/engine/price-trends';

function AirlineLogo({ iataCode, logoUrl }: { iataCode: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: 26, height: 26, borderRadius: 5 }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={{
      width: 26, height: 26, borderRadius: 5,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>
        {(iataCode ?? '??').slice(0, 2)}
      </Text>
    </View>
  );
}

function fmt(time: string) {
  return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function SliceRow({ slice, label }: { slice: DuffelSlice; label?: string }) {
  const [expanded, setExpanded] = useState(false);

  const firstSeg = slice.segments[0];
  const lastSeg  = slice.segments[slice.segments.length - 1];
  const carrier  = firstSeg?.marketing_carrier;
  const stops    = slice.segments.length - 1;

  // Build stop details from intermediate segment boundaries
  const stopDetails = slice.segments.slice(0, -1).map((seg, i) => {
    const nextSeg     = slice.segments[i + 1];
    const layoverMins = Math.round(
      (new Date(nextSeg.departing_at).getTime() - new Date(seg.arriving_at).getTime()) / 60000,
    );
    return {
      iataCode:    seg.destination.iata_code,
      cityName:    seg.destination.city_name,
      arriveAt:    seg.arriving_at,
      departAt:    nextSeg.departing_at,
      layoverMins,
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
          <AirlineLogo iataCode={carrier?.iata_code ?? ''} logoUrl={carrier?.logo_symbol_url ?? null} />
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{carrier?.name ?? '—'}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>{firstSeg?.flight_number}</Text>
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
        <View style={{ alignItems: 'flex-start', width: 72 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{fmt(firstSeg?.departing_at ?? '')}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>{slice.origin.iata_code}</Text>
        </View>

        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
          <View style={{ height: 1, backgroundColor: colors.border, width: '100%' }} />
          {stops > 0 && (
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
          )}
        </View>

        <View style={{ alignItems: 'flex-end', width: 72 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{fmt(lastSeg?.arriving_at ?? '')}</Text>
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
                {stop.iataCode} · {stop.cityName}
              </Text>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 1 }}>Arrives</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{fmt(stop.arriveAt)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 1 }}>Departs</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{fmt(stop.departAt)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 1 }}>Layover</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warning }}>
                    {Math.floor(stop.layoverMins / 60)}h {stop.layoverMins % 60}m
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface Props {
  offer:               DuffelOffer;
  bagCount:            number;
  trend?:              PriceTrend;
  isCheapest?:         boolean;
  isFastest?:          boolean;
  isPreferredAirline?: boolean;
  isVayoPick?:         boolean;
  preferredAirlines?:  string[];
  avoidedAirports?:    string[];
  showSliceIndex?:     number;   // show only this slice (for two-step selection)
  onPress?:            () => void;
}

export function FlightCard({
  offer, bagCount, trend = 'stable',
  isCheapest, isFastest, isPreferredAirline, isVayoPick,
  preferredAirlines = [], avoidedAirports = [],
  showSliceIndex, onPress,
}: Props) {
  const cost        = calculateCost(offer, bagCount);
  const isRoundTrip = offer.slices.length > 1;

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
        padding:         16,
        shadowColor:     '#000',
        shadowOpacity:   0.05,
        shadowRadius:    8,
        shadowOffset:    { width: 0, height: 2 },
        elevation:       2,
      }}
    >
      {/* Smart badges */}
      {(isCheapest || isFastest || isPreferredAirline || isVayoPick) && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {isVayoPick         && <SmartBadge type="vayo_pick" />}
          {isCheapest         && <SmartBadge type="cheapest" />}
          {isFastest          && <SmartBadge type="fastest" />}
          {isPreferredAirline && <SmartBadge type="preferred_airline" />}
        </View>
      )}

      {/* Slices — either all (bundled) or just the selected one (stepwise) */}
      {slicesToShow.map((slice, i) => {
        const globalIndex = showSliceIndex !== undefined ? showSliceIndex : i;
        const sliceLabel = isRoundTrip && showSliceIndex === undefined
          ? (globalIndex === 0 ? 'OUTBOUND' : 'RETURN')
          : undefined;
        return (
          <View key={slice.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />}
            <SliceRow slice={slice} label={sliceLabel} />
          </View>
        );
      })}

      {/* Bottom row: bags + trend + price */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <View style={{ gap: 4 }}>
          <BaggageBadge bagsIncluded={cost.bagsIncluded} bagsNeeded={bagCount} />
          {trend !== 'stable' && <TrendArrow trend={trend} />}
          {hasAvoidedAirport && (
            <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>⚠ Avoid-list airport</Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: fontSize.price, fontWeight: '800', color: colors.accent }}>
            ${Math.round(cost.total)}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Total you pay · incl. all taxes</Text>
          {cost.baggageFee > 0 && (
            <Text style={{ fontSize: 11, color: colors.warning }}>incl. ~${cost.baggageFee} bags</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
