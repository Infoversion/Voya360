import { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { useSavedTravelers } from '@/hooks/useSavedTravelers';
import { colors, fontSize, spacing } from '@/constants/design';
import { DietaryPreference, SeatPreference, SavedTraveler, UserProfile } from '@/types/booking';

// ── Constants ─────────────────────────────────────────────────────────────────

const AIRLINES = [
  { code: 'EK', name: 'Emirates'          },
  { code: 'QR', name: 'Qatar Airways'     },
  { code: 'TK', name: 'Turkish Airlines'  },
  { code: 'AI', name: 'Air India'         },
  { code: 'SQ', name: 'Singapore Air'     },
  { code: 'MH', name: 'Malaysia Airlines' },
  { code: 'EY', name: 'Etihad'           },
  { code: 'BA', name: 'British Airways'   },
  { code: 'UA', name: 'United'            },
  { code: 'AA', name: 'American'          },
  { code: 'LH', name: 'Lufthansa'         },
  { code: 'WY', name: 'Oman Air'          },
];

const AVOID_AIRPORTS = [
  { code: 'CDG', name: 'Paris CDG'     },
  { code: 'FCO', name: 'Rome FCO'      },
  { code: 'MXP', name: 'Milan MXP'    },
  { code: 'AMS', name: 'Amsterdam'     },
  { code: 'FRA', name: 'Frankfurt'     },
  { code: 'BRU', name: 'Brussels'      },
  { code: 'MAD', name: 'Madrid'        },
  { code: 'ZRH', name: 'Zurich'        },
];

const DIETARY: { value: DietaryPreference; label: string }[] = [
  { value: 'none',       label: 'No preference' },
  { value: 'vegetarian', label: 'Vegetarian'    },
  { value: 'halal',      label: 'Halal'         },
  { value: 'kosher',     label: 'Kosher'        },
  { value: 'vegan',      label: 'Vegan'         },
];

const SEAT_PREF: { value: SeatPreference; label: string }[] = [
  { value: 'none',   label: 'No preference' },
  { value: 'window', label: 'Window'        },
  { value: 'aisle',  label: 'Aisle'         },
];

// ── Reusable components ───────────────────────────────────────────────────────

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <View style={{
      backgroundColor: '#FFF', borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      marginBottom: 16, overflow: 'hidden',
    }}>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' }}>
      <Text style={{ width: 110, fontSize: fontSize.label, color: colors.textMuted }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: fontSize.label, color: colors.text, fontWeight: '500' }}>{value || '—'}</Text>
    </View>
  );
}

