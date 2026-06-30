import { useEffect, useState, useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Share, Animated, Dimensions, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { supabase } from '@/lib/supabase';
import {
  previewCancellation, confirmCancellation, CancellationPreview,
  getDuffelOrder, DuffelOrderDetail, DuffelSlice, DuffelSegment,
  previewOrderChange, confirmOrderChange, OrderChangePreview,
} from '@/lib/duffel';
import { useAuthStore } from '@/store/auth.store';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import { Booking, BookingPassenger } from '@/types/booking';
import { VoyaCard } from '@/components/voya/VoyaCard';
import { useVoya } from '@/hooks/useVoya';
import { colors, fontSize, spacing } from '@/constants/design';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Confetti ──────────────────────────────────────────────────────────────────
const PIECES = ['🌸', '🎊', '✈️', '⭐', '💫', '🌺', '🎉', '✨'];

function ConfettiPiece({ delay, x }: { delay: number; x: number }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const emoji = PIECES[Math.floor(Math.random() * PIECES.length)];
  const size  = 14 + Math.floor(Math.random() * 14);
  const drift = (Math.random() - 0.5) * 80;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, { toValue: 680, duration: 2200 + Math.random() * 1200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: drift, duration: 2200 + Math.random() * 1200, useNativeDriver: true }),
        Animated.timing(rotate,     { toValue: 6,    duration: 2200 + Math.random() * 1200, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1400),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 6], outputRange: ['0deg', '720deg'] });
  return (
    <Animated.Text style={{ position: 'absolute', left: x, top: 0, fontSize: size, transform: [{ translateY }, { translateX }, { rotate: spin }], opacity }}>
      {emoji}
    </Animated.Text>
  );
}

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.floor(Math.random() * (SCREEN_W - 40)),
      delay: Math.floor(Math.random() * 1000),
    }))
  ).current;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
      {pieces.map(p => <ConfettiPiece key={p.id} x={p.x} delay={p.delay} />)}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const DEST_NAMES: Record<string, string> = {
  DEL: 'Delhi',         BOM: 'Mumbai',       HYD: 'Hyderabad',  MAA: 'Chennai',
  BLR: 'Bengaluru',    CCU: 'Kolkata',       KHI: 'Karachi',    LHE: 'Lahore',
  ISB: 'Islamabad',    DAC: 'Dhaka',         MNL: 'Manila',     CMB: 'Colombo',
  KTM: 'Kathmandu',   DXB: 'Dubai',         AUH: 'Abu Dhabi',  SIN: 'Singapore',
  KUL: 'Kuala Lumpur', LHR: 'London',        JFK: 'New York',   LAX: 'Los Angeles',
  ORD: 'Chicago',      SFO: 'San Francisco', YYZ: 'Toronto',    DFW: 'Dallas',
  IAD: 'Washington',   ORD2: 'Chicago',      ATL: 'Atlanta',    MIA: 'Miami',
  BOS: 'Boston',       SEA: 'Seattle',       EWR: 'Newark',
};

const PNR_STORAGE_KEY    = (id: string) => `voya360_pnr_${id}`;
const CONFETTI_SHOWN_KEY = (id: string) => `voya360_confetti_${id}`;

