import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { VoyaObservation } from '@/types/voya';
import { useVoyaStore } from '@/store/voya.store';
import { colors, fontSize, spacing } from '@/constants/design';

const SWIPE_THRESHOLD     = 80;
const SWIPE_VEL_THRESHOLD = 0.5;

interface Props {
  observation: VoyaObservation;
  onDismiss:   (id: string) => void;
}

export function VoyaCard({ observation, onDismiss }: Props) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const rotate = translateX.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-6deg', '0deg', '6deg'],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const flyOff = (direction: 1 | -1) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: direction * 400, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,               duration: 220, useNativeDriver: true }),
    ]).start(() => onDismiss(observation.id));
  };

  const returnCard = () => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => {
      useVoyaStore.getState().goBack(observation.screen, observation.id);
    });
  };

  const snapBack = () => {
    Animated.spring(translateX, {
      toValue: 0, useNativeDriver: true,
      tension: 80, friction: 10,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove:  (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const triggered = Math.abs(g.dx) > SWIPE_THRESHOLD || Math.abs(g.vx) > SWIPE_VEL_THRESHOLD;
        if (!triggered) { snapBack(); return; }
        if (g.dx < 0) {
          flyOff(-1);
        } else {
          const store = useVoyaStore.getState();
          if (store.hasPreviousForScreen(observation.screen, observation.id)) {
            returnCard();
          } else {
            snapBack();
          }
        }
      },
      onPanResponderTerminate: snapBack,
    })
  ).current;

  const handleDismiss = () => flyOff(1);

  return (
    <View style={{ marginHorizontal: spacing.pagePadding, marginBottom: 16 }}>
      {/* Main card — zIndex 2 keeps it above the ghost strips */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
          zIndex: 2,
        }}
      >
        <View style={{
          backgroundColor: '#FFF7ED',
          borderRadius:    12,
          borderLeftWidth: 3,
          borderLeftColor: colors.accent,
          paddingVertical:  12,
          paddingLeft:      14,
          paddingRight:     40,
          shadowColor:      '#000',
          shadowOpacity:    0.06,
          shadowRadius:     6,
          shadowOffset:     { width: 0, height: 2 },
          elevation:        2,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.accent, marginBottom: 3 }}>
            VOYA
          </Text>
          <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.text, marginBottom: 3 }}>
            {observation.headline}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>
            {observation.body}
          </Text>

          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            style={{ position: 'absolute', top: 10, right: 12 }}
          >
            <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '300' }}>×</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Ghost strip 1 — peeks 6px below main card, zIndex 1 goes behind main card */}
      <View style={{
        height: 10,
        backgroundColor: '#FEF0E0',
        borderRadius: 12,
        marginHorizontal: 6,
        marginTop: -6,
        zIndex: 1,
      }} />

      {/* Ghost strip 2 — peeks 6px below strip 1, zIndex 0 goes behind strip 1 */}
      <View style={{
        height: 10,
        backgroundColor: '#FDEBD8',
        borderRadius: 12,
        marginHorizontal: 12,
        marginTop: -4,
        zIndex: 0,
      }} />
    </View>
  );
}
