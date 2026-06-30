import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { deleteAccount } from '@/lib/duffel';
import { useSavedTravelers } from '@/hooks/useSavedTravelers';
import { colors, fontSize, spacing } from '@/constants/design';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import { PageLogo } from '@/components/ui/PageLogo';
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
  { code: 'CDG', name: 'Paris CDG'  },
  { code: 'FCO', name: 'Rome FCO'   },
  { code: 'MXP', name: 'Milan MXP'  },
  { code: 'AMS', name: 'Amsterdam'  },
  { code: 'FRA', name: 'Frankfurt'  },
  { code: 'BRU', name: 'Brussels'   },
  { code: 'MAD', name: 'Madrid'     },
  { code: 'ZRH', name: 'Zurich'     },
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

const DIETARY_LABEL: Record<DietaryPreference, string> = {
  none: 'No preference', vegetarian: 'Vegetarian',
  halal: 'Halal', kosher: 'Kosher', vegan: 'Vegan',
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionCard({ title, children, actionLabel, onAction }: {
  title: string; children: React.ReactNode;
  actionLabel?: string; onAction?: () => void;
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
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' }}>
      <Text style={{ width: 120, fontSize: fontSize.label, color: colors.textMuted }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: fontSize.label, color: colors.text, fontWeight: '500' }}>{value || '—'}</Text>
    </View>
  );
}

function ChipGrid({ items, selected, onToggle, showLogos = false }: {
  items: { code: string; name: string }[]; selected: string[];
  onToggle: (code: string) => void; showLogos?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 }}>
      {items.map(item => {
        const active = selected.includes(item.code);
        return (
          <TouchableOpacity
            key={item.code} onPress={() => onToggle(item.code)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: showLogos ? 8 : 0,
              paddingHorizontal: 12, paddingVertical: showLogos ? 8 : 7,
              borderRadius: 20, borderWidth: 1.5,
              borderColor: active ? colors.accent : colors.border,
              backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
            }}
          >
            {showLogos && <AirlineLogo iataCode={item.code} size={22} radius={4} />}
            <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function BagStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fontSize.label, color: colors.text, fontWeight: '600' }}>Default checked bags</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Used in price calculations</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2, 3].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={{
            width: 40, height: 40, borderRadius: 20, borderWidth: 1.5,
            borderColor: value === n ? colors.accent : colors.border,
            backgroundColor: value === n ? `${colors.accent}12` : '#FAFAFA',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontWeight: '700', color: value === n ? colors.accent : colors.textMuted }}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Date auto-format ──────────────────────────────────────────────────────────

