import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { VoyaObservation } from '@/types/voya';
import { colors, fontSize, spacing } from '@/constants/design';

interface Props {
  observation: VoyaObservation;
  onDismiss:   (id: string) => void;
}

export function VoyaCard({ observation, onDismiss }: Props) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss(observation.id));
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], marginHorizontal: spacing.pagePadding, marginBottom: 12 }}>
      <View style={{
        backgroundColor: '#FFF7ED',
        borderRadius:    12,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent,
        paddingVertical:   12,
        paddingLeft:       14,
        paddingRight:      40,
        shadowColor:     '#000',
        shadowOpacity:   0.06,
        shadowRadius:    6,
        shadowOffset:    { width: 0, height: 2 },
        elevation:       2,
      }}>
        {/* Voya label */}
        <Text style={{
          fontSize: 10, fontWeight: '700', letterSpacing: 1,
          color: colors.accent, marginBottom: 3,
        }}>
          VOYA
        </Text>

        <Text style={{
          fontSize: fontSize.label, fontWeight: '700',
          color: colors.text, marginBottom: 3,
        }}>
          {observation.headline}
        </Text>

        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
          {observation.body}
        </Text>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          style={{ position: 'absolute', top: 10, right: 12 }}
        >
          <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '300' }}>×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
