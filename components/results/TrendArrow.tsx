import { View, Text } from 'react-native';
import { colors } from '@/constants/design';
import type { PriceTrend } from '@/engine/price-trends';

interface Props {
  trend: PriceTrend;
}

export function TrendArrow({ trend }: Props) {
  if (trend === 'stable') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>→ Stable price</Text>
      </View>
    );
  }

  const up    = trend === 'up';
  const color = up ? colors.warning : colors.success;
  const arrow = up ? '↑' : '↓';
  const label = up ? 'Rising' : 'Dropping';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ fontSize: 12, color, fontWeight: '700' }}>{arrow}</Text>
      <Text style={{ fontSize: 11, color, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