const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates',              QR: 'Qatar Airways',       TK: 'Turkish Airlines',
  AA: 'American Airlines',     UA: 'United Airlines',     DL: 'Delta Air Lines',
  BA: 'British Airways',       AI: 'Air India',           PK: 'PIA',
  BG: 'Biman Bangladesh',      UL: 'SriLankan Airlines',  EY: 'Etihad Airways',
  SQ: 'Singapore Airlines',    MH: 'Malaysia Airlines',   PR: 'Philippine Airlines',
  LH: 'Lufthansa',             AF: 'Air France',          KL: 'KLM',
  FZ: 'flydubai',              G9: 'Air Arabia',          '6E': 'IndiGo',
  UK: 'Vistara',               IX: 'Air India Express',   WY: 'Oman Air',
  MS: 'EgyptAir',              ET: 'Ethiopian Airlines',  KE: 'Korean Air',
  CX: 'Cathay Pacific',        NH: 'ANA',                 JL: 'Japan Airlines',
  AC: 'Air Canada',            WS: 'WestJet',
};

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// "Nasir Ali" → "ALI/NASIR MR"
function toAirlineFormat(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (!parts[0]) return fullName.toUpperCase();
  const first = parts[0];
  const last  = parts.slice(1).join(' ') || first;
  return `${last.toUpperCase()}/${first.toUpperCase()} MR`;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function BookingConfirmedScreen() {
  const { bookingId, new: isNew } = useLocalSearchParams<{ bookingId: string; new?: string }>();
  const [booking,      setBooking]      = useState<Booking | null>(null);
  const [passengers,   setPassengers]   = useState<BookingPassenger[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [previewing,    setPreviewing]    = useState(false);
  const [refundPreview, setRefundPreview] = useState<CancellationPreview | null>(null);
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [duffelOrder,   setDuffelOrder]   = useState<DuffelOrderDetail | null>(null);
  const { observation, dismiss } = useVoya('post_booking');
  const { profile, session } = useAuthStore();
  const viewShotRef = useRef<ViewShotRef>(null);

  useEffect(() => { loadBooking(); }, [bookingId]);

  useEffect(() => {
    if (!isNew || !bookingId) return;
    (async () => {
      const key = CONFETTI_SHOWN_KEY(bookingId as string);
      const already = await AsyncStorage.getItem(key);
      if (!already) {
        setShowConfetti(true);
        await AsyncStorage.setItem(key, '1');
      }
    })();
  }, [isNew, bookingId]);

  const loadBooking = async () => {
    try {
      const cached = await AsyncStorage.getItem(PNR_STORAGE_KEY(bookingId as string));
      if (cached) setBooking(JSON.parse(cached));
    } catch {}

    const { data } = await supabase
      .from('bookings').select('*').eq('duffel_order_id', bookingId).single();

    if (data) {
      setBooking(data as Booking);
      try { await AsyncStorage.setItem(PNR_STORAGE_KEY(bookingId as string), JSON.stringify(data)); } catch {}
      const { data: paxData } = await supabase
        .from('booking_passengers').select('*').eq('booking_id', data.id);
      if (paxData) setPassengers(paxData as BookingPassenger[]);
      // Fetch live Duffel order in background for terminal info
      getDuffelOrder(bookingId as string).then(setDuffelOrder).catch(() => {});
    }
    setLoading(false);
  };

  const copyPnr = async () => {
    if (!booking?.pnr) return;
    await Clipboard.setStringAsync(booking.pnr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = async () => {
    if (!booking?.pnr) return;

    const outSlice   = duffelOrder?.slices?.[0];
    const outFirst   = outSlice?.segments?.[0];
    const outLast    = outSlice?.segments?.[(outSlice.segments.length ?? 1) - 1];
    const outAirline = outFirst?.marketing_carrier?.iata_code ?? airlineCode;
    const outFlightNo = outFirst?.marketing_carrier_flight_number;
    const outDepTerm = outFirst?.origin_terminal;
    const outArrTerm = outLast?.destination_terminal;

    const retSlice   = duffelOrder && duffelOrder.slices.length > 1 ? duffelOrder.slices[1] : null;
    const retFirst   = retSlice?.segments?.[0];
    const retLast    = retSlice?.segments?.[(retSlice?.segments?.length ?? 1) - 1];
    const retAirline = retFirst?.marketing_carrier?.iata_code ?? airlineCode;
    const retFlightNo = retFirst?.marketing_carrier_flight_number;
    const retDepTerm = retFirst?.origin_terminal;
    const retArrTerm = retLast?.destination_terminal;

    const trackingUrl = (airline: string, flightNo?: string) =>
      flightNo
        ? `https://www.flightaware.com/live/flight/${airline}${flightNo}`
        : `https://www.flightaware.com/`;

    const depAt = outFirst?.departing_at ?? booking.departure_at;
    const arrAt = outLast?.arriving_at   ?? booking.arrival_at;

    let msg = `✈ My Voya360 booking — PNR: ${booking.pnr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

    msg += `🛫 Outward: ${booking.origin} → ${booking.destination}\n`;
    msg += `   ${fmtDate(depAt)} · ${fmtTime(depAt)} → ${fmtTime(arrAt)}\n`;
    if (outDepTerm) msg += `   Departs Terminal ${outDepTerm}\n`;
    if (outArrTerm) msg += `   Arrives Terminal ${outArrTerm}\n`;
    if (outFlightNo) msg += `   Flight: ${outAirline}${outFlightNo}\n`;
    msg += `   Track: ${trackingUrl(outAirline, outFlightNo)}\n`;

    if (retSlice) {
      const retDepAt = retFirst?.departing_at ?? null;
      const retArrAt = retLast?.arriving_at   ?? null;
      msg += `\n🛬 Return: ${retSlice.origin.iata_code} → ${retSlice.destination.iata_code}\n`;
      msg += `   ${fmtDate(retDepAt)} · ${fmtTime(retDepAt)} → ${fmtTime(retArrAt)}\n`;
      if (retDepTerm) msg += `   Departs Terminal ${retDepTerm}\n`;
      if (retArrTerm) msg += `   Arrives Terminal ${retArrTerm}\n`;
      if (retFlightNo) msg += `   Flight: ${retAirline}${retFlightNo}\n`;
      msg += `   Track: ${trackingUrl(retAirline, retFlightNo)}\n`;
    }

    await Share.share({ message: msg });
  };

  // Step 1: fetch refund breakdown from Duffel (does NOT cancel yet)
  const onCancel = async () => {
    if (!bookingId) return;
    setPreviewing(true);
    try {
      const preview = await previewCancellation(bookingId as string);
      setRefundPreview(preview);
    } catch (err) {
      Alert.alert('Could not fetch refund details', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPreviewing(false);
    }
  };

  // Step 2: user confirmed after seeing the breakdown
  const doConfirmCancel = async () => {
    if (!refundPreview || !bookingId) return;
    setCancelling(true);
    try {
      await confirmCancellation(refundPreview.cancellationId, bookingId as string);
      setBooking(prev => prev ? { ...prev, status: 'cancelled' } : prev);
      setRefundPreview(null);
    } catch (err) {
      Alert.alert('Cancellation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const onScreenshot = async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      await Share.share({ url: uri });
    } catch {}
  };

  if (loading && !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Loading booking…</Text>
      </SafeAreaView>
    );
  }

  const firstName   = profile?.full_name?.split(' ')[0] ?? 'Traveller';
  const destCode    = booking?.destination ?? '';
  const destName    = DEST_NAMES[destCode] ?? destCode;
  const originCode  = booking?.origin ?? '';
  const originName  = DEST_NAMES[originCode] ?? originCode;
  const airlineCode = booking?.airline ?? '';

  // Passenger display data — fallback to profile
  const paxList = passengers.length > 0
    ? passengers.map(p => ({ name: p.full_name ?? '', dietary: p.dietary_preference }))
    : profile?.full_name
      ? [{ name: profile.full_name, dietary: profile.dietary_preference ?? null }]
      : [];

  const email = session?.user?.email ?? '';
  const phone = profile?.phone ?? '';
  const isFuture  = booking?.departure_at ? new Date(booking.departure_at) > new Date() : false;
  const canCancel = booking?.status === 'confirmed' && isFuture;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {showConfetti && <Confetti />}

      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.95 }} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.pagePadding, paddingTop: 8, paddingBottom: 24 }}>

          {/* Voya tip */}
          {observation && (
            <View style={{ marginHorizontal: -spacing.pagePadding, marginBottom: 6 }}>
              <VoyaCard observation={observation} onDismiss={dismiss} />
            </View>
          )}

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={onScreenshot} activeOpacity={0.7} style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <Image source={require('@/assets/logo.png')} style={{ width: 70, height: 70 }} resizeMode="contain" />
          </View>

          {/* Congratulations — no route below, just the message */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: colors.success,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, flex: 1 }}>
              Congratulations, {firstName}! 🎉
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, marginLeft: 34 }}>
            Your ticket is confirmed. Smooth skies ahead! ✈️
          </Text>

          {/* ── PNR ── */}
          <TouchableOpacity
            onPress={copyPnr}
            activeOpacity={0.75}
            style={{
              borderWidth: 2, borderColor: colors.accent, borderStyle: 'dashed',
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Booking reference</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={13}
                  color={copied ? colors.success : colors.textMuted}
                />
                <Text style={{ fontSize: 11, color: copied ? colors.success : colors.textMuted, fontWeight: copied ? '700' : '400' }}>
                  {copied ? 'Copied!' : 'tap to copy'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.accent, letterSpacing: 5, marginTop: 4 }}>
              {booking?.pnr ?? '———'}
            </Text>
          </TouchableOpacity>

          {/* ── Outward journey card ── */}
          {booking && (() => {
            const outSlice = duffelOrder?.slices?.[0];
            const firstSeg = outSlice?.segments?.[0];
            const lastSeg  = outSlice?.segments?.[(outSlice.segments.length ?? 1) - 1];
            const outFlightNums = outSlice?.segments
              ?.map(s => {
                const num = s.marketing_carrier_flight_number ?? s.flight_number;
                return num ? `${s.marketing_carrier?.iata_code ?? airlineCode}${num}` : '';
              })
              ?.filter(Boolean)
              ?.join(' · ') || null;
            return (
              <JourneyCard
                label="Outward journey"
                origin={booking.origin ?? ''}
                originName={originName}
                destination={booking.destination ?? ''}
                destName={destName}
                departureAt={booking.departure_at}
                arrivalAt={booking.arrival_at}
                airlineCode={airlineCode}
                departureTerminal={firstSeg?.origin_terminal ?? null}
                arrivalTerminal={lastSeg?.destination_terminal ?? null}
                flightNumbers={outFlightNums}
              />
            );
          })()}

          {/* ── Return journey card (round trips) ── */}
          {booking && duffelOrder && duffelOrder.slices.length > 1 && (() => {
            const retSlice   = duffelOrder.slices[1];
            const firstSeg   = retSlice?.segments?.[0];
            const lastSeg    = retSlice?.segments?.[(retSlice.segments.length ?? 1) - 1];
            const retAirline = firstSeg?.marketing_carrier?.iata_code ?? airlineCode;
            const retFlightNums = retSlice?.segments
              ?.map(s => {
                const num = s.marketing_carrier_flight_number ?? s.flight_number;
                return num ? `${s.marketing_carrier?.iata_code ?? retAirline}${num}` : '';
              })
              ?.filter(Boolean)
              ?.join(' · ') || null;
            return (
              <JourneyCard
                label="Return journey"
                origin={retSlice.origin.iata_code}
                originName={DEST_NAMES[retSlice.origin.iata_code] ?? retSlice.origin.iata_code}
                destination={retSlice.destination.iata_code}
                destName={DEST_NAMES[retSlice.destination.iata_code] ?? retSlice.destination.iata_code}
                departureAt={firstSeg?.departing_at ?? null}
                arrivalAt={lastSeg?.arriving_at ?? null}
                airlineCode={retAirline}
                departureTerminal={firstSeg?.origin_terminal ?? null}
                arrivalTerminal={lastSeg?.destination_terminal ?? null}
                flightNumbers={retFlightNums}
              />
            );
          })()}

          {/* ── Booking info card (shared, fixed details) ── */}
          {booking && (
            <View style={{
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
              padding: 14, marginBottom: 12,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 10 }}>
                BOOKING DETAILS
              </Text>
              <InfoRow icon="airplane-outline" label={`${capitalize(booking.cabin_class ?? 'economy')} class`} />
              <InfoRow
                icon="briefcase-outline"
                label={(booking.baggage_fee_usd ?? 0) > 0 ? 'Extra baggage added' : 'No extra baggage'}
                muted={(booking.baggage_fee_usd ?? 0) === 0}
              />
              {duffelOrder?.documents?.map(doc => (
                <InfoRow
                  key={doc.unique_identifier}
                  icon="ticket-outline"
                  label={`E-ticket: ${doc.unique_identifier}`}
                />
              ))}
            </View>
          )}

          {/* ── Per-passenger cards ── */}
          {paxList.map((p, i) => (
            <View key={i} style={{
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
              padding: 14, marginBottom: 12,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 6 }}>
                PASSENGER {i + 1}/{paxList.length}
              </Text>
              <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: 0.5, marginBottom: 10 }}>
                {toAirlineFormat(p.name)}
              </Text>
              {p.dietary && p.dietary !== 'none' && (
                <InfoRow icon="restaurant-outline" label={`${capitalize(p.dietary)} meal`} />
              )}
              {i === 0 && (
                <>
                  {email ? <InfoRow icon="mail-outline"  label={email} /> : null}
                  {phone ? <InfoRow icon="call-outline" label={phone} /> : null}
                </>
              )}
            </View>
          ))}

          {/* ── Actions ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              onPress={onShare}
              style={{
                flex: 1, borderWidth: 1.5, borderColor: colors.accent,
                borderRadius: 12, paddingVertical: 13, alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.accent }}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={{
                flex: 2, backgroundColor: colors.accent,
                borderRadius: 12, paddingVertical: 13, alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: '#fff' }}>Back to home</Text>
            </TouchableOpacity>
          </View>

          {/* ── Cancel booking (only for confirmed + future) ── */}
          {canCancel && (
            <TouchableOpacity
              onPress={() => setShowCancelOptions(true)}
              style={{
                marginTop: 12, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
                borderWidth: 1, borderColor: '#FEE2E2',
              }}
            >
              <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: '#DC2626' }}>Cancel booking</Text>
            </TouchableOpacity>
          )}
          {booking?.status === 'cancelled' && (
            <View style={{ marginTop: 12, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FEF2F2' }}>
              <Text style={{ fontSize: fontSize.label, color: '#DC2626', fontWeight: '600' }}>This booking has been cancelled</Text>
            </View>
          )}

        </ScrollView>
      </ViewShot>
      {/* ── Cancellation options sheet ── */}
      {showCancelOptions && booking && (
        <CancelOptionsModal
          booking={booking}
          onClose={() => setShowCancelOptions(false)}
          onFullCancelPreview={(preview) => {
            setShowCancelOptions(false);
            setRefundPreview(preview);
          }}
          onCancelled={() => {
            setShowCancelOptions(false);
            setBooking(prev => prev ? { ...prev, status: 'cancelled' } : prev);
          }}
          onReturnCancelled={() => {
            setShowCancelOptions(false);
            setBooking(prev => prev ? { ...prev, status: 'return_cancelled' } : prev);
          }}
        />
      )}

      {/* ── Full-cancel refund preview modal ── */}
      {refundPreview && booking && (
        <RefundModal
          booking={booking}
          preview={refundPreview}
          cancelling={cancelling}
          onKeep={() => setRefundPreview(null)}
          onConfirm={doConfirmCancel}
        />
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon, label, muted }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Ionicons name={icon} size={14} color={muted ? colors.border : colors.textMuted} />
      <Text style={{ fontSize: 13, color: muted ? colors.border : colors.text, flex: 1 }}>{label}</Text>
    </View>
  );
}

// ── CancelOptionsModal ────────────────────────────────────────────────────────
// Step 1: fetch live Duffel order → show what can be cancelled →
//   Full cancel  → passes CancellationPreview back to parent for RefundModal
//   Return leg   → handles its own preview + confirm flow inline
//   Specific pax → mailto support
function CancelOptionsModal({ booking, onClose, onFullCancelPreview, onCancelled, onReturnCancelled }: {
  booking:              Booking;
  onClose:              () => void;
  onFullCancelPreview:  (preview: CancellationPreview) => void;
  onCancelled:          () => void;
  onReturnCancelled:    () => void;
}) {
  type Phase =
    | { name: 'loading' }
    | { name: 'options';       order: DuffelOrderDetail }
    | { name: 'return_preview'; order: DuffelOrderDetail; preview: OrderChangePreview; returnSlice: DuffelSlice }
    | { name: 'busy' };

  const [phase,     setPhase]     = useState<Phase>({ name: 'loading' });
  const [selection, setSelection] = useState<'full' | 'return'>('full');

  useEffect(() => {
    (async () => {
      try {
        const order = await getDuffelOrder(booking.duffel_order_id!);
        setPhase({ name: 'options', order });
      } catch {
        Alert.alert('Could not load order details', 'Please try again.');
        onClose();
      }
    })();
  }, []);

  const hasReturn = phase.name === 'options' && phase.order.slices.length > 1;
  const multiPax  = (booking.passenger_count ?? 1) > 1;

  const onContinue = async () => {
    if (phase.name !== 'options') return;
    const { order } = phase;

    if (selection === 'full') {
      // Fetch full-cancel preview then hand off to parent → RefundModal
      setPhase({ name: 'busy' });
      try {
        const preview = await previewCancellation(booking.duffel_order_id!);
        onFullCancelPreview(preview);
      } catch (err) {
        setPhase({ name: 'options', order });
        Alert.alert('Could not fetch refund details', err instanceof Error ? err.message : 'Please try again.');
      }
      return;
    }

    // Return-leg cancel: second slice
    const returnSlice = order.slices[1];
    setPhase({ name: 'busy' });
    try {
      const preview = await previewOrderChange(booking.duffel_order_id!, [returnSlice.id]);
      setPhase({ name: 'return_preview', order, preview, returnSlice });
    } catch (err) {
      setPhase({ name: 'options', order });
      Alert.alert(
        'Not supported online',
        (err instanceof Error ? err.message : '') ||
        'This airline requires you to contact them directly to cancel a single leg.',
      );
    }
  };

  const onConfirmReturn = async () => {
    if (phase.name !== 'return_preview') return;
    const { preview } = phase;
    setPhase({ name: 'busy' });
    try {
      await confirmOrderChange(preview.changeOfferId, booking.duffel_order_id!, 'return_cancelled');
      onReturnCancelled();
    } catch (err) {
      Alert.alert('Cancellation failed', err instanceof Error ? err.message : 'Please try again.');
      onClose();
    }
  };

  const isBusy = phase.name === 'loading' || phase.name === 'busy';

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Cancel booking</Text>
          <TouchableOpacity onPress={onClose} disabled={isBusy}>
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {isBusy && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={{ marginTop: 12, color: colors.textMuted }}>
              {phase.name === 'loading' ? 'Loading booking details…' : 'Please wait…'}
            </Text>
          </View>
        )}

        {/* Options phase */}
        {phase.name === 'options' && (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Route + pax summary */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{booking.origin}</Text>
              <Text style={{ color: colors.accent, fontSize: 16 }}>⇄</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{booking.destination}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 24 }}>
              {booking.passenger_count ?? 1} passenger{(booking.passenger_count ?? 1) > 1 ? 's' : ''}
              {booking.departure_at ? ` · ${fmtDate(booking.departure_at)}` : ''}
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 14, letterSpacing: 0.6 }}>
              WHAT WOULD YOU LIKE TO CANCEL?
            </Text>

            {/* Full cancel option */}
            <CancelOption
              selected={selection === 'full'}
              onSelect={() => setSelection('full')}
              title="Cancel entire booking"
              subtitle={`All ${booking.passenger_count ?? 1} passenger${(booking.passenger_count ?? 1) > 1 ? 's' : ''}, all legs`}
              tag="Full refund subject to airline policy"
            />

            {/* Return-leg option (round trips only) */}
            {hasReturn && (
              <CancelOption
                selected={selection === 'return'}
                onSelect={() => setSelection('return')}
                title="Cancel return journey only"
                subtitle={`${booking.destination} → ${booking.origin} · all passengers`}
                tag="Availability depends on airline"
                tagWarn
              />
            )}

            {/* Partial passenger note */}
            {multiPax && (
              <View style={{
                marginTop: 16, borderRadius: 12, padding: 14,
                backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                  Cancelling for specific passengers only?
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 10 }}>
                  Airlines don't support removing individual passengers from a booking online.
                  Contact us and we'll coordinate with the airline on your behalf.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(
                    `mailto:support@voya360.com?subject=Partial Cancellation Request — ${booking.pnr}&body=Booking PNR: ${booking.pnr}%0APassengers to cancel:%0APlease assist with partial cancellation.`
                  )}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                    Email support@voya360.com →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={onContinue}
              style={{
                marginTop: 24, backgroundColor: '#DC2626',
                borderRadius: 14, paddingVertical: 15, alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: '#fff' }}>
                Continue →
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Return-leg refund preview phase */}
        {phase.name === 'return_preview' && (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* What's being cancelled */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>Cancelling return leg</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{phase.returnSlice.origin.iata_code}</Text>
                <Text style={{ fontSize: 16, color: colors.accent }}>→</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{phase.returnSlice.destination.iata_code}</Text>
                {phase.returnSlice.segments?.[0]?.departing_at && (
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                    · {fmtDate(phase.returnSlice.segments[0].departing_at)}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                Outward journey ({booking.origin} → {booking.destination}) is NOT affected
              </Text>
            </View>

            {/* Refund breakdown */}
            <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
              <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 }}>REFUND BREAKDOWN</Text>
              </View>
              <RefundRow
                label="Airline refund for return leg"
                value={`${phase.preview.currency} ${parseFloat(phase.preview.refundAmount).toFixed(2)}`}
                valueColor={parseFloat(phase.preview.refundAmount) > 0 ? colors.success : colors.textMuted}
                bold
              />
              {parseFloat(phase.preview.penaltyAmount) > 0.01 && (
                <RefundRow
                  label="Airline cancellation penalty"
                  value={`${phase.preview.currency} ${parseFloat(phase.preview.penaltyAmount).toFixed(2)}`}
                  valueColor="#DC2626"
                />
              )}
              <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
              <RefundRow label="Voya service fee" value="USD 9.99" valueColor="#DC2626" note="Non-refundable" />
              <View style={{
                backgroundColor: '#F0FDF4', margin: 12, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
              }}>
                <Ionicons name="time-outline" size={14} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600', flex: 1 }}>
                  Refunds typically appear within 5–10 business days
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 24, flexDirection: 'row', gap: 8 }}>
              <Ionicons name="warning-outline" size={16} color="#DC2626" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 13, color: '#991B1B', flex: 1, lineHeight: 18 }}>
                Your outward journey remains confirmed. Only the return leg will be cancelled.
              </Text>
            </View>

            <TouchableOpacity
              onPress={onConfirmReturn}
              style={{ backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: '#fff' }}>
                Confirm — Refund {phase.preview.currency} {parseFloat(phase.preview.refundAmount).toFixed(2)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Keep return journey</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function CancelOption({ selected, onSelect, title, subtitle, tag, tagWarn }: {
  selected: boolean; onSelect: () => void;
  title: string; subtitle: string; tag: string; tagWarn?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={{
        flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, marginBottom: 10,
        borderWidth: 1.5,
        borderColor: selected ? '#DC2626' : colors.border,
        backgroundColor: selected ? '#FEF2F2' : colors.background,
      }}
    >
      <View style={{
        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
        borderColor: selected ? '#DC2626' : colors.border,
        backgroundColor: selected ? '#DC2626' : 'transparent',
        alignItems: 'center', justifyContent: 'center', marginTop: 1,
      }}>
        {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>{subtitle}</Text>
        <View style={{
          alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
          backgroundColor: tagWarn ? '#FEF3C7' : '#F0FDF4',
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: tagWarn ? '#92400E' : colors.success }}>{tag}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RefundModal({ booking, preview, cancelling, onKeep, onConfirm }: {
  booking: Booking;
  preview: CancellationPreview;
  cancelling: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const totalPaid          = booking.total_usd ?? 0;
  const refundAmt          = parseFloat(preview.refundAmount ?? '0');
  const nonRefund          = Math.max(0, totalPaid - refundAmt);
  const airlineCancelFee   = Math.max(0, nonRefund - 9.99);
  const currency           = (preview.refundCurrency ?? 'USD').toUpperCase();

  const refundToLabel = (() => {
    switch (preview.refundTo) {
      case 'original_form_of_payment': return 'Original payment method';
      case 'voucher':                  return 'Airline travel voucher';
      case 'awaiting_payment':         return 'N/A (not yet charged)';
      case 'balance':                  return 'Duffel account balance';
      default:                         return preview.refundTo;
    }
  })();

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onKeep}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingVertical: 16,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Cancel booking</Text>
          <TouchableOpacity onPress={onKeep} disabled={cancelling}>
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>Keep</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Route summary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{booking.origin}</Text>
            <Text style={{ fontSize: 18, color: colors.accent }}>→</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{booking.destination}</Text>
            {booking.departure_at && (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                · {fmtDate(booking.departure_at)}
              </Text>
            )}
          </View>

          {/* Refund breakdown card */}
          <View style={{
            borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
            overflow: 'hidden', marginBottom: 20,
          }}>
            <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 }}>REFUND BREAKDOWN</Text>
            </View>

            <RefundRow label="Total paid" value={`${currency} ${totalPaid.toFixed(2)}`} />
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
            <RefundRow
              label="Airline refund"
              value={`${currency} ${refundAmt.toFixed(2)}`}
              valueColor={refundAmt > 0 ? colors.success : colors.textMuted}
              bold
            />
            {airlineCancelFee > 0.01 && (
              <RefundRow
                label="Airline cancellation fee"
                value={`${currency} ${airlineCancelFee.toFixed(2)}`}
                valueColor="#DC2626"
              />
            )}
            <RefundRow
              label="Voya service fee"
              value="USD 9.99"
              valueColor="#DC2626"
              note="Non-refundable"
            />
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
            <RefundRow label="Refund to" value={refundToLabel} />
            <View style={{
              backgroundColor: '#F0FDF4', margin: 12, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <Ionicons name="time-outline" size={14} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600', flex: 1 }}>
                Refunds typically appear within 5–10 business days
              </Text>
            </View>
          </View>

          {/* Warning */}
          <View style={{
            backgroundColor: '#FEF2F2', borderRadius: 12,
            padding: 14, marginBottom: 24, flexDirection: 'row', gap: 8,
          }}>
            <Ionicons name="warning-outline" size={16} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 13, color: '#991B1B', flex: 1, lineHeight: 18 }}>
              This action is irreversible. Once confirmed, your ticket will be cancelled and you cannot rebook at the same price.
            </Text>
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            onPress={onConfirm}
            disabled={cancelling}
            style={{
              backgroundColor: '#DC2626', borderRadius: 14,
              paddingVertical: 15, alignItems: 'center', marginBottom: 12,
            }}
          >
            {cancelling
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: '#fff' }}>
                  Confirm — Refund {currency} {refundAmt.toFixed(2)}
                </Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onKeep}
            disabled={cancelling}
            style={{
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
              paddingVertical: 14, alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>Keep my booking</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function RefundRow({ label, value, valueColor, bold, note }: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  note?: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: fontSize.label, fontWeight: bold ? '800' : '600', color: valueColor ?? colors.text }}>
          {value}
        </Text>
      </View>
      {note && (
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'right' }}>{note}</Text>
      )}
    </View>
  );
}

function JourneyCard({
  label, origin, originName, destination, destName,
  departureAt, arrivalAt, airlineCode,
  departureTerminal, arrivalTerminal, flightNumbers,
}: {
  label: string;
  origin: string; originName: string;
  destination: string; destName: string;
  departureAt: string | null; arrivalAt: string | null;
  airlineCode: string;
  departureTerminal?: string | null;
  arrivalTerminal?: string | null;
  flightNumbers?: string | null;
}) {
  function fmtDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <View style={{
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      padding: 14, marginBottom: 12,
    }}>
      {/* Label + airline logo + name on same row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: flightNumbers ? 6 : 14 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 }}>
          {label.toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AirlineLogo iataCode={airlineCode} size={36} radius={6} />
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {AIRLINE_NAMES[airlineCode] ?? airlineCode}
            </Text>
            {flightNumbers && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>{flightNumbers}</Text>
            )}
          </View>
        </View>
      </View>
      {flightNumbers && <View style={{ height: 8 }} />}

      {/* Origin | ——✈—— | Destination */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Left: origin + date + time + terminal */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>{origin}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>{originName}</Text>
          <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{fmtDate(departureAt)}</Text>
          <Text style={{ fontSize: 15, color: colors.accent, fontWeight: '800' }}>{fmtTime(departureAt)}</Text>
          {departureTerminal ? (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>Terminal {departureTerminal}</Text>
          ) : null}
        </View>

        {/* Centre: thin line — ✈ — thin line */}
        <View style={{ alignItems: 'center', paddingHorizontal: 6, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 22, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 26, color: '#1E3A8A', marginHorizontal: 4 }}>✈</Text>
            <View style={{ width: 22, height: 1, backgroundColor: colors.border }} />
          </View>
        </View>

        {/* Right: destination + date + time + terminal */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>{destination}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>{destName}</Text>
          <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{fmtDate(arrivalAt)}</Text>
          <Text style={{ fontSize: 15, color: colors.accent, fontWeight: '800' }}>{fmtTime(arrivalAt)}</Text>
          {arrivalTerminal ? (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>Terminal {arrivalTerminal}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
