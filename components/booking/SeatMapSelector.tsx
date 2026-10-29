import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeatMap, SeatElement } from '@/lib/duffel';
import { PassengerInput, SelectedSeat, SelectedSeats } from '@/store/booking.store';
import { colors, fontSize } from '@/constants/design';

interface Props {
  seatMaps:   SeatMap[];
  passengers: PassengerInput[];
  // key: `${segmentId}__${duffelPaxId}` → { serviceId, designator }
  selected:   SelectedSeats;
  // duffelPaxId is the Duffel offer passenger id (needed to find matching services)
  duffelPassengerIds: string[];
  onSelect:   (segmentId: string, passengerId: string, seat: SelectedSeat | null) => void;
  loading?:   boolean;
}

type SeatState = 'available' | 'taken' | 'selected' | 'extra' | 'blocked';

function getSeatState(
  el:          SeatElement,
  segmentId:   string,
  duffelPaxId: string,
  selected:    SelectedSeats,
): { state: SeatState; serviceId: string | null } {
  if (el.type !== 'seat' || !el.designator) return { state: 'blocked', serviceId: null };
  const key = `${segmentId}__${duffelPaxId}`;
  const svc = el.available_services?.find(s => s.passenger_id === duffelPaxId) ?? null;
  if (selected[key] && el.available_services?.some(s => s.id === selected[key].serviceId)) {
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
  selected: SelectedSeats;
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
      <View style={{ backgroundColor: '#F0F6FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE', padding: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 6 }}>
          Seat map not available yet
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 12 }}>
          This airline hasn't released seat maps for your flight yet — this is common and doesn't affect your booking.
        </Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 1,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Online check-in (24–48h before departure)</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 2 }}>
                Most airlines open seat selection on their app or website when check-in goes live.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 1,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Airport check-in counter</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 2 }}>
                Ask the agent for your preferred seat — window, aisle, or extra legroom — when you check in at the airport.
              </Text>
            </View>
          </View>
        </View>
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
  ).find(el => el.available_services?.some(sv => sv.id === selected[selectedKey]?.serviceId));

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
                        onPress={(serviceId, designator) =>
                          onSelect(segId, duffelId, serviceId ? { serviceId, designator } : null)
                        }
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

      {/* Seat summary — every passenger, every segment, regardless of active tab */}
      {passengers.length > 0 && (
        <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 }}>
            SEAT SUMMARY
          </Text>
          {passengers.map((p, i) => {
            const paxDuffelId = duffelPassengerIds[i] ?? '';
            const seats = seatMaps
              .map((m, mi) => {
                const s = selected[`${m.segment_id}__${paxDuffelId}`];
                return s ? { segIdx: mi, designator: s.designator } : null;
              })
              .filter((x): x is { segIdx: number; designator: string } => !!x);
            return (
              <View key={p.id} style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, width: 90 }}>
                  {p.givenName || `Passenger ${i + 1}`}
                </Text>
                <Text style={{
                  fontSize: 12, flex: 1,
                  color: seats.length ? colors.accent : colors.textMuted,
                  fontWeight: seats.length ? '700' : '400',
                }}>
                  {seats.length
                    ? seats.map(s => seatMaps.length > 1 ? `${s.designator} (Seg ${s.segIdx + 1})` : s.designator).join(', ')
                    : 'No seat selected'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
