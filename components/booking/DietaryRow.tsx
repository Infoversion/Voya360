import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { inferDietary, dietaryLabel } from '@/engine/dietary-inference';
import type { DietaryPreference } from '@/types/booking';
import { colors, fontSize } from '@/constants/design';

const OPTIONS: DietaryPreference[] = ['none', 'halal', 'vegetarian', 'kosher', 'vegan'];

interface Props {
  fullName:  string;
  value:     DietaryPreference | null;
  onChange:  (pref: DietaryPreference) => void;
}

export function DietaryRow({ fullName, value, onChange }: Props) {
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const inference = inferDietary(fullName);
  const showNudge = !nudgeDismissed
    && !!inference
    && (!value || value === 'none')
    && inference.preference !== 'none';

  // Auto-apply on name change if user hasn't set a preference yet
  useEffect(() => {
    if (inference && (!value || value === 'none')) {
      onChange(inference.preference);
    }
  }, [fullName]);

  const current = value ?? 'none';

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 8, fontWeight: '500' }}>
        Meal preference
      </Text>

      {/* Voya inference nudge */}
      {showNudge && (
        <View style={{
          backgroundColor: `${colors.accent}10`,
          borderLeftWidth: 3,
          borderLeftColor: colors.accent,
          borderRadius: 8,
          padding: 10,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{ fontSize: fontSize.label, color: colors.text, flex: 1 }}>
            Voya detected{' '}
            <Text style={{ fontWeight: '700' }}>{dietaryLabel(inference.preference)}</Text>
            {inference.confidence === 'high' ? ' (strong match)' : ''}
          </Text>
          <TouchableOpacity onPress={() => setNudgeDismissed(true)} style={{ paddingLeft: 8 }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chip selector */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OPTIONS.map(opt => {
          const active = current === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? `${colors.accent}12` : colors.background,
              }}
            >
              <Text style={{
                fontSize: fontSize.label,
                fontWeight: active ? '700' : '400',
                color: active ? colors.accent : colors.textMuted,
              }}>
                {dietaryLabel(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
