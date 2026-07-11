import { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, PanResponder, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlightCard } from './FlightCard';
import { getFlightIdentityKey } from '@/engine/fare-groups';
import { colors, fontSize, spacing } from '@/constants/design';
import type { DuffelOffer } from '@/types/duffel';
import type { PriceTrend } from '@/engine/price-trends';

const SWIPE_X_THRESHOLD  = 80;
const SWIPE_Y_THRESHOLD  = 100;
const SWIPE_VEL          = 0.5;
const BEHIND_COUNT       = 3;
const PEEK_HEIGHT        = 18;  // px of each background card visible above the top card
const SLIDER_THUMB       = 22;

// ── Seek slider — drag to jump to any card directly instead of swiping one
// at a time. Custom-built with PanResponder rather than a Slider library:
// @react-native-community/slider isn't installed, and adding it mid-session
// means another native-module pod-install + rebuild for a control this simple.
function CardSeekSlider({ total, index, onSeek }: {
  total:  number;
  index:  number;
  onSeek: (i: number) => void;
}) {
  const trackRef              = useRef<View>(null);
  const trackLayoutRef        = useRef({ pageX: 0, width: 0 });
  const lastSeekIndexRef      = useRef(index);
  lastSeekIndexRef.current    = index;

  const measureTrack = () => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      trackLayoutRef.current = { pageX, width };
    });
  };

  const seekToPageX = (pageX: number) => {
    const { pageX: trackX, width } = trackLayoutRef.current;
    if (width <= 0 || total <= 1) return;
    const relX     = Math.max(0, Math.min(width, pageX - trackX));
    const ratio    = relX / width;
    const newIndex = Math.round(ratio * (total - 1));
    if (newIndex !== lastSeekIndexRef.current) {
      lastSeekIndexRef.current = newIndex;
      onSeek(newIndex);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => seekToPageX(g.x0),
      onPanResponderMove:  (_, g) => seekToPageX(g.moveX),
    })
  ).current;

  const ratio     = total > 1 ? index / (total - 1) : 0;
  const trackW    = trackLayoutRef.current.width;
  const thumbLeft = Math.max(0, ratio * trackW - SLIDER_THUMB / 2);

  return (
    <View style={{ paddingHorizontal: spacing.pagePadding, marginBottom: 6 }}>
      <View
        ref={trackRef}
        onLayout={measureTrack}
        {...panResponder.panHandlers}
        style={{ height: SLIDER_THUMB + 10, justifyContent: 'center' }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        <View style={{
          position: 'absolute', left: 0, top: (SLIDER_THUMB + 10) / 2 - 2,
          height: 4, borderRadius: 2, backgroundColor: colors.accent,
          width: Math.max(SLIDER_THUMB / 2, ratio * trackW),
        }} />
        <View style={{
          position: 'absolute', left: thumbLeft, top: 5,
          width: SLIDER_THUMB, height: SLIDER_THUMB, borderRadius: SLIDER_THUMB / 2,
          backgroundColor: colors.accent, borderWidth: 2, borderColor: '#fff',
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 }, elevation: 3,
        }} />
      </View>
    </View>
  );
}

interface Props {
  offers:            DuffelOffer[];
  index:             number;
  onIndexChange:     (i: number) => void;
  onSwitchToList:    () => void;
  bagCount:          number;
  trend:             PriceTrend;
  showSliceIndex?:   number;
  onCardPress:       (offer: DuffelOffer) => void;
  cheapestId?:       string;
  fastestId?:        string;
  isBundled:         boolean;
  isRoundTrip:       boolean;
  preferredAirlines: string[];
  avoidedAirports:   string[];
  fareGroups?:       Record<string, DuffelOffer[]>;
}