function ChipGrid({ items, selected, onToggle }: {
  items: { code: string; name: string }[];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
      {items.map(item => {
        const active = selected.includes(item.code);
        return (
          <TouchableOpacity
            key={item.code}
            onPress={() => onToggle(item.code)}
            style={{
              paddingHorizontal: 12, paddingVertical: 7,
              borderRadius: 20, borderWidth: 1.5,
              borderColor: active ? colors.accent : colors.border,
              backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
              {item.code} · {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DietaryChips({ value, onChange }: {
  value: DietaryPreference | null;
  onChange: (v: DietaryPreference) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
      {DIETARY.map(d => {
        const active = (value ?? 'none') === d.value;
        return (
          <TouchableOpacity
            key={d.value}
            onPress={() => onChange(d.value)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 20, borderWidth: 1.5,
              borderColor: active ? colors.accent : colors.border,
              backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
              {d.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BagStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted, flex: 1 }}>Default checked bags</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={{
              width: 40, height: 40, borderRadius: 20, borderWidth: 1.5,
              borderColor: value === n ? colors.accent : colors.border,
              backgroundColor: value === n ? `${colors.accent}12` : '#FAFAFA',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontWeight: '700', color: value === n ? colors.accent : colors.textMuted }}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Date auto-format (YYYY-MM-DD) ─────────────────────────────────────────────

function formatDateInput(raw: string, prev: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const wasDeleting = raw.length < prev.length;
  if (wasDeleting) {
    if (prev.endsWith('-') && digits.length === 6) return digits.slice(0, 6);
    if (prev.endsWith('-') && digits.length === 4) return digits.slice(0, 4);
    return digits.length > 6 ? `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6)}`
      : digits.length > 4   ? `${digits.slice(0,4)}-${digits.slice(4)}`
      : digits;
  }
  if (digits.length > 6) return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6)}`;
  if (digits.length > 4) return `${digits.slice(0,4)}-${digits.slice(4)}`;
  return digits;
}

// ── Traveler modal ────────────────────────────────────────────────────────────

interface TravelerForm {
  full_name:          string;
  date_of_birth:      string;
  passport_number:    string;
  passport_expiry:    string;
  passport_country:   string;
  dietary_preference: DietaryPreference;
  seat_preference:    SeatPreference;
  is_primary:         boolean;
}

const BLANK_FORM: TravelerForm = {
  full_name: '', date_of_birth: '', passport_number: '',
  passport_expiry: '', passport_country: '',
  dietary_preference: 'none', seat_preference: 'none', is_primary: false,
};

function TravelerModal({ visible, traveler, onClose, onSave }: {
  visible: boolean;
  traveler: SavedTraveler | null;
  onClose: () => void;
  onSave:  (form: TravelerForm) => Promise<void>;
}) {
  const [form,    setForm]    = useState<TravelerForm>(BLANK_FORM);
  const [saving,  setSaving]  = useState(false);
  const [prevDob, setPrevDob] = useState('');
  const [prevExp, setPrevExp] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (traveler) {
      setForm({
        full_name:          traveler.full_name,
        date_of_birth:      traveler.date_of_birth     ?? '',
        passport_number:    traveler.passport_number    ?? '',
        passport_expiry:    traveler.passport_expiry    ?? '',
        passport_country:   traveler.passport_country   ?? '',
        dietary_preference: traveler.dietary_preference ?? 'none',
        seat_preference:    traveler.seat_preference    ?? 'none',
        is_primary:         traveler.is_primary,
      });
    } else {
      setForm(BLANK_FORM);
    }
    setPrevDob(''); setPrevExp('');
  }, [visible, traveler]);

  const set = <K extends keyof TravelerForm>(k: K, v: TravelerForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    if (!form.full_name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.pagePadding, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            {traveler ? 'Edit Traveler' : 'Add Traveler'}
          </Text>
          <TouchableOpacity onPress={handle} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Full name (as on passport)</Text>
            <TextInput
              value={form.full_name}
              onChangeText={v => set('full_name', v)}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor="#B0B0B0"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
            />
          </View>

          {/* DOB */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Date of birth</Text>
            <TextInput
              value={form.date_of_birth}
              onChangeText={v => { const f = formatDateInput(v, prevDob); setPrevDob(f); set('date_of_birth', f); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
            />
          </View>

          {/* Passport */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Passport number</Text>
            <TextInput
              value={form.passport_number}
              onChangeText={v => set('passport_number', v.toUpperCase())}
              placeholder="A1234567"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="characters"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
            />
          </View>

          {/* Expiry */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Passport expiry</Text>
            <TextInput
              value={form.passport_expiry}
              onChangeText={v => { const f = formatDateInput(v, prevExp); setPrevExp(f); set('passport_expiry', f); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
            />
          </View>

          {/* Nationality */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Nationality (2-letter code)</Text>
            <TextInput
              value={form.passport_country}
              onChangeText={v => set('passport_country', v.toUpperCase().slice(0, 2))}
              placeholder="US"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="characters"
              maxLength={2}
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
            />
          </View>

          {/* Dietary */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>Meal preference</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {DIETARY.map(d => {
              const active = form.dietary_preference === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => set('dietary_preference', d.value)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Seat */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>Seat preference</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            {SEAT_PREF.map(s => {
              const active = form.seat_preference === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => set('seat_preference', s.value)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Primary toggle */}
          <TouchableOpacity
            onPress={() => set('is_primary', !form.is_primary)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{
              width: 24, height: 24, borderRadius: 6, borderWidth: 1.5,
              borderColor: form.is_primary ? colors.accent : colors.border,
              backgroundColor: form.is_primary ? colors.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {form.is_primary && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: fontSize.body, color: colors.text }}>Primary traveler (auto-filled first)</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Personal info modal ───────────────────────────────────────────────────────

function PersonalModal({ visible, profile, onClose, onSave }: {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSave:  (name: string, phone: string, origin: string, dest: string) => Promise<void>;
}) {
  const [name,   setName]   = useState('');
  const [phone,  setPhone]  = useState('');
  const [origin, setOrigin] = useState('');
  const [dest,   setDest]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !profile) return;
    setName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setOrigin(profile.home_origin ?? '');
    setDest(profile.home_destination ?? '');
  }, [visible, profile]);

  const handle = async () => {
    setSaving(true);
    await onSave(name, phone, origin.toUpperCase().slice(0, 3), dest.toUpperCase().slice(0, 3));
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.pagePadding, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Edit Profile</Text>
          <TouchableOpacity onPress={handle} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }} keyboardShouldPersistTaps="handled">
          {[
            { label: 'Full name', value: name, set: setName, placeholder: 'Your name', upper: false, keyboard: 'default' as const },
            { label: 'Phone', value: phone, set: setPhone, placeholder: '+1 555 000 0000', upper: false, keyboard: 'phone-pad' as const },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 5 }}>{f.label}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.set}
                placeholder={f.placeholder}
                placeholderTextColor="#B0B0B0"
                keyboardType={f.keyboard}
                style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
              />
            </View>
          ))}

          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12, marginTop: 4 }}>
            Home corridor
          </Text>
          {[
            { label: 'Flying from (IATA)', value: origin, set: setOrigin, placeholder: 'e.g. JFK, LAX, LHR' },
            { label: 'Flying to (IATA)',   value: dest,   set: setDest,   placeholder: 'e.g. DEL, BOM, KHI' },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 5 }}>{f.label}</Text>
              <TextInput
                value={f.value}
                onChangeText={v => f.set(v.toUpperCase().slice(0, 3))}
                placeholder={f.placeholder}
                placeholderTextColor="#B0B0B0"
                autoCapitalize="characters"
                maxLength={3}
                style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text }}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, updateProfile, signOut } = useAuthStore();
  const { travelers, addTraveler, updateTraveler, deleteTraveler } = useSavedTravelers();

  const [editPersonal,    setEditPersonal]    = useState(false);
  const [travelerModal,   setTravelerModal]   = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<SavedTraveler | null>(null);

  const airlines = profile?.preferred_airlines ?? [];
  const avoided  = profile?.avoided_airports   ?? [];
  const dietary  = profile?.dietary_preference ?? 'none';
  const bagCount = profile?.default_bag_count  ?? 2;

  const toggleAirline = (code: string) => {
    const next = airlines.includes(code) ? airlines.filter(c => c !== code) : [...airlines, code];
    updateProfile({ preferred_airlines: next });
  };

  const toggleAvoid = (code: string) => {
    const next = avoided.includes(code) ? avoided.filter(c => c !== code) : [...avoided, code];
    updateProfile({ avoided_airports: next });
  };

  const handlePersonalSave = async (name: string, phone: string, origin: string, dest: string) => {
    await updateProfile({
      full_name:        name   || undefined,
      phone:            phone  || undefined,
      home_origin:      origin || null,
      home_destination: dest   || null,
    } as Partial<UserProfile>);
  };

  const handleTravelerSave = async (form: TravelerForm) => {
    const fields = {
      full_name:          form.full_name,
      date_of_birth:      form.date_of_birth     || null,
      passport_number:    form.passport_number    || null,
      passport_expiry:    form.passport_expiry    || null,
      passport_country:   form.passport_country   || null,
      dietary_preference: form.dietary_preference === 'none' ? null : form.dietary_preference,
      seat_preference:    form.seat_preference    === 'none' ? null : form.seat_preference,
      is_primary:         form.is_primary,
    };
    if (editingTraveler) {
      await updateTraveler(editingTraveler.id, fields);
    } else {
      await addTraveler(fields);
    }
  };

  const confirmDelete = (t: SavedTraveler) =>
    Alert.alert('Remove traveler', `Remove ${t.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteTraveler(t.id) },
    ]);

  const initials = (profile?.full_name ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 60 }}>

        {/* Avatar header */}
        <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8, position: 'relative' }}>
          <Image source={require('@/assets/logo.png')} style={{ position: 'absolute', top: 0, right: 0, width: 34, height: 34, borderRadius: 17 }} resizeMode="cover" />
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: colors.accent,
            alignItems: 'center', justifyContent: 'center', marginBottom: 10,
          }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
            {profile?.full_name ?? 'Your profile'}
          </Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: 2 }}>
            {profile?.email}
          </Text>
        </View>

        {/* Personal */}
        <SectionCard
          title="Personal"
          action={
            <TouchableOpacity onPress={() => setEditPersonal(true)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>Edit</Text>
            </TouchableOpacity>
          }
        >
          <InfoRow label="Name"  value={profile?.full_name ?? ''} />
          <InfoRow label="Phone" value={profile?.phone ?? ''} />
          <InfoRow
            label="Home route"
            value={
              profile?.home_origin && profile?.home_destination
                ? `${profile.home_origin} ↔ ${profile.home_destination}`
                : ''
            }
          />
        </SectionCard>

        {/* Dietary + bags */}
        <SectionCard title="Travel defaults">
          <DietaryChips value={dietary} onChange={v => updateProfile({ dietary_preference: v, dietary_confirmed: true })} />
          <View style={{ height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 14 }} />
          <BagStepper value={bagCount} onChange={n => updateProfile({ default_bag_count: n })} />
        </SectionCard>

        {/* Preferred airlines */}
        <SectionCard title="Preferred airlines">
          <ChipGrid items={AIRLINES} selected={airlines} onToggle={toggleAirline} />
        </SectionCard>

        {/* Avoided airports */}
        <SectionCard title="Airports to avoid">
          <ChipGrid items={AVOID_AIRPORTS} selected={avoided} onToggle={toggleAvoid} />
        </SectionCard>

        {/* Saved travelers */}
        <SectionCard
          title="Saved travelers"
          action={
            <TouchableOpacity onPress={() => { setEditingTraveler(null); setTravelerModal(true); }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>+ Add</Text>
            </TouchableOpacity>
          }
        >
          {travelers.length === 0 && (
            <Text style={{ padding: 16, fontSize: fontSize.label, color: colors.textMuted }}>
              Add family members to speed up booking.
            </Text>
          )}
          {travelers.map((t, i) => (
            <View
              key={t.id}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: i < travelers.length - 1 ? 1 : 0,
                borderBottomColor: '#F0F0F0',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: t.is_primary ? colors.accent : '#E5E7EB',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: t.is_primary ? '#fff' : colors.textMuted }}>
                  {t.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.text }}>
                  {t.full_name}{t.is_primary ? '  ★' : ''}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {[t.passport_country, t.dietary_preference].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingTraveler(t); setTravelerModal(true); }} style={{ paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(t)} style={{ paddingLeft: 4 }}>
                <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>

        {/* Sign out */}
        <TouchableOpacity
          onPress={() => Alert.alert('Sign out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])}
          style={{
            borderRadius: 14, paddingVertical: 14, alignItems: 'center',
            backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FEE2E2',
          }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#DC2626' }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <PersonalModal
        visible={editPersonal}
        profile={profile}
        onClose={() => setEditPersonal(false)}
        onSave={handlePersonalSave}
      />

      <TravelerModal
        visible={travelerModal}
        traveler={editingTraveler}
        onClose={() => setTravelerModal(false)}
        onSave={handleTravelerSave}
      />
    </SafeAreaView>
  );
}
