import { View, Text } from 'react-native';
import { colors } from '@/constants/design';

type BadgeType = 'fastest' | 'cheapest' | 'best_value' | 'preferred_airline' | 'vayo_pick';

interface Props {
  type: BadgeType;
}

const BADGE_CONFIG: Record<BadgeType, { label: string; color: string; bg: string }> = {
  fastest:           { label: 'Fastest',          color: '#2563EB', bg: '#EFF6FF' },
  cheapest:          { label: 'Cheapest',          color: colors.success, bg: '#F0FDF4' },
  best_value:        { label: 'Best value',        color: colors.accent, bg: `${colors.accent}15` },
  preferred_airline: { label: 'Your airline',      color: '#7C3AED', bg: '#F5F3FF' },
  vayo_pick:         { label: "Vayo's pick",       color: '#9333EA', bg: '#FAF5FF' },
};

export function SmartBadge({ type }: Props) {
  const cfg = BADGE_CONFIG[type];
  return (
    <View style={{
      backgroundColor:  cfg.bg,
      borderRadius:     6,
      paddingHorizontal: 8,
      paddingVertical:  3,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>
        {cfg.label}
      </Text>
    </View>
  );
}