function formatDateInput(raw: string, prev: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const del    = raw.length < prev.length;
  if (del) {
    if (prev.endsWith('-') && digits.length === 6) return digits.slice(0, 6);
    if (prev.endsWith('-') && digits.length === 4) return digits.slice(0, 4);
    return digits.length > 6 ? `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6)}`
         : digits.length > 4 ? `${digits.slice(0,4)}-${digits.slice(4)}` : digits;
  }
  if (digits.length > 6) return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6)}`;
  if (digits.length > 4) return `${digits.slice(0,4)}-${digits.slice(4)}`;
  return digits;
}

function maskPassport(n: string | null): string {
  if (!n || n.length < 4) return n ?? '—';
  return '·'.repeat(n.length - 4) + n.slice(-4);
}

// ── Traveler modal (co-travelers only) ────────────────────────────────────────

interface TravelerForm {
  full_name: string; date_of_birth: string;
  passport_number: string; passport_expiry: string; passport_country: string;
  dietary_preference: DietaryPreference; seat_preference: SeatPreference;
  is_primary: boolean;
}

const BLANK_FORM: TravelerForm = {
  full_name: '', date_of_birth: '', passport_number: '',
  passport_expiry: '', passport_country: '',
  dietary_preference: 'none', seat_preference: 'none', is_primary: false,
};

function TravelerModal({ visible, traveler, onClose, onSave }: {
  visible: boolean; traveler: SavedTraveler | null;
  onClose: () => void; onSave: (form: TravelerForm) => Promise<void>;
}) {
  const [form, setForm]     = useState<TravelerForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const prevDob = useRef('');
  const prevExp = useRef('');

  useEffect(() => {
    if (!visible) return;
    if (traveler) {
      setForm({
        full_name: traveler.full_name, date_of_birth: traveler.date_of_birth ?? '',
        passport_number: traveler.passport_number ?? '', passport_expiry: traveler.passport_expiry ?? '',
        passport_country: traveler.passport_country ?? '',
        dietary_preference: traveler.dietary_preference ?? 'none',
        seat_preference: traveler.seat_preference ?? 'none', is_primary: traveler.is_primary,
      });
    } else { setForm(BLANK_FORM); }
    prevDob.current = ''; prevExp.current = '';
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

  const inputStyle = {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text,
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
            {saving ? <ActivityIndicator color={colors.accent} />
              : <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }} keyboardShouldPersistTaps="handled">
          {[
            { label: 'Full name (as on passport)', value: form.full_name, onChange: (v: string) => set('full_name', v), caps: 'words' as const },
            { label: 'Passport number', value: form.passport_number, onChange: (v: string) => set('passport_number', v.toUpperCase()), caps: 'characters' as const },
            { label: 'Nationality (2-letter)', value: form.passport_country, onChange: (v: string) => set('passport_country', v.toUpperCase().slice(0,2)), caps: 'characters' as const, maxLength: 2 },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>{f.label}</Text>
              <TextInput value={f.value} onChangeText={f.onChange} autoCapitalize={f.caps}
                maxLength={f.maxLength} style={inputStyle} />
            </View>
          ))}
          {[
            { label: 'Date of birth', ref: prevDob, value: form.date_of_birth, key: 'date_of_birth' as const },
            { label: 'Passport expiry', ref: prevExp, value: form.passport_expiry, key: 'passport_expiry' as const },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>{f.label}</Text>
              <TextInput value={f.value} keyboardType="numeric" placeholder="YYYY-MM-DD"
                placeholderTextColor="#B0B0B0"
                onChangeText={v => { const fmt = formatDateInput(v, f.ref.current); f.ref.current = fmt; set(f.key, fmt); }}
                style={inputStyle} />
            </View>
          ))}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Meal preference</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {DIETARY.map(d => {
              const active = form.dietary_preference === d.value;
              return (
                <TouchableOpacity key={d.value} onPress={() => set('dietary_preference', d.value)} style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Seat preference</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {SEAT_PREF.map(s => {
              const active = form.seat_preference === s.value;
              return (
                <TouchableOpacity key={s.value} onPress={() => set('seat_preference', s.value)} style={{
                  paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Inline passport form state ────────────────────────────────────────────────

interface PassportForm {
  dob: string; passportNo: string; passportExpiry: string;
  passportCountry: string; gender: 'm' | 'f' | ''; dietary: DietaryPreference; seat: SeatPreference;
}

const BLANK_PASSPORT: PassportForm = {
  dob: '', passportNo: '', passportExpiry: '', passportCountry: '', gender: '', dietary: 'none', seat: 'none',
};

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, updateProfile, signOut } = useAuthStore();
  const { travelers, addTraveler, updateTraveler, deleteTraveler } = useSavedTravelers();

  // avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // name inline edit
  const [nameEdit,    setNameEdit]    = useState(false);
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [savingName,  setSavingName]  = useState(false);

  // contact modal (phone + home route)
  const [showContact, setShowContact] = useState(false);
  const [phone,       setPhone]       = useState('');
  const [origin,      setOrigin]      = useState('');
  const [dest,        setDest]        = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // inline passport card
  const [passportEdit,   setPassportEdit]   = useState(false);
  const [passportForm,   setPassportForm]   = useState<PassportForm>(BLANK_PASSPORT);
  const [savingPassport, setSavingPassport] = useState(false);
  const prevDobRef = useRef('');
  const prevExpRef = useRef('');

  // co-traveler modal
  const [travelerModal,   setTravelerModal]   = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<SavedTraveler | null>(null);

  // delete account
  const [deleting, setDeleting] = useState(false);

  const primaryTraveler = travelers.find(t => t.is_primary) ?? travelers[0] ?? null;
  const coTravelers     = travelers.filter(t => t.id !== primaryTraveler?.id);
  const airlines        = profile?.preferred_airlines ?? [];
  const avoided         = profile?.avoided_airports   ?? [];
  const bagCount        = profile?.default_bag_count ?? 2;

  // derived name parts
  const fullName    = profile?.full_name ?? '';
  const nameParts   = fullName.trim().split(/\s+/);
  const displayFirst = nameParts[0] ?? '';
  const displayLast  = nameParts.slice(1).join(' ');

  const openNameEdit = () => {
    setFirstName(displayFirst);
    setLastName(displayLast);
    setNameEdit(true);
  };

  const saveNameEdit = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) return;
    setSavingName(true);
    await updateProfile({ full_name: [fn, ln].filter(Boolean).join(' ') });
    setSavingName(false);
    setNameEdit(false);
  };

  const openPassportEdit = () => {
    setPassportForm({
      dob:             primaryTraveler?.date_of_birth    ?? '',
      passportNo:      primaryTraveler?.passport_number  ?? '',
      passportExpiry:  primaryTraveler?.passport_expiry  ?? '',
      passportCountry: primaryTraveler?.passport_country ?? '',
      gender:          primaryTraveler?.gender           ?? '',
      dietary:         primaryTraveler?.dietary_preference ?? 'none',
      seat:            primaryTraveler?.seat_preference   ?? 'none',
    });
    prevDobRef.current = primaryTraveler?.date_of_birth   ?? '';
    prevExpRef.current = primaryTraveler?.passport_expiry ?? '';
    setPassportEdit(true);
  };

  const savePassport = async () => {
    setSavingPassport(true);
    const fields = {
      full_name:          profile?.full_name ?? '',
      date_of_birth:      passportForm.dob            || null,
      passport_number:    passportForm.passportNo      || null,
      passport_expiry:    passportForm.passportExpiry  || null,
      passport_country:   passportForm.passportCountry || null,
      gender:             passportForm.gender          || null,
      dietary_preference: passportForm.dietary === 'none' ? null : passportForm.dietary,
      seat_preference:    passportForm.seat    === 'none' ? null : passportForm.seat,
      is_primary:         true,
    };
    if (primaryTraveler) {
      await updateTraveler(primaryTraveler.id, fields);
    } else {
      await addTraveler(fields);
    }
    await updateProfile({ dietary_preference: passportForm.dietary, dietary_confirmed: true });
    setSavingPassport(false);
    setPassportEdit(false);
  };

  const setPF = <K extends keyof PassportForm>(k: K, v: PassportForm[K]) =>
    setPassportForm(f => ({ ...f, [k]: v }));

  const toggleAirline = (code: string) => {
    const next = airlines.includes(code) ? airlines.filter(c => c !== code) : [...airlines, code];
    updateProfile({ preferred_airlines: next });
  };

  const toggleAvoid = (code: string) => {
    const next = avoided.includes(code) ? avoided.filter(c => c !== code) : [...avoided, code];
    updateProfile({ avoided_airports: next });
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
    if (editingTraveler) { await updateTraveler(editingTraveler.id, fields); }
    else { await addTraveler(fields); }
  };

  const confirmDelete = (t: SavedTraveler) =>
    Alert.alert('Remove traveler', `Remove ${t.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteTraveler(t.id) },
    ]);

  // ── Avatar upload ─────────────────────────────────────────────────────────

  const uploadAsset = async (uri: string, mimeType?: string) => {
    setUploadingAvatar(true);
    try {
      const contentType = mimeType ?? 'image/jpeg';
      const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp'
                : contentType === 'image/heic' ? 'heic' : contentType === 'image/heif' ? 'heif' : 'jpg';
      const path = `${profile!.id}/avatar.${ext}`;
      const arrayBuffer = await fetch(uri).then(r => r.arrayBuffer());
      const { error: uploadErr } = await supabase.storage
        .from('avatars').upload(path, arrayBuffer, { upsert: true, contentType });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally { setUploadingAvatar(false); }
  };

  const pickAndUploadAvatar = () => {
    Alert.alert('Change photo', '', [
      { text: 'Take Photo', onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
        if (!r.canceled && r.assets[0]) await uploadAsset(r.assets[0].uri, r.assets[0].mimeType ?? undefined);
      }},
      { text: 'Choose from Library', onPress: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
        if (!r.canceled && r.assets[0]) await uploadAsset(r.assets[0].uri, r.assets[0].mimeType ?? undefined);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const initials = fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // ── Render ────────────────────────────────────────────────────────────────

  const inputStyle = {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: fontSize.body, color: colors.text,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 60 }}>

        {/* Page header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Text style={{ fontSize: fontSize.header, fontWeight: '800', color: colors.text }}>My Profile</Text>
          <PageLogo variant="tab" />
        </View>

        {/* ── Identity hero ──────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#FFF', borderRadius: 20,
          borderWidth: 1, borderColor: colors.border,
          padding: 20, alignItems: 'center', marginBottom: 20,
        }}>
          {/* Avatar */}
          <TouchableOpacity onPress={pickAndUploadAvatar} disabled={uploadingAvatar} style={{ marginBottom: 16 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44 }}>
              {profile?.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={{ width: 88, height: 88, borderRadius: 44 }} resizeMode="cover" />
                : <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff' }}>{initials}</Text>
                  </View>
              }
              <View style={{
                position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14,
                backgroundColor: uploadingAvatar ? colors.textMuted : colors.accent,
                borderWidth: 2.5, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center',
              }}>
                {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ fontSize: 13, color: '#fff' }}>✎</Text>}
              </View>
            </View>
          </TouchableOpacity>

          {/* Name — inline edit */}
          {nameEdit ? (
            <View style={{ width: '100%', gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>First name</Text>
                  <TextInput value={firstName} onChangeText={setFirstName} autoCapitalize="words"
                    autoFocus style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Last name</Text>
                  <TextInput value={lastName} onChangeText={setLastName} autoCapitalize="words"
                    style={inputStyle} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setNameEdit(false)} style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                  borderColor: colors.border, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: fontSize.label, color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveNameEdit} disabled={savingName} style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: colors.accent, alignItems: 'center',
                }}>
                  {savingName ? <ActivityIndicator color="#fff" />
                    : <Text style={{ fontSize: fontSize.label, color: '#fff', fontWeight: '700' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={openNameEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                  {fullName || 'Set your name'}
                </Text>
                <Text style={{ fontSize: 15, color: colors.textMuted }}>✎</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 10 }}>
                {profile?.email ?? ''}
              </Text>
              {(profile?.phone || profile?.home_origin) && (
                <View style={{ alignItems: 'center', gap: 2, marginBottom: 6 }}>
                  {profile?.phone && <Text style={{ fontSize: 13, color: colors.textMuted }}>{profile.phone}</Text>}
                  {profile?.home_origin && profile?.home_destination && (
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>{profile.home_origin} ↔ {profile.home_destination}</Text>
                  )}
                </View>
              )}
              <TouchableOpacity onPress={() => {
                setPhone(profile?.phone ?? '');
                setOrigin(profile?.home_origin ?? '');
                setDest(profile?.home_destination ?? '');
                setShowContact(true);
              }} style={{
                marginTop: 8, paddingHorizontal: 20, paddingVertical: 8,
                borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
                  {profile?.phone ? 'Edit phone & route' : 'Add phone & home route'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── My passport & preferences (inline) ───────────────────── */}
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
              My passport & preferences
            </Text>
            {!passportEdit && (
              <TouchableOpacity onPress={openPassportEdit}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                  {primaryTraveler ? 'Edit' : '+ Add'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {passportEdit ? (
            <View style={{ padding: 16 }}>
              {/* Date fields side by side */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Date of birth</Text>
                  <TextInput value={passportForm.dob} keyboardType="numeric" placeholder="YYYY-MM-DD"
                    placeholderTextColor="#B0B0B0"
                    onChangeText={v => { const f = formatDateInput(v, prevDobRef.current); prevDobRef.current = f; setPF('dob', f); }}
                    style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Nationality</Text>
                  <TextInput value={passportForm.passportCountry}
                    onChangeText={v => setPF('passportCountry', v.toUpperCase().slice(0,2))}
                    autoCapitalize="characters" maxLength={2} placeholder="US"
                    placeholderTextColor="#B0B0B0" style={inputStyle} />
                </View>
              </View>

              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Gender</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {([{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }] as const).map(g => {
                    const active = passportForm.gender === g.value;
                    return (
                      <TouchableOpacity key={g.value} onPress={() => setPF('gender', g.value)} style={{
                        flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center',
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                      }}>
                        <Text style={{ fontSize: fontSize.body, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Passport number</Text>
                <TextInput value={passportForm.passportNo}
                  onChangeText={v => setPF('passportNo', v.toUpperCase())}
                  autoCapitalize="characters" placeholder="A1234567"
                  placeholderTextColor="#B0B0B0" style={inputStyle} />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Passport expiry</Text>
                <TextInput value={passportForm.passportExpiry} keyboardType="numeric" placeholder="YYYY-MM-DD"
                  placeholderTextColor="#B0B0B0"
                  onChangeText={v => { const f = formatDateInput(v, prevExpRef.current); prevExpRef.current = f; setPF('passportExpiry', f); }}
                  style={inputStyle} />
              </View>

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Meal preference</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {DIETARY.map(d => {
                  const active = passportForm.dietary === d.value;
                  return (
                    <TouchableOpacity key={d.value} onPress={() => setPF('dietary', d.value)} style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>Seat preference</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                {SEAT_PREF.map(s => {
                  const active = passportForm.seat === s.value;
                  return (
                    <TouchableOpacity key={s.value} onPress={() => setPF('seat', s.value)} style={{
                      paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setPassportEdit(false)} style={{
                  flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
                  borderColor: colors.border, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: fontSize.label, color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={savePassport} disabled={savingPassport} style={{
                  flex: 2, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: colors.accent, alignItems: 'center',
                }}>
                  {savingPassport ? <ActivityIndicator color="#fff" />
                    : <Text style={{ fontSize: fontSize.label, color: '#fff', fontWeight: '700' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : primaryTraveler ? (
            <>
              <InfoRow label="Date of birth" value={primaryTraveler.date_of_birth    ?? ''} />
              <InfoRow label="Gender"        value={primaryTraveler.gender === 'm' ? 'Male' : primaryTraveler.gender === 'f' ? 'Female' : ''} />
              <InfoRow label="Passport"      value={maskPassport(primaryTraveler.passport_number)} />
              <InfoRow label="Nationality"   value={primaryTraveler.passport_country  ?? ''} />
              <InfoRow label="Expires"       value={primaryTraveler.passport_expiry   ?? ''} />
              <InfoRow label="Meal"          value={DIETARY_LABEL[primaryTraveler.dietary_preference ?? 'none']} />
              <InfoRow label="Seat"          value={
                primaryTraveler.seat_preference === 'window' ? 'Window'
                : primaryTraveler.seat_preference === 'aisle' ? 'Aisle'
                : 'No preference'} />
            </>
          ) : (
            <TouchableOpacity onPress={openPassportEdit} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28, color: colors.accent }}>✈</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.text }}>Add your passport details</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Pre-fills passenger form at booking</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Default bags ──────────────────────────────────────────── */}
        <SectionCard title="Default bags">
          <BagStepper value={bagCount} onChange={n => updateProfile({ default_bag_count: n })} />
        </SectionCard>

        {/* ── Preferred airlines ────────────────────────────────────── */}
        <SectionCard title="Preferred airlines">
          <ChipGrid items={AIRLINES} selected={airlines} onToggle={toggleAirline} showLogos />
        </SectionCard>

        {/* ── Airports to avoid ─────────────────────────────────────── */}
        <SectionCard title="Airports to avoid">
          <ChipGrid items={AVOID_AIRPORTS} selected={avoided} onToggle={toggleAvoid} />
        </SectionCard>

        {/* ── Family & co-travelers ─────────────────────────────────── */}
        <SectionCard
          title="Family & co-travelers"
          actionLabel="+ Add"
          onAction={() => { setEditingTraveler(null); setTravelerModal(true); }}
        >
          {coTravelers.length === 0 ? (
            <Text style={{ padding: 16, fontSize: fontSize.label, color: colors.textMuted }}>
              Add family members to auto-fill their details at booking.
            </Text>
          ) : coTravelers.map((t, i) => (
            <View key={t.id} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, paddingVertical: 12,
              borderBottomWidth: i < coTravelers.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0',
            }}>
              <View style={{
                width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E7EB',
                alignItems: 'center', justifyContent: 'center', marginRight: 12,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted }}>
                  {t.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.text }}>{t.full_name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                  {[t.passport_country, t.dietary_preference ? DIETARY_LABEL[t.dietary_preference] : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingTraveler(t); setTravelerModal(true); }} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(t)} style={{ paddingLeft: 4, paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>

        {/* ── Sign out ──────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => Alert.alert('Sign out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])}
          style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FEE2E2' }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#DC2626' }}>Sign out</Text>
        </TouchableOpacity>

        {/* ── Delete account ────────────────────────────────────────── */}
        <TouchableOpacity
          disabled={deleting}
          onPress={() =>
            Alert.alert('Delete account', 'This permanently deletes your account and all saved data.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete account', style: 'destructive',
                onPress: () => Alert.alert('Are you absolutely sure?', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Yes, delete everything', style: 'destructive', onPress: async () => {
                    setDeleting(true);
                    try { await deleteAccount(); await signOut(); }
                    catch (err) { setDeleting(false); Alert.alert('Error', err instanceof Error ? err.message : 'Please try again.'); }
                  }},
                ]),
              },
            ])
          }
          style={{ marginTop: 10, paddingVertical: 14, alignItems: 'center' }}
        >
          {deleting ? <ActivityIndicator color={colors.textMuted} />
            : <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Delete account</Text>}
        </TouchableOpacity>

      </ScrollView>

      {/* ── Contact modal (phone + home route) ──────────────────────── */}
      <Modal visible={showContact} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.pagePadding, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <TouchableOpacity onPress={() => setShowContact(false)}>
              <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Phone & Home Route</Text>
            <TouchableOpacity onPress={async () => {
              setSavingContact(true);
              await updateProfile({
                phone:            phone.trim()  || undefined,
                home_origin:      origin.toUpperCase().slice(0,3) || null,
                home_destination: dest.toUpperCase().slice(0,3)   || null,
              } as Partial<UserProfile>);
              setSavingContact(false);
              setShowContact(false);
            }} disabled={savingContact}>
              {savingContact ? <ActivityIndicator color={colors.accent} />
                : <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 5 }}>Phone (with country code)</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000"
                placeholderTextColor="#B0B0B0" keyboardType="phone-pad" style={inputStyle} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 14, marginTop: 8 }}>Home corridor</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 5 }}>Usually fly from</Text>
                <TextInput value={origin} onChangeText={v => setOrigin(v.toUpperCase().slice(0,3))}
                  placeholder="JFK" placeholderTextColor="#B0B0B0"
                  autoCapitalize="characters" maxLength={3} style={inputStyle} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 5 }}>Usually fly to</Text>
                <TextInput value={dest} onChangeText={v => setDest(v.toUpperCase().slice(0,3))}
                  placeholder="DEL" placeholderTextColor="#B0B0B0"
                  autoCapitalize="characters" maxLength={3} style={inputStyle} />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Co-traveler modal ────────────────────────────────────────── */}
      <TravelerModal
        visible={travelerModal}
        traveler={editingTraveler}
        onClose={() => { setTravelerModal(false); setEditingTraveler(null); }}
        onSave={handleTravelerSave}
      />
    </SafeAreaView>
  );
}
