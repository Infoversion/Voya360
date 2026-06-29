import { View, Text, TouchableOpacity } from 'react-native';
import { useSearchStore } from '@/store/search.store';
import { colors, fontSize } from '@/constants/design';

const BAG_PRICE_EST = 65; // per bag estimate when not included

interface Props {
  bagsIncluded: number; // how many bags the offer includes
  maxBags?:     number;
}

export function BaggageAddons({ bagsIncluded, maxBags = 3 }: Props) {
  const { bagCount, setBagCount } = useSearchStore();

  const extraBags  = Math.max(0, bagCount - bagsIncluded);
  const extraCost  = extraBags * BAG_PRICE_EST;

  return (
    <View style={{
      borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 14, padding: 16, marginBottom: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, flex: 1 }}>
          CHECKED BAGS
        </Text>
        {bagsIncluded > 0 && (
          <View style={{
            backgroundColor: `${colors.success}15`,
            borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>
              {bagsIncluded} bag{bagsIncluded > 1 ? 's' : ''} included
            </Text>
          </View>
        )}
      </View>

      {/* Stepper */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <TouchableOpacity
          onPress={() => setBagCount(Math.max(0, bagCount - 1))}
          disabled={bagCount === 0}
          style={{
            width: 40, height: 40, borderRadius: 20,
            borderWidth: 1.5,
            borderColor: bagCount === 0 ? colors.border : colors.accent,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: 22, lineHeight: 26,
            color: bagCount === 0 ? colors.border : colors.accent,
          }}>−</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>{bagCount}</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            {bagCount === 1 ? 'bag' : 'bags'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setBagCount(Math.min(maxBags, bagCount + 1))}
          disabled={bagCount >= maxBags}
          style={{
            width: 40, height: 40, borderRadius: 20,
            borderWidth: 1.5,
            borderColor: bagCount >= maxBags ? colors.border : colors.accent,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: 22, lineHeight: 26,
            color: bagCount >= maxBags ? colors.border : colors.accent,
          }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Cost breakdown */}
      <View style={{ marginTop: 14, gap: 4 }}>
        {bagsIncluded > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              Included ({bagsIncluded} bag{bagsIncluded > 1 ? 's' : ''})
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.success, fontWeight: '600' }}>
              Free
            </Text>
          </View>
        )}
        {extraBags > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              Extra bags ({extraBags} × ~${BAG_PRICE_EST})
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.warning, fontWeight: '600' }}>
              ~${extraCost}
            </Text>
          </View>
        )}
        {bagCount === 0 && (
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
            Travel carry-on only
          </Text>
        )}
      </View>
    </View>
  );
}
