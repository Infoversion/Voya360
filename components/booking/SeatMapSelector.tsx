import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeatMap, SeatElement } from '@/lib/duffel';
import { PassengerInput } from '@/store/booking.store';
import { colors, fontSize } from '@/constants/design';

interface Props {
  seatMaps:   SeatMap[];
  passengers: PassengerInput[];
  // key: `${segmentId}__${duffelPaxId}` → serviceId
  selected:   Record<string, string>;
  // duffelPaxId is the Duffel offer passenger id (needed to find matching services)
  duffelPassengerIds: string[];
  onSelect:   (segmentId: string, passengerId: string, serviceId: string | null) => void;
  loading?:   boolean;
}

type SeatState = 'available' | 'taken' | 'selected' | 'extra' | 'blocked';

function getSeatState(
  el:          SeatElement,
  segmentId:   string,
  duffelPaxId: string,
  selected:    Record<string, string>,
): { state: SeatState; serviceId: string | null } {
  if (el.type !== 'seat' || !el.designator) return { state: 'blocked', serviceId: null };
  const key = `${segmentId}__${duffelPaxId}`;
  const svc = el.available_services?.find(s => s.passenger_id === duffelPaxId) ?? null;
  if (selected[key] && el.available_services?.some(s => s.id === selected[key])) {
    return { state: 'selected', serviceId: svc?.id ?? null };
  }
  if (!svc) return { state: 'taken', serviceId: null };
  const isExtra = el.disclosures?.some(d => /extra|legroom|window/i.test(d));
  return { state: isExtra ? 'extra' : 'available', serviceId: svc.id };
}

const STATE_COLOR: Record<SeatState, { bg: string; border: string; text: string }> = {
  available: { bg: '#F0FDF4', border: '#16A34A', text: '#15803D' },
  taken:     { bg: '#F3F4F6', border: '#D1D5DB', text: '#9CA3AF' },
  selected:  { bg: '#E8751A', border: '#E8751A', text: '#fff'    },
  extra:     { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  blocked:   { bg: 'transparent', border: 'transparent', text: 'transparent' },
};

function SeatButton({
  el, segmentId, duffelPaxId, selected, onPress,
}: {
  el: SeatElement; segmentId: string; duffelPaxId: string;
  selected: Record<string, string>;
  onPress: (serviceId: string | null, designator: string) => void;
}) {
  const { state, serviceId } = getSeatState(el, segmentId, duffelPaxId, selected);
  const c = STATE_COLOR[state];
  if (state === 'blocked') {
    return <View style={{ width: 32, height: 32, margin: 2 }} />;
  }
  return (
    <TouchableOpacity
      onPress={() => state !== 'taken' && onPress(serviceId, el.designator ?? '')}
      disabled={state === 'taken'}
      style={{
        width: 32, height: 32, margin: 2,
        borderRadius: 6, borderWidth: 1.5,
        backgroundColor: c.bg, borderColor: c.border,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: '700', color: c.text }}>
        {el.designator}
      </Text>
    </TouchableOpacity>
  );
}

export function SeatMapSelector({ seatMaps, passengers, selected, duffelPassengerIds, onSelect, loading }: Props) {
  const [activePaxIdx, setActivePaxIdx] = useState(0);
  const [activeMapIdx, setActiveMapIdx] = useState(0);

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>Loading seat map…</Text>
      </View>
    );
  }

  if (!seatMaps.length) {
    return (
      <View style={{ padding: 16, backgroundColor: '#F9FAFB', borderRadius: 10 }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          Seat selection not available for this flight.
        </Text>
      </View>
    );
  }

  const map       = seatMaps[activeMapIdx];
  const cabin     = map?.cabins?.[0]; // economy (first cabin)
  if (!cabin) return null;

  const pax       = passengers[activePaxIdx];
  const duffelId  = duffelPassengerIds[activePaxIdx] ?? '';
  const segId     = map.segment_id;

  const selectedKey = `${segId}__${duffelId}`;
  const currentSeat = cabin.rows.flatMap(r =>
    r.sections.flatMap(s => s.elements)
  ).find(el => el.available_services?.some(sv => sv.id === selected[selectedKey]));

  return (
    <View>
      {/* Passenger tabs */}
      {passengers.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {passengers.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setActivePaxIdx(i)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: activePaxIdx === i ? colors.accent : colors.border,
                  backgroundColor: activePaxIdx === i ? `${colors.accent}15` : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: activePaxIdx === i ? colors.accent : colors.text }}>
                  {p.givenName || `Pax ${i + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Segment tabs */}
      {seatMaps.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {seatMaps.map((m, i) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setActiveMapIdx(i)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: activeMapIdx === i ? '#2563EB' : colors.border,
                  backgroundColor: activeMapIdx === i ? '#EFF6FF' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: activeMapIdx === i ? '#2563EB' : colors.text }}>
                  Segment {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Selected seat indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Ionicons name="airplane-outline" size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
          {currentSeat?.designator
            ? `${pax?.givenName || 'Passenger'}: Seat ${currentSeat.designator} selected`
            : `${pax?.givenName || 'Passenger'}: no seat selected`}
        </Text>
        {currentSeat && (
          <TouchableOpacity onPress={() => onSelect(segId, duffelId, null)}>
            <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cabin class label */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 6 }}>
        {cabin.cabin_class.replace(/_/g, ' ').toUpperCase()}
      </Text>

      {/* Seat grid */}
      <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
        {cabin.rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            {row.sections.map((section, si) => (
              <View key={si} style={{ flexDirection: 'row' }}>
                {section.elements.map((el, ei) => {
                  if (el.type === 'seat' || el.type === 'empty') {
                    return (
                      <SeatButton
                        key={ei}
                        el={el}
                        segmentId={segId}
                        duffelPaxId={duffelId}
                        selected={selected}
                        onPress={(serviceId) => onSelect(segId, duffelId, serviceId)}
                      />
                    );
                  }
                  // aisle gap
                  return <View key={ei} style={{ width: 12 }} />;
                })}
                {/* Gap between sections */}
                {si < row.sections.length - 1 && <View style={{ width: 10 }} />}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {[
          { state: 'available' as SeatState, label: 'Available' },
          { state: 'extra'     as SeatState, label: 'Extra legroom' },
          { state: 'selected'  as SeatState, label: 'Selected' },
          { state: 'taken'     as SeatState, label: 'Taken' },
        ].map(({ state, label }) => (
          <View key={state} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 14, height: 14, borderRadius: 3,
              backgroundColor: STATE_COLOR[state].bg,
              borderWidth: 1.5, borderColor: STATE_COLOR[state].border,
            }} />
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
