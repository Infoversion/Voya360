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
      const stripped = p.phone.replace(/[^\d+]/g, '');
      const e164     = stripped.startsWith('+') ? stripped : `+${stripped}`;
      if (!/^\+[1-9]\d{10,14}$/.test(e164)) {
        return `${label}: phone must start with country code — e.g. +1 for US, +44 for UK, +91 for India`;
      }
    }
  }
  return null;
}

const PHONE_PREFIX: Record<string, string> = {
  US: '+1',  CA: '+1',  GB: '+44', IN: '+91', PK: '+92',
  BD: '+880', LK: '+94', NP: '+977', PH: '+63', MY: '+60',
  SG: '+65',  AE: '+971', QA: '+974', SA: '+966', AU: '+61',
  DE: '+49',  FR: '+33',  NL: '+31',  IE: '+353', NZ: '+64',
};

export default function PassengersScreen() {
  const { passengers, updatePassenger } = useBookingStore();
  const { session, profile } = useAuthStore();
  const { travelers } = useSavedTravelers();
  const { observation, dismiss } = useVoya('passengers');
  const [attempted, setAttempted] = useState(false);

  // Effect 1: fill name / email / phone from profile — re-runs if profile loads late
  useEffect(() => {
    if (!passengers.length) return;
    const firstAdult = passengers.find(p => p.type === 'adult');
    if (!firstAdult) return;

    const fullName   = (profile?.full_name ?? '').trim();
    const parts      = fullName.split(/\s+/);
    const givenName  = parts[0] ?? '';
    const familyName = parts.slice(1).join(' ');
    const email      = session?.user?.email ?? '';
    const phone      = profile?.phone ?? '';

    const updates: Partial<PassengerInput> = {};
    if (!firstAdult.givenName)  updates.givenName  = givenName;
    if (!firstAdult.familyName) updates.familyName = familyName;
    if (!firstAdult.email)      updates.email      = email;
    if (!firstAdult.phone && phone) updates.phone  = phone;
    if (Object.keys(updates).length) updatePassenger(firstAdult.id, updates);

    passengers.filter(p => p.type === 'infant_without_seat').forEach(infant => {
      const inf: Partial<PassengerInput> = {};
      if (!infant.email && email) inf.email = email;
      if (!infant.phone && phone) inf.phone = phone;
      if (Object.keys(inf).length) updatePassenger(infant.id, inf);
    });
  }, [profile?.phone, profile?.full_name, session?.user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: fill DOB / passport / gender from primary saved traveler (each field only if empty)
  useEffect(() => {
    if (!travelers.length || !passengers.length) return;
    const firstAdult = passengers.find(p => p.type === 'adult');
    if (!firstAdult) return;

    const primary = travelers.find(t => t.is_primary) ?? travelers[0];
    if (!primary) return;

    const updates: Partial<PassengerInput> = {};
    if (!firstAdult.savedTravelerId) updates.savedTravelerId = primary.id;
    if (!firstAdult.dateOfBirth)     updates.dateOfBirth     = primary.date_of_birth   ?? '';
    if (!firstAdult.passportNumber)  updates.passportNumber  = primary.passport_number ?? '';
    if (!firstAdult.passportCountry) updates.passportCountry = primary.passport_country ?? '';
    if (!firstAdult.passportExpiry)  updates.passportExpiry  = primary.passport_expiry ?? '';
    if (!firstAdult.dietary)         updates.dietary         = primary.dietary_preference ?? '';
    if (!firstAdult.gender)          updates.gender          = (primary as any).gender ?? '';
    if (Object.keys(updates).length) updatePassenger(firstAdult.id, updates);
  }, [travelers]);

  // Detect country from device location → pre-fill nationality only
  // (phone is pre-filled from profile; reading live store state avoids stale-closure overwrite)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        if (!geo?.isoCountryCode) return;
        const iso = geo.isoCountryCode.toUpperCase();
        const prefix = PHONE_PREFIX[iso] ?? null;
        // Read current store state — not stale closure — so we don't overwrite profile phone
        const current = useBookingStore.getState().passengers;
        current.forEach(p => {
          if (!p.passportCountry) updatePassenger(p.id, { passportCountry: iso });
          if (prefix) {
            if (!p.phone) {
              updatePassenger(p.id, { phone: prefix + ' ' });
            } else if (!p.phone.startsWith('+')) {
              updatePassenger(p.id, { phone: prefix + ' ' + p.phone });
            }
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
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12, paddingRight: 72,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            Passenger details
          </Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            Step 2 of 3
          </Text>
        </View>
        <Image source={require('@/assets/logo.png')} style={{ position: 'absolute', right: spacing.pagePadding, top: '50%', marginTop: -37, width: 74, height: 74 }} resizeMode="contain" />
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
