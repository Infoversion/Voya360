import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

function ServiceFeeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{
        backgroundColor: colors.background,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, paddingBottom: 40,
        position: 'absolute', bottom: 0, left: 0, right: 0,
      }}>
        {/* Drag handle */}
        <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
          Why a $9.99 service fee?
        </Text>

        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginBottom: 2 }}>Flat fee. Always.</Text>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted, lineHeight: 20 }}>
                We charge a single flat $9.99 fee per booking — no percentage markup, no hidden spread on the fare. What the airline charges is exactly what you see as your base fare.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginBottom: 2 }}>No fare markup</Text>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted, lineHeight: 20 }}>
                Most travel sites quietly add 5–15% on top of the airline fare. We don't. Our fee is visible, separate, and the same for a $200 ticket as a $2,000 one.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>🤝</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginBottom: 2 }}>What it pays for</Text>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted, lineHeight: 20 }}>
                24/7 booking support, real-ticket issuance (not a redirect), Z@r@'s AI insights, and price alerts — all included for every booking.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={{
            marginTop: 24, backgroundColor: colors.accent,
            borderRadius: 12, paddingVertical: 14, alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#FFFFFF' }}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export function PriceSummary({ offer, bagCount, label = 'Continue', loading, onPress, disabled }: Props) {
  const cost = calculateCost(offer, bagCount);
  const [showFeeInfo, setShowFeeInfo] = useState(false);

  return (
    <View style={{
      paddingTop: 14,
      paddingBottom: 28,
    }}>
      {/* Line items */}
      <View style={{ gap: 6, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Base fare</Text>
          <Text style={{ fontSize: fontSize.label, color: colors.text }}>${cost.baseFare.toFixed(2)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setShowFeeInfo(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>Service fee</Text>
            <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.label, color: colors.text }}>${cost.serviceFee.toFixed(2)}</Text>
        </View>
        {cost.baggageFee > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
              Baggage (~{bagCount - cost.bagsIncluded} bag{bagCount - cost.bagsIncluded > 1 ? 's' : ''})
            </Text>
            <Text style={{ fontSize: fontSize.label, color: colors.warning }}>+${cost.baggageFee.toFixed(2)}</Text>
          </View>
        )}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Total you pay</Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.accent }}>${Math.round(cost.total)}</Text>
        </View>
      </View>

      <Button label={label} onPress={onPress} loading={loading} disabled={disabled} large />
      <ServiceFeeSheet visible={showFeeInfo} onClose={() => setShowFeeInfo(false)} />
    </View>
  );
}
