import React from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { PassengerCounts } from '@/store/search.store';
import { colors, fontSize } from '@/constants/design';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Props {
  value:    PassengerCounts;
  onChange: (counts: Partial<PassengerCounts>) => void;
}

const TYPES: {
  key:      keyof PassengerCounts;
  ionicon:  React.ComponentProps<typeof Ionicons>['name'];
  label:    string;
  sub:      string;
}[] = [
  { key: 'adults',   ionicon: 'person-outline',  label: 'Adults',   sub: '12 and over'   },
  { key: 'children', ionicon: 'body-outline',    label: 'Children', sub: 'Ages 2–11'     },
  { key: 'infants',  ionicon: 'happy-outline',   label: 'Infants',  sub: 'Under 2 · lap' },
];

function Stepper({ value, onDecrement, onIncrement, min, max }: {
  value: number; onDecrement: () => void; onIncrement: () => void; min: number; max: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <TouchableOpacity
        onPress={onDecrement}
        disabled={value <= min}
        style={{
          width: 32, height: 32, borderRadius: 16,
          borderWidth: 1.5,
          borderColor: value <= min ? colors.border : colors.accent,
          alignItems: 'center', justifyContent: 'center',
          opacity: value <= min ? 0.35 : 1,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.accent, lineHeight: 22 }}>−</Text>
      </TouchableOpacity>

      <Text style={{ width: 28, textAlign: 'center', fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
        {value}
      </Text>

      <TouchableOpacity
        onPress={onIncrement}
        disabled={value >= max}
        style={{
          width: 32, height: 32, borderRadius: 16,
          borderWidth: 1.5,
          borderColor: value >= max ? colors.border : colors.accent,
          alignItems: 'center', justifyContent: 'center',
          opacity: value >= max ? 0.35 : 1,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.accent, lineHeight: 22 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PassengerStepper({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const total = value.adults + value.children + value.infants;

  const decrement = (key: keyof PassengerCounts) => {
    onChange({ [key]: Math.max(key === 'adults' ? 1 : 0, value[key] - 1) });
  };
  const increment = (key: keyof PassengerCounts) => {
    if (total >= 9) return;
    if (key === 'infants' && value.infants >= value.adults) return;
    onChange({ [key]: value[key] + 1 });
  };
  const maxFor = (key: keyof PassengerCounts) =>
    key === 'infants'
      ? Math.min(value.adults, 9 - total + value.infants)
      : 9 - total + value[key];

  // Summary label: "1 Adult", "2 Adults · 1 Child", etc.
  const summary = [
    `${value.adults} Adult${value.adults > 1 ? 's' : ''}`,
    value.children > 0 ? `${value.children} Child${value.children > 1 ? 'ren' : ''}` : null,
    value.infants  > 0 ? `${value.infants} Infant${value.infants > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  return (
    <View>
      <View style={{
        borderWidth:   1.5,
        borderColor:   expanded ? colors.accent : colors.border,
        borderRadius:  14,
        overflow:      'hidden',
        backgroundColor: colors.background,
      }}>
        {/* ── Summary pill — always visible ───────────────────────────── */}
        <TouchableOpacity
          onPress={toggle}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 14, paddingVertical: 13,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={total === 1 ? 'person-outline' : 'people-outline'} size={20} color={colors.textMuted} />
            <Text style={{ fontSize: fontSize.label, fontWeight: '400', color: colors.text }}>
              {summary}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 4 }}>
            {expanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {/* ── Expanded stepper rows ────────────────────────────────────── */}
        {expanded && (
          <>
            <View style={{ height: 1, backgroundColor: `${colors.accent}30` }} />
            {TYPES.map((t, i) => (
              <View key={t.key}>
                {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 14, paddingVertical: 12,
                }}>
                  <Ionicons name={t.ionicon} size={22} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.text }}>
                      {t.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{t.sub}</Text>
                  </View>
                  <Stepper
                    value={value[t.key]}
                    min={t.key === 'adults' ? 1 : 0}
                    max={maxFor(t.key)}
                    onDecrement={() => decrement(t.key)}
                    onIncrement={() => increment(t.key)}
                  />
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      {expanded && value.infants > 0 && (
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, marginLeft: 2 }}>
          * Infants sit on a parent's lap · max 1 per adult
        </Text>
      )}
    </View>
  );
}
