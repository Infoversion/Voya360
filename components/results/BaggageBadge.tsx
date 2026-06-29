import { View, Text } from 'react-native';
import { colors } from '@/constants/design';

interface Props {
  bagsIncluded: number;
  bagsNeeded:   number;
}

export function BaggageBadge({ bagsIncluded, bagsNeeded }: Props) {
  const hasAll     = bagsIncluded >= bagsNeeded;
  const hasNone    = bagsIncluded === 0;

  const bg    = hasAll ? `${colors.success}18` : hasNone ? `${colors.warning}18` : `${colors.accent}18`;
  const color = hasAll ? colors.success       : hasNone ? colors.warning       : colors.accent;

  const icon  = hasAll ? '✓' : hasNone ? '✗' : '~';
  const label = hasAll
    ? `${bagsIncluded} bag${bagsIncluded > 1 ? 's' : ''} free`
    : hasNone
    ? 'No free bags'
    : `${bagsIncluded} of ${bagsNeeded} bags free`;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: bg, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 4,
      alignSelf: 'flex-start',
    }}>
      {/* Suitcase icon */}
      <Text style={{ fontSize: 13 }}>🧳</Text>
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{icon}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}
