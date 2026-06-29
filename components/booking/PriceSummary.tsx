import { View, Text } from 'react-native';
import { DuffelOffer } from '@/types/duffel';
import { calculateCost } from '@/engine/total-cost';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing } from '@/constants/design';

interface Props {
  offer:      DuffelOffer;
  bagCount:   number;
  label?:     string;
  loading?:   boolean;
  onPress:    () => void;
  disabled?:  boolean;
}

export function PriceSummary({ offer, bagCount, label = 'Continue', loading, onPress, disabled }: Props) {
  const cost = calculateCost(offer, bagCount);

  return (
    <View style={{
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.pagePadding,
      paddingTop: 14,
      paddingBottom: 28,
    }}>
      {/* Line items */}
      <View style={{ gap: 6, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Base fare</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.text }}>${cost.baseFare.toFixed(2)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Service fee</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.text }}>${cost.serviceFee.toFixed(2)}</Text>
        </View>
        {cost.baggageFee > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              Baggage (~{bagCount - cost.bagsIncluded} bag{bagCount - cost.bagsIncluded > 1 ? 's' : ''})
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.warning }}>~${cost.baggageFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Total you pay</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.accent }}>${Math.round(cost.total)}</Text>
        </View>
      </View>

      <Button label={label} onPress={onPress} loading={loading} disabled={disabled} />
    </View>
  );
}
