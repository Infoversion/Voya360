import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

interface Props {
  bagsIncluded: number;
}

export function BaggageBadge({ bagsIncluded }: Props) {
  const hasNone = bagsIncluded === 0;

  const bg    = hasNone ? `${colors.warning}18` : `${colors.success}18`;
  const color = hasNone ? colors.warning        : colors.success;
  const icon  = hasNone ? '✗' : '✓';
  const label = hasNone
    ? 'No checked bags'
    : `${bagsIncluded} checked bag${bagsIncluded > 1 ? 's' : ''} allowed`;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: bg, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 4,
      alignSelf: 'flex-start',
    }}>
      <Ionicons name="briefcase-outline" size={13} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{icon}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}