export function CardDeckView({
  offers, index, onIndexChange, onSwitchToList,
  bagCount, trend, showSliceIndex, onCardPress,
  cheapestId, fastestId, isBundled, isRoundTrip,
  preferredAirlines, avoidedAirports, fareGroups,
}: Props) {

  // Mutable refs so PanResponder closure always sees current values
  const indexRef           = useRef(index);
  indexRef.current         = index;
  const totalRef           = useRef(offers.length);
  totalRef.current         = offers.length;
  const onIndexChangeRef   = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const onSwitchRef        = useRef(onSwitchToList);
  onSwitchRef.current      = onSwitchToList;

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // translateX/translateY are shared across every card transition (there's
  // one Animated.View reused for whichever offer is currently "top", not one
  // per card). Nothing previously stopped a new swipe from starting while a
  // prior transition's animation was still resolving — two overlapping
  // animations fighting over the same shared values produced both the
  // "frozen after several swipes" bug and the ghosted double-exposure look
  // (a stale in-flight card composited with the newly-rendered one). This
  // ref blocks a new gesture from being claimed until the current one's
  // animation (and the index/value reset in its completion callback) has
  // fully finished.
  const isAnimatingRef = useRef(false);

  const rotate = translateX.interpolate({
    inputRange:  [-200, 0, 200],
    outputRange: ['-5deg', '0deg', '5deg'],
    extrapolate: 'clamp',
  });

  // Upward drag (negative dy) is clamped to 0 visually via this derived
  // value instead of clamping the raw value in onPanResponderMove, so the
  // raw translateY still reflects the true gesture delta.
  const clampedTranslateY = translateY.interpolate({
    inputRange:  [-1000, 0, 1000],
    outputRange: [0, 0, 1000],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Claim horizontal-dominant gestures in either direction (left = next,
      // right = previous) or a downward swipe (switch to list) — but never
      // while a previous swipe's transition animation is still running. The
      // screen's native swipe-back gesture is disabled at the navigator
      // level while stack view is active (see results.tsx), so right-swipes
      // don't need an edge guard here — claimed unconditionally, same as left.
      onMoveShouldSetPanResponder: (_, g) => {
        if (isAnimatingRef.current) return false;
        const isHorizontal = Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy);
        const isDownSwipe  = g.dy > 8 && g.dy > Math.abs(g.dx);
        return isHorizontal || isDownSwipe;
      },

      // Animated.event as a raw PanResponder handler crashed on this device
      // ("Object is not a function" inside PanResponder.js — the returned
      // value wasn't directly callable in this RN/Fabric setup). Reverted to
      // a plain callback with direct .setValue() calls. To still avoid
      // mixing JS-driven and native-driven updates on the same Animated.Value
      // (a real desync risk), every animation below now consistently uses
      // useNativeDriver: false instead — one driver throughout, not native
      // for release animations and JS for drag-tracking.
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        translateY.setValue(g.dy); // clamped for display only, via clampedTranslateY below
      },

      onPanResponderRelease: (_, g) => {
        const isLeftSwipe  = g.dx < -SWIPE_X_THRESHOLD || g.vx < -SWIPE_VEL;
        const isRightSwipe = g.dx >  SWIPE_X_THRESHOLD || g.vx >  SWIPE_VEL;
        const isDownSwipe  = g.dy > SWIPE_Y_THRESHOLD && g.dy > Math.abs(g.dx);

        if (isDownSwipe) {
          isAnimatingRef.current = true;
          Animated.timing(translateY, { toValue: 600, duration: 230, useNativeDriver: false })
            .start(() => { isAnimatingRef.current = false; onSwitchRef.current(); });
          return;
        }

        if (isLeftSwipe) {
          const newIndex = indexRef.current + 1;
          if (newIndex < totalRef.current) {
            isAnimatingRef.current = true;
            Animated.parallel([
              Animated.timing(translateX, { toValue: -450, duration: 200, useNativeDriver: false }),
              Animated.timing(translateY, { toValue: 0,    duration: 200, useNativeDriver: false }),
            ]).start(() => {
              onIndexChangeRef.current(newIndex);
              translateX.setValue(0);
              translateY.setValue(0);
              isAnimatingRef.current = false;
            });
          } else {
            // Bounce back — already at last card
            Vibration.vibrate(40);
            isAnimatingRef.current = true;
            Animated.spring(translateX, { toValue: 0, useNativeDriver: false, tension: 120, friction: 8 })
              .start(() => { isAnimatingRef.current = false; });
          }
          return;
        }

        if (isRightSwipe) {
          const newIndex = indexRef.current - 1;
          if (newIndex >= 0) {
            isAnimatingRef.current = true;
            Animated.parallel([
              Animated.timing(translateX, { toValue: 450, duration: 200, useNativeDriver: false }),
              Animated.timing(translateY, { toValue: 0,   duration: 200, useNativeDriver: false }),
            ]).start(() => {
              onIndexChangeRef.current(newIndex);
              translateX.setValue(0);
              translateY.setValue(0);
              isAnimatingRef.current = false;
            });
          } else {
            // Already at the first card — rubber-band bounce to signal "no previous"
            Vibration.vibrate(40);
            isAnimatingRef.current = true;
            Animated.sequence([
              Animated.timing(translateX, { toValue: 70, duration: 120, useNativeDriver: false }),
              Animated.spring(translateX, { toValue: 0, useNativeDriver: false, tension: 120, friction: 7 }),
            ]).start(() => { isAnimatingRef.current = false; });
          }
          return;
        }

        // Snap back
        isAnimatingRef.current = true;
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }),
        ]).start(() => { isAnimatingRef.current = false; });
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
        Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
        isAnimatingRef.current = false;
      },
    })
  ).current;

  const topOffer = offers[index];
  if (!topOffer) return null;

  // The 3 cards behind the top card.
  // Rendered back-to-front in JSX so later = higher z-order.
  // reversed: behindOffers[0]=furthest(index+3), behindOffers[2]=closest(index+1)
  const behindOffers = offers.slice(index + 1, index + 1 + BEHIND_COUNT).reverse();

  // Total top padding = space for all background cards to peek above the top card
  const stackTopSpace = BEHIND_COUNT * PEEK_HEIGHT;

  return (
    <View style={{ flex: 1 }}>
      {/* ── Help text — no pagination counter here, FlightCard already shows
          its own "{index+1}/{total}" inside the card itself. ── */}
      <View style={{ paddingHorizontal: spacing.pagePadding, paddingTop: 4, paddingBottom: 8 }}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="arrow-back-outline" size={15} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Swipe left for next</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="arrow-forward-outline" size={15} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Swipe right for previous</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="arrow-down-outline" size={15} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Swipe down for list</Text>
          </View>
        </View>
      </View>

      {/* ── Card stack — vertically centered in the remaining space ── */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {offers.length > 1 && (
          <CardSeekSlider
            total={offers.length}
            index={index}
            onSeek={(i) => {
              translateX.setValue(0);
              translateY.setValue(0);
              onIndexChangeRef.current(i);
            }}
          />
        )}
        {/*
          stackTopSpace px of padding at the top creates a "tray" for background
          cards to peek into from above the top card.
          All background cards are position:absolute with negative top values,
          sitting in that padding space. The top card (non-absolute, in flow) sits
          below the padding. Cards render back-to-front so the top card is visually
          on top of all background cards.
        */}
        <View style={{ paddingTop: stackTopSpace }}>
          <View style={{ position: 'relative' }}>

            {/* Background cards — further cards peeking from higher up, with
                more visible opacity/scale falloff and their own shadow for a
                clearer stacked-card look. */}
            {behindOffers.map((offer, i) => {
              // i=0 → furthest (depth=3), i=2 → closest to top (depth=1)
              const depth   = BEHIND_COUNT - i;           // 3, 2, 1
              const topOff  = -(depth * PEEK_HEIGHT);     // -54, -36, -18
              const opacity = 1 - depth * 0.16;           // 0.52, 0.68, 0.84
              const scale   = 1 - depth * 0.03;            // 0.91, 0.94, 0.97

              return (
                <View
                  key={offer.id}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: topOff,
                    opacity,
                    transform: [{ scale }],
                    shadowColor:   '#000',
                    shadowOpacity: 0.12,
                    shadowRadius:  6,
                    shadowOffset:  { width: 0, height: 3 },
                    elevation:     2,
                  }}
                >
                  <FlightCard
                    offer={offer}
                    fareGroup={fareGroups?.[getFlightIdentityKey(offer)]}
                    bagCount={bagCount}
                    trend={trend}
                    showSliceIndex={showSliceIndex}
                    preferredAirlines={preferredAirlines}
                    avoidedAirports={avoidedAirports}
                    index={index + depth}
                    total={offers.length}
                  />
                </View>
              );
            })}

            {/* Top card — in normal flow, renders last = highest z-order */}
            <Animated.View
              {...panResponder.panHandlers}
              style={{ transform: [{ translateX }, { translateY: clampedTranslateY }, { rotate }] }}
            >
              <FlightCard
                key={topOffer.id}
                offer={topOffer}
                fareGroup={fareGroups?.[getFlightIdentityKey(topOffer)]}
                bagCount={bagCount}
                trend={trend}
                showSliceIndex={showSliceIndex}
                onPress={onCardPress}
                isCheapest={topOffer.id === cheapestId && isBundled}
                isFastest={topOffer.id === fastestId && isBundled}
                isVoyaPick={isBundled && isRoundTrip && index === 0}
                isPreferredAirline={topOffer.slices[0]?.segments.some(
                  (s: { marketing_carrier: { iata_code: string } }) =>
                    preferredAirlines.includes(s.marketing_carrier.iata_code)
                )}
                preferredAirlines={preferredAirlines}
                avoidedAirports={avoidedAirports}
                index={index}
                total={offers.length}
              />
            </Animated.View>
          </View>
        </View>

        {/* ── Switch to list ── */}
        <View style={{ paddingHorizontal: spacing.pagePadding }}>
          <TouchableOpacity
            onPress={onSwitchToList}
            style={{ alignItems: 'center', paddingVertical: 14, marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
          >
            <Ionicons name="list-outline" size={18} color={colors.textMuted} />
            <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: '600' }}>Show all as list</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
