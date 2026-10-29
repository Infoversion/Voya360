import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize } from '@/constants/design';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const HOW_IT_WORKS_STEPS: Array<{ icon: IoniconName; title: string; body: string }> = [
  {
    icon:  'search-outline',
    title: 'Step 1 · Search (~60 sec)',
    body:  'Enter From/To, pick your dates, and set passengers. Voya remembers your saved corridor and travelers so returning searches take seconds.',
  },
  {
    icon:  'albums-outline',
    title: 'Step 2 · Select (~90 sec)',
    body:  'Results appear as a swipeable card deck — swipe left/right to browse flights, or tap "Show all as list" for a flat view. Long-press a fare chip on any card to compare what\'s included (bags, seat selection, flexibility) before picking.',
  },
  {
    icon:  'people-outline',
    title: 'Step 3 · Review & Confirm (~90–150 sec)',
    body:  'Fill in passenger details (saved travelers auto-fill in one tap), review the total price including bags and fees, then confirm and pay.',
  },
];

const VISION_POINTS: Array<{ icon: IoniconName; title: string; body: string }> = [
  {
    icon:  'eye-outline',
    title: 'Transparency',
    body:  'Real fares, real fees — no hidden markups. What you see is what you pay.',
  },
  {
    icon:  'wallet-outline',
    title: 'Cost-effective',
    body:  'One flat $9.99 service fee per booking — not per ticket, not a percentage. We aim to pass the savings to you.',
  },
  {
    icon:  'flash-outline',
    title: 'Speed',
    body:  'Search to confirmed ticket in 3 simple steps — most bookings finish in under 5 minutes.',
  },
];

function InfoSection({ label, points }: { label: string; points: typeof HOW_IT_WORKS_STEPS }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6 }}>
        {label}
      </Text>
      {points.map(point => (
        <View key={point.title} style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name={point.icon} size={18} color={colors.accent} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
              {point.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
              {point.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function HowItWorksCard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{
      borderWidth: 1.5,
      borderColor: expanded ? colors.accent : colors.border,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingVertical: 12,
        }}
      >
        <Ionicons name="help-circle-outline" size={20} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.text }}>
            How Voya360 works
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
            Our vision, and how to book in under 5 minutes
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 16 }}>
          <View style={{ height: 1, backgroundColor: colors.border }} />

          <InfoSection label="OUR VISION" points={VISION_POINTS} />

          <View style={{ height: 1, backgroundColor: colors.border }} />

          <InfoSection label="HOW IT WORKS" points={HOW_IT_WORKS_STEPS} />

          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: `${colors.accent}10`, borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 10,
          }}>
            <Ionicons name="compass-outline" size={16} color={colors.accent} />
            <Text style={{ fontSize: 12, color: colors.text, flex: 1, lineHeight: 17 }}>
              We encourage you to do your due diligence and compare fares with the big players first — then book with us once you're satisfied.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
