import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '@/store/search.store';
import { useAuthStore } from '@/store/auth.store';
import { AirportInput }    from './AirportInput';
import { DatePicker }      from './DatePicker';
import { PassengerStepper } from './PassengerStepper';
import { HowItWorksCard }  from './HowItWorksCard';
import { Button }          from '@/components/ui/Button';
import { getNearestAirport, getAirportByIata } from '@/constants/airports';
import { colors, fontSize, spacing } from '@/constants/design';
import type { CabinClass } from '@/types/booking';

const CABIN_OPTIONS: { value: CabinClass; label: string; icon: string; sub: string }[] = [
  { value: 'economy',         label: 'Economy',  icon: '💺', sub: 'Best value' },
  { value: 'premium_economy', label: 'Premium',  icon: '⭐', sub: 'Extra room' },
  { value: 'business',        label: 'Business', icon: '🥂', sub: 'Lie-flat'   },
  { value: 'first',           label: 'First',    icon: '👑', sub: 'All-incl.'  },
];

function CabinDropdown({ value, onChange }: { value: CabinClass; onChange: (v: CabinClass) => void }) {
  const [open, setOpen] = useState(false);
  const current = CABIN_OPTIONS.find(o => o.value === value)!;

  return (
    <View style={{ position: 'relative', zIndex: 50 }}>
      {/* Trigger pill */}
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: colors.accent, borderRadius: 12,
          paddingHorizontal: 9, paddingVertical: 7,
          shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }, elevation: 3,
        }}
      >
        <Text style={{ fontSize: 13 }}>{current.icon}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
          {current.label}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={11} color="#fff" />
      </TouchableOpacity>

      {/* Floating menu */}
      {open && (
        <View style={{
          position:        'absolute',
          top:             36,
          right:           0,
          minWidth:        160,
          backgroundColor: colors.background,
          borderRadius:    12,
          borderWidth:     1,
          borderColor:     colors.border,
          shadowColor:     '#000',
          shadowOpacity:   0.12,
          shadowRadius:    12,
          shadowOffset:    { width: 0, height: 4 },
          elevation:       10,
          overflow:        'hidden',
          zIndex:          50,
        }}>
          {CABIN_OPTIONS.map((opt, i) => {
            const active = value === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  flexDirection:   'row',
                  alignItems:      'center',
                  gap:             10,
                  paddingHorizontal: 14,
                  paddingVertical:  11,
                  backgroundColor: active ? `${colors.accent}10` : 'transparent',
                  borderTopWidth:  i > 0 ? 1 : 0,
                  borderTopColor:  colors.border,
                }}
              >
                <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: fontSize.label, fontWeight: active ? '700' : '500',
                    color: active ? colors.accent : colors.text,
                  }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{opt.sub}</Text>
                </View>
                {active && (
                  <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '700' }}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function SearchForm() {
  const {
    origin, destination, departureDate, returnDate,
    passengerCounts, cabinClass, isRoundTrip,
    setOrigin, setDestination, swapAirports,
    setDepartureDate, setReturnDate,
    setPassengerCounts, setCabinClass, setIsRoundTrip,
    search, isSearching,
  } = useSearchStore();
  const { profile } = useAuthStore();

  const savedCorridor = profile?.home_origin && profile?.home_destination
    ? { origin: profile.home_origin, destination: profile.home_destination }
    : null;

  const applySavedCorridor = () => {
    if (!savedCorridor) return;
    const o = getAirportByIata(savedCorridor.origin);
    const d = getAirportByIata(savedCorridor.destination);
    if (o) setOrigin(o);
    if (d) setDestination(d);
  };

  useEffect(() => {
    if (origin) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nearest = getNearestAirport(loc.coords.latitude, loc.coords.longitude);
      if (nearest) setOrigin(nearest);
    })();
  }, []);

  const totalPassengers = passengerCounts.adults + passengerCounts.children + passengerCounts.infants;
  const canSearch = !!origin && !!destination && !!departureDate
    && (!isRoundTrip || !!returnDate) && totalPassengers > 0;

  const handleSearch = async () => {
    if (!canSearch) return;
    await search();
    router.push('/search/results');
  };

  return (
    <View style={{ padding: spacing.pagePadding }}>

      {/* ── How it works (collapsible help) ─────────────────────────── */}
      <HowItWorksCard />

      {/* ── Row 1: compact trip-type toggle + cabin dropdown ─────────── */}
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', rowGap: 8,
        marginBottom: 14, zIndex: 40,
      }}>
        {/* One way / Round trip toggle */}
        <View style={{
          flexDirection: 'row', backgroundColor: '#F3F4F6',
          borderRadius: 12, padding: 3, gap: 2, flexShrink: 1,
        }}>
          {(['One way', 'Round trip'] as const).map((label, i) => {
            const rt     = i === 1;
            const active = isRoundTrip === rt;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setIsRoundTrip(rt)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9,
                  backgroundColor: active ? colors.accent : 'transparent',
                  shadowColor:    active ? colors.accent : 'transparent',
                  shadowOpacity:  active ? 0.3 : 0,
                  shadowRadius:   active ? 6 : 0,
                  shadowOffset:   { width: 0, height: 2 },
                  elevation:      active ? 3 : 0,
                }}
              >
                <Ionicons
                  name={rt ? 'repeat' : 'arrow-forward'}
                  size={12}
                  color={active ? '#fff' : colors.textMuted}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: active ? '700' : '500',
                  color: active ? '#fff' : colors.textMuted,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cabin class dropdown */}
        <CabinDropdown value={cabinClass} onChange={setCabinClass} />
      </View>

      {/* ── Airport inputs ────────────────────────────────────────────── */}
      <View style={{ position: 'relative', zIndex: 20 }}>
        <AirportInput
          label="From"
          value={origin}
          onChange={setOrigin}
          placeholder="Origin city or airport"
          rightAccessory={savedCorridor && (
            <TouchableOpacity
              onPress={applySavedCorridor}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                backgroundColor: `${colors.accent}12`,
              }}
            >
              <Ionicons name="home" size={11} color={colors.accent} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>
                {savedCorridor.origin} → {savedCorridor.destination}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Swap button — equal padding above and below keeps it centred in the gap */}
      <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 0, zIndex: 30 }}>
        <TouchableOpacity
          onPress={swapAirports}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.background,
            borderWidth: 1.5, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, color: colors.accent }}>⇅</Text>
        </TouchableOpacity>
      </View>

      <View style={{ position: 'relative', zIndex: 10, marginTop: -8 }}>
        <AirportInput label="To" value={destination} onChange={setDestination} placeholder="Destination city or airport" />
      </View>

      {/* ── Dates ────────────────────────────────────────────────────── */}
      <DatePicker
        isRoundTrip={isRoundTrip}
        departure={departureDate}
        returnDate={returnDate}
        onDeparture={setDepartureDate}
        onReturn={setReturnDate}
        destination={destination?.iata}
      />

      {/* ── Passengers (collapsible) ─────────────────────────────────── */}
      <View style={{ marginTop: 12, zIndex: 1 }}>
        <PassengerStepper value={passengerCounts} onChange={setPassengerCounts} />
      </View>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <View style={{ marginTop: 16 }}>
        <Button
          label="Search flights"
          icon="✈"
          iconColor="#1E3A8A"
          large
          onPress={handleSearch}
          loading={isSearching}
          disabled={!canSearch}
        />
      </View>

    </View>
  );
}
