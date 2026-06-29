import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useBookingStore, PassengerInput } from '@/store/booking.store';
import { useAuthStore } from '@/store/auth.store';
import { useSavedTravelers } from '@/hooks/useSavedTravelers';
import { PassengerForm } from '@/components/booking/PassengerForm';
import { VoyaCard } from '@/components/voya/VoyaCard';
import { useVoya } from '@/hooks/useVoya';
import { colors, fontSize, spacing } from '@/constants/design';

function validate(passengers: PassengerInput[]): string | null {
  for (let i = 0; i < passengers.length; i++) {
    const p = passengers[i];
    const isInfant = p.type === 'infant_without_seat';
    const label = isInfant ? `Infant ${i + 1}` : p.type === 'child' ? `Child ${i + 1}` : `Adult ${i + 1}`;
    if (!p.givenName.trim())      return `${label}: first name required`;
    if (!p.familyName.trim())     return `${label}: last name required`;
    if (!p.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) return `${label}: date of birth must be YYYY-MM-DD`;
    if (!p.gender)                return `${label}: gender required`;
    if (!p.passportNumber.trim()) return `${label}: passport number required`;
    if (!p.passportCountry.match(/^[A-Z]{2}$/)) return `${label}: nationality must be 2-letter code`;
    if (!p.passportExpiry.match(/^\d{4}-\d{2}-\d{2}$/)) return `${label}: expiry must be YYYY-MM-DD`;
    // Email & phone not required for infants — copied from first adult at booking time
    if (!isInfant) {
      if (!p.email.includes('@')) return `${label}: valid email required`;
      if (!p.phone.trim())        return `${label}: phone required`;
    }
  }
  return null;
}

export default function PassengersScreen() {
  const { passengers, updatePassenger } = useBookingStore();
  const { session, profile } = useAuthStore();
  const { travelers } = useSavedTravelers();
  const { observation, dismiss } = useVoya('passengers');
  const [attempted, setAttempted] = useState(false);

  // Pre-populate first adult from logged-in user profile, copy contact to infants
  useEffect(() => {
    if (!passengers.length) return;
    const firstAdult = passengers.find(p => p.type === 'adult');
    if (!firstAdult || firstAdult.givenName || firstAdult.email) return; // already filled

    const fullName = (profile?.full_name ?? '').trim();
    const parts = fullName.split(/\s+/);
    const givenName = parts[0] ?? '';
    const familyName = parts.slice(1).join(' ');
    const email = session?.user?.email ?? '';
    const phone = profile?.phone ?? '';

    updatePassenger(firstAdult.id, { givenName, familyName, email, phone });

    // Infants use the first adult's email/phone at booking time — pre-fill silently
    passengers.filter(p => p.type === 'infant_without_seat').forEach(infant => {
      updatePassenger(infant.id, { email, phone });
    });
  }, []);

  // Detect country from device location and pre-fill nationality for all blank passengers
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        if (!geo?.isoCountryCode) return;
        const countryCode = geo.isoCountryCode.toUpperCase();
        passengers.forEach(p => {
          if (!p.passportCountry) {
            updatePassenger(p.id, { passportCountry: countryCode });
          }
        });
      } catch (_) {}
    })();
  }, []);

  const onContinue = () => {
    setAttempted(true);
    const err = validate(passengers);
    if (err) {
      Alert.alert('Missing info', err);
      return;
    }
    router.push('/booking/confirm');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            Passenger details
          </Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            Step 2 of 3
          </Text>
        </View>
        <Image source={require('@/assets/logo.png')} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {observation && (
          <View style={{ marginHorizontal: -spacing.pagePadding, marginBottom: 4 }}>
            <VoyaCard observation={observation} onDismiss={dismiss} />
          </View>
        )}

        {passengers.map((p, i) => (
          <PassengerForm
            key={p.id}
            passenger={p}
            index={i}
            savedTravelers={travelers}
            onChange={updates => updatePassenger(p.id, updates)}
          />
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={{
        borderTopWidth: 1, borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.pagePadding,
        paddingTop: 14, paddingBottom: 28,
      }}>
        <TouchableOpacity
          onPress={onContinue}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14, paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#fff' }}>
            Continue to review
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
