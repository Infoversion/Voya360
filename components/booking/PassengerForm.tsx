import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { DietaryRow } from '@/components/booking/DietaryRow';
import { PassengerInput, PassengerType } from '@/store/booking.store';
import { SavedTraveler, DietaryPreference } from '@/types/booking';
import { colors, fontSize } from '@/constants/design';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_LABEL: Record<PassengerType, { title: string; ionicon: IoniconName; note?: string }> = {
  adult:               { title: 'Adult',   ionicon: 'person-outline' },
  child:               { title: 'Child',   ionicon: 'body-outline',  note: 'Ages 2–11' },
  infant_without_seat: { title: 'Infant',  ionicon: 'happy-outline', note: 'Under 2 · sits on lap · uses parent\'s contact' },
};

interface Props {
  passenger:      PassengerInput;
  index:          number;
  savedTravelers: SavedTraveler[];
  onChange:       (updates: Partial<PassengerInput>) => void;
}

const GENDERS = [{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }] as const;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 4 }}>
      {label}
      {required
        ? <Text style={{ color: '#DC2626' }}> *</Text>
        : <Text style={{ color: colors.textMuted, fontSize: 11 }}> (optional)</Text>
      }
    </Text>
  );
}

// Auto-inserts dashes: YYYY-MM-DD
function formatDateInput(raw: string, prev: string): string {
  const isDeleting = raw.length < prev.length;
  if (isDeleting) {
    return raw.replace(/-$/, ''); // strip trailing dash on backspace
  }
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length < 4) return digits;
  if (digits.length === 4) return digits + '-';
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function PassengerForm({ passenger, index, savedTravelers, onChange }: Props) {
  const prevDob    = useRef(passenger.dateOfBirth);
  const prevExpiry = useRef(passenger.passportExpiry);

  useEffect(() => { prevDob.current = passenger.dateOfBirth; }, [passenger.dateOfBirth]);
  useEffect(() => { prevExpiry.current = passenger.passportExpiry; }, [passenger.passportExpiry]);

  const handleDobChange = (raw: string) => {
    const formatted = formatDateInput(raw, prevDob.current);
    prevDob.current = formatted;
    onChange({ dateOfBirth: formatted });
  };

  const handleExpiryChange = (raw: string) => {
    const formatted = formatDateInput(raw, prevExpiry.current);
    prevExpiry.current = formatted;
    onChange({ passportExpiry: formatted });
  };

  const fillFromSaved = (t: SavedTraveler) => {
    const [given, ...rest] = (t.full_name ?? '').split(' ');
    onChange({
      savedTravelerId: t.id,
      givenName:       given ?? '',
      familyName:      rest.join(' '),
      dateOfBirth:     t.date_of_birth ?? '',
      passportNumber:  '',  // never prefill passport — Vault encrypted
      passportCountry: t.passport_country ?? '',
      passportExpiry:  t.passport_expiry ?? '',
      dietary:         t.dietary_preference ?? '',
    });
  };

  const typeInfo = TYPE_LABEL[passenger.type];
  const isInfant = passenger.type === 'infant_without_seat';

  // Count of this type before this passenger (for label: "Adult 1", "Child 2", etc.)
  const typeIndex = index; // simplified — parent can pass a per-type index if needed

  return (
    <View style={{
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
      padding: 16, marginBottom: 16,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <Ionicons name={typeInfo.ionicon} size={22} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            {typeInfo.title} {index + 1}
          </Text>
          {typeInfo.note && (
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{typeInfo.note}</Text>
          )}
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>
          <Text style={{ color: '#DC2626' }}>*</Text> required
        </Text>
      </View>

      {/* Saved traveler quick-fill */}
      {savedTravelers.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 6 }}>
            Fill from saved travelers
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {savedTravelers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => fillFromSaved(t)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7,
                    borderRadius: 20, borderWidth: 1.5,
                    borderColor: passenger.savedTravelerId === t.id ? colors.accent : colors.border,
                    backgroundColor: passenger.savedTravelerId === t.id ? `${colors.accent}15` : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: fontSize.label, fontWeight: '600',
                    color: passenger.savedTravelerId === t.id ? colors.accent : colors.text,
                  }}>
                    {t.full_name?.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="First name *" value={passenger.givenName}
            onChangeText={v => onChange({ givenName: v })} autoCapitalize="words" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Last name *" value={passenger.familyName}
            onChangeText={v => onChange({ familyName: v })} autoCapitalize="words" />
        </View>
      </View>

      <Input label="Date of birth *" value={passenger.dateOfBirth}
        onChangeText={handleDobChange}
        keyboardType="numeric" placeholder="YYYY-MM-DD" />

      {/* Gender */}
      <View style={{ marginBottom: 12 }}>
        <FieldLabel label="Gender" required />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g.value}
              onPress={() => onChange({ gender: g.value })}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                borderColor: passenger.gender === g.value ? colors.accent : colors.border,
                backgroundColor: passenger.gender === g.value ? `${colors.accent}15` : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: fontSize.body, fontWeight: '600',
                color: passenger.gender === g.value ? colors.accent : colors.textMuted,
              }}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Input label="Passport number *" value={passenger.passportNumber}
        onChangeText={v => onChange({ passportNumber: v })}
        autoCapitalize="characters" autoCorrect={false} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Input label="Nationality *" value={passenger.passportCountry}
            onChangeText={v => onChange({ passportCountry: v.toUpperCase() })}
            autoCapitalize="characters" maxLength={2} placeholder="US" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Passport expiry *" value={passenger.passportExpiry}
            onChangeText={handleExpiryChange}
            keyboardType="numeric" placeholder="YYYY-MM-DD" />
        </View>
      </View>

      {isInfant ? (
        <View style={{
          backgroundColor: '#F0F9FF', borderRadius: 10,
          borderWidth: 1, borderColor: '#BAE6FD',
          padding: 10, marginBottom: 12,
        }}>
          <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '600' }}>
            ✈ Infant contact details (email & phone) will use the first adult's information.
          </Text>
        </View>
      ) : (
        <>
          <Input label="Email *" value={passenger.email}
            onChangeText={v => onChange({ email: v })}
            keyboardType="email-address" autoCapitalize="none" />

          <Input label="Phone (with country code) *" value={passenger.phone}
            onChangeText={v => onChange({ phone: v })}
            keyboardType="phone-pad" placeholder="+1 555 000 0000" />
        </>
      )}

      {/* Dietary — Voya-inferred */}
      <DietaryRow
        fullName={`${passenger.givenName} ${passenger.familyName}`}
        value={(passenger.dietary as DietaryPreference) || null}
        onChange={pref => onChange({ dietary: pref })}
      />
    </View>
  );
}
