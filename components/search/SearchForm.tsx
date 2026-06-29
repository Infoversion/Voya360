import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useSearchStore } from '@/store/search.store';
import { AirportInput }    from './AirportInput';
import { DatePicker }      from './DatePicker';
import { PassengerStepper } from './PassengerStepper';
import { Button }          from '@/components/ui/Button';
import { getNearestAirport } from '@/constants/airports';
import { colors, fontSize, spacing } from '@/constants/design';
import type { CabinClass } from '@/types/booking';

const CABIN_OPTIONS: { value: CabinClass; label: string; icon: string; sub: string }[] = [
  { value: 'economy',         label: 'Economy',  icon: '💺', sub: 'Best value' },
  { value: 'premium_economy', label: 'Premium',  icon: '⭐', sub: 'Extra room' },
  { value: 'business',        label: 'Business', icon: '🥂', sub: 'Lie-flat' },
  { value: 'first',           label: 'First',    icon: '👑', sub: 'All-incl.' },
];

const PAD = 4; // inner padding of the track

function CabinSelector({ value, onChange }: { value: CabinClass; onChange: (v: CabinClass) => void }) {
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);

  const activeIndex = CABIN_OPTIONS.findIndex(o => o.value === value);
  const itemW = trackW > 0 ? (trackW - PAD * 2) / CABIN_OPTIONS.length : 0;

  useEffect(() => {
    if (!itemW) return;
    Animated.spring(slideAnim, {
      toValue: activeIndex * itemW,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
      mass: 0.7,
    }).start();
  }, [activeIndex, itemW]);

  return (
    <View>
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 8, fontWeight: '500' }}>
        Cabin class
      </Text>

      {/* Track */}
      <View
        style={{
          backgroundColor: '#F0F0F0',
          borderRadius: 16,
          padding: PAD,
        }}
        onLayout={e => setTrackW(e.nativeEvent.layout.width)}
      >
        {/* Sliding pill */}
        {itemW > 0 && (
          <Animated.View
            style={{
              position: 'absolute',
              top: PAD, bottom: PAD,
              left: PAD,
              width: itemW,
              borderRadius: 12,
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOpacity: 0.10,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
              transform: [{ translateX: slideAnim }],
            }}
          />
        )}

        {/* Option buttons */}
        <View style={{ flexDirection: 'row' }}>
          {CABIN_OPTIONS.map((opt) => {
            const isActive = value === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onChange(opt.value)}
                activeOpacity={0.7}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 }}
              >
                <Text style={{ fontSize: 20, lineHeight: 26 }}>{opt.icon}</Text>
                <Text style={{
                  fontSize: 10,
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? colors.accent : colors.textMuted,
                  letterSpacing: 0.1,
                }}>
                  {opt.label}
                </Text>
                <Text style={{
                  fontSize: 9,
                  color: isActive ? `${colors.accent}99` : '#BBBBBF',
                  fontWeight: '500',
                }}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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

  // Pre-populate "From" with nearest airport on first render if origin not set
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
      {/* Trip type toggle */}
      <View style={{
        flexDirection: 'row', backgroundColor: '#F3F4F6',
        borderRadius: 10, padding: 3, marginBottom: 16, alignSelf: 'flex-start',
      }}>
        {(['One way', 'Round trip'] as const).map((label, i) => {
          const rt = i === 1;
          const active = isRoundTrip === rt;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => setIsRoundTrip(rt)}
              style={{
                paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
                backgroundColor: active ? colors.background : 'transparent',
                shadowColor: active ? '#000' : 'transparent',
                shadowOpacity: active ? 0.08 : 0,
                shadowRadius: active ? 4 : 0,
                shadowOffset: { width: 0, height: 1 },
                elevation: active ? 2 : 0,
              }}
            >
              <Text style={{ fontSize: fontSize.label, fontWeight: active ? '700' : '400', color: active ? colors.text : colors.textMuted }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Airport inputs */}
      <View style={{ position: 'relative', zIndex: 20 }}>
        <AirportInput label="From" value={origin} onChange={setOrigin} placeholder="Origin city or airport" />
      </View>

      {/* Swap button */}
      <View style={{ alignItems: 'center', marginVertical: -4, zIndex: 10 }}>
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

      <View style={{ position: 'relative', zIndex: 10, marginTop: 4 }}>
        <AirportInput label="To" value={destination} onChange={setDestination} placeholder="Destination city or airport" />
      </View>

      {/* Dates */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, zIndex: 1 }}>
        <DatePicker
          label="Departure"
          value={departureDate}
          onChange={setDepartureDate}
          destination={destination?.iata}
        />
        {isRoundTrip && (
          <DatePicker
            label="Return"
            value={returnDate}
            onChange={setReturnDate}
            minDate={departureDate ? new Date(departureDate + 'T00:00:00') : undefined}
            destination={destination?.iata}
            rangeStart={departureDate ?? undefined}
          />
        )}
      </View>

      {/* Passengers */}
      <View style={{ marginTop: 12 }}>
        <PassengerStepper value={passengerCounts} onChange={setPassengerCounts} />
      </View>

      {/* Cabin class — animated sliding segmented control */}
      <View style={{ marginTop: 16 }}>
        <CabinSelector value={cabinClass} onChange={setCabinClass} />
      </View>

      {/* Search button */}
      <View style={{ marginTop: 20 }}>
        <Button
          label="Search flights"
          onPress={handleSearch}
          loading={isSearching}
          disabled={!canSearch}
        />
      </View>
    </View>
  );
}
