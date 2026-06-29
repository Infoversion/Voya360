import { useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { colors, fontSize, spacing } from '@/constants/design';
import { PriceAlert, CabinClass } from '@/types/booking';

const CABINS: { value: CabinClass; label: string }[] = [
  { value: 'economy',         label: 'Economy'  },
  { value: 'premium_economy', label: 'Premium'  },
  { value: 'business',        label: 'Business' },
  { value: 'first',           label: 'First'    },
];

// ── New alert modal ───────────────────────────────────────────────────────────

interface AlertForm {
  origin:      string;
  destination: string;
  price:       string;
  cabin:       CabinClass;
}

const BLANK: AlertForm = { origin: '', destination: '', price: '', cabin: 'economy' };

function NewAlertModal({ visible, prefill, onClose, onCreate }: {
  visible:  boolean;
  prefill?: Partial<AlertForm>;
  onClose:  () => void;
  onCreate: (fields: { origin: string; destination: string; target_price_usd: number; cabin_class: string }) => Promise<boolean>;
}) {
  const [form,   setForm]   = useState<AlertForm>(BLANK);
  const [saving, setSaving] = useState(false);

  // Reset + apply prefill when modal opens
  useState(() => { if (visible) setForm({ ...BLANK, ...prefill }); });

  const set = <K extends keyof AlertForm>(k: K, v: AlertForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    const price = parseFloat(form.price);
    if (!form.origin.trim() || !form.destination.trim()) {
      Alert.alert('Route required', 'Enter both origin and destination IATA codes.'); return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid price', 'Enter a target price greater than $0.'); return;
    }
    setSaving(true);
    const ok = await onCreate({
      origin:           form.origin.toUpperCase().trim(),
      destination:      form.destination.toUpperCase().trim(),
      target_price_usd: price,
      cabin_class:      form.cabin,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.pagePadding, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>New Price Alert</Text>
          <TouchableOpacity onPress={handle} disabled={saving}>
            {saving
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }} keyboardShouldPersistTaps="handled">

          {/* Route */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>ROUTE</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>From</Text>
              <TextInput
                value={form.origin}
                onChangeText={v => set('origin', v.toUpperCase().slice(0, 3))}
                placeholder="JFK"
                placeholderTextColor="#B0B0B0"
                autoCapitalize="characters"
                maxLength={3}
                style={{
                  borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center',
                }}
              />
            </View>
            <View style={{ alignSelf: 'flex-end', paddingBottom: 12 }}>
              <Text style={{ fontSize: 20, color: colors.textMuted }}>✈</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>To</Text>
              <TextInput
                value={form.destination}
                onChangeText={v => set('destination', v.toUpperCase().slice(0, 3))}
                placeholder="DEL"
                placeholderTextColor="#B0B0B0"
                autoCapitalize="characters"
                maxLength={3}
                style={{
                  borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center',
                }}
              />
            </View>
          </View>

          {/* Target price */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>ALERT ME WHEN PRICE DROPS BELOW</Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textMuted, marginRight: 4 }}>$</Text>
            <TextInput
              value={form.price}
              onChangeText={v => set('price', v.replace(/[^0-9.]/g, ''))}
              placeholder="850"
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
              style={{ flex: 1, fontSize: 22, fontWeight: '700', color: colors.text }}
            />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>per person</Text>
          </View>

          {/* Cabin class */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>CABIN CLASS</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CABINS.map(c => {
              const active = form.cabin === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => set('cabin', c.value)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? `${colors.accent}12` : '#FAFAFA',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.textMuted }}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ marginTop: 28, padding: 14, backgroundColor: '#FEF3C7', borderRadius: 12 }}>
            <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 19 }}>
              💡 You'll get a push notification within 30 minutes of any qualifying price drop on this route.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, onDelete }: { alert: PriceAlert; onDelete: () => void }) {
  const triggered = !!alert.triggered_at;
  const cabinLabel = CABINS.find(c => c.value === alert.cabin_class)?.label ?? alert.cabin_class;

  return (
    <View style={{
      backgroundColor: '#FFF',
      borderRadius: 16, padding: 16, marginBottom: 12,
      borderWidth: 1,
      borderColor: triggered ? '#D1FAE5' : colors.border,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    }}>
      {/* Route row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
          {alert.origin} ✈ {alert.destination}
        </Text>
        <View style={{
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
          backgroundColor: triggered ? '#D1FAE5' : `${colors.accent}15`,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700',
            color: triggered ? '#065F46' : colors.accent,
          }}>
            {triggered ? 'TRIGGERED' : 'ACTIVE'}
          </Text>
        </View>
      </View>

      {/* Target price */}
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 2 }}>
        {triggered ? 'Price dropped below target' : 'Alert when price drops below'}
      </Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: triggered ? '#16A34A' : colors.accent, marginBottom: 4 }}>
        ${alert.target_price_usd.toFixed(0)}
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textMuted }}> per person</Text>
      </Text>

      {/* Cabin + triggered date */}
      <Text style={{ fontSize: 12, color: colors.textMuted }}>
        {cabinLabel}
        {triggered && alert.triggered_at
          ? ` · Triggered ${new Date(alert.triggered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : ''}
      </Text>

      {/* Delete */}
      <TouchableOpacity
        onPress={() =>
          Alert.alert('Delete alert', `Remove alert for ${alert.origin} → ${alert.destination}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])
        }
        style={{
          position: 'absolute', top: 14, right: 52,
          paddingHorizontal: 6, paddingVertical: 4,
        }}
      />
      <TouchableOpacity
        onPress={() =>
          Alert.alert('Delete alert', `Remove alert for ${alert.origin} → ${alert.destination}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])
        }
        style={{
          marginTop: 12, alignSelf: 'flex-start',
          paddingHorizontal: 12, paddingVertical: 6,
          borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2',
          backgroundColor: '#FFF5F5',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Remove alert</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const { alerts, loading, createAlert, deleteAlert } = usePriceAlerts();
  const [showModal, setShowModal] = useState(false);

  const active    = alerts.filter(a =>  a.is_active && !a.triggered_at);
  const triggered = alerts.filter(a => !a.is_active &&  a.triggered_at);

  const handleCreate = async (fields: {
    origin: string; destination: string; target_price_usd: number; cabin_class: string;
  }) => {
    const result = await createAlert(fields);
    return !!result;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={require('@/assets/logo.png')} style={{ width: 34, height: 34, borderRadius: 17 }} resizeMode="cover" />
            <Text style={{ fontSize: fontSize.header, fontWeight: '800', color: colors.text }}>Price Alerts</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.accent, borderRadius: 20,
              paddingHorizontal: 14, paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 16, color: '#fff' }}>🔔</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>New alert</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />}

        {/* Empty state */}
        {!loading && alerts.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginTop: 16 }}>
              No price alerts yet
            </Text>
            <Text style={{
              fontSize: fontSize.label, color: colors.textMuted,
              marginTop: 6, textAlign: 'center', lineHeight: 20,
            }}>
              Set a target price for any route.{'\n'}We'll notify you the moment it drops.
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={{
                marginTop: 24, backgroundColor: colors.accent,
                borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>Set an alert</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active alerts */}
        {active.length > 0 && (
          <>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.7, marginBottom: 10 }}>
              WATCHING
            </Text>
            {active.map(a => (
              <AlertCard key={a.id} alert={a} onDelete={() => deleteAlert(a.id)} />
            ))}
          </>
        )}

        {/* Triggered alerts */}
        {triggered.length > 0 && (
          <>
            <Text style={{
              fontSize: 11, fontWeight: '800', color: colors.textMuted,
              letterSpacing: 0.7, marginBottom: 10,
              marginTop: active.length > 0 ? 16 : 0,
            }}>
              TRIGGERED
            </Text>
            {triggered.map(a => (
              <AlertCard key={a.id} alert={a} onDelete={() => deleteAlert(a.id)} />
            ))}
          </>
        )}
      </ScrollView>

      <NewAlertModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}
