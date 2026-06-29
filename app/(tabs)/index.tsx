import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore }   from '@/store/auth.store';
import { useSearchStore } from '@/store/search.store';
import { SearchForm }     from '@/components/search/SearchForm';
import { VoyaCard }       from '@/components/voya/VoyaCard';
import { useVoya }        from '@/hooks/useVoya';
import { supabase }       from '@/lib/supabase';
import { TOP_CORRIDORS }  from '@/constants/corridors';
import { colors, fontSize, spacing } from '@/constants/design';
import type { Booking, PriceHistory } from '@/types/booking';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TrendBadge({ current, previous }: { current: number; previous: number | null }) {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 1) return null;
  const up = pct > 0;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: up ? '#FEF2F2' : '#F0FDF4',
      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    }}>
      <Text style={{ fontSize: 10, color: up ? '#DC2626' : colors.success }}>
        {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { profile }             = useAuthStore();
  const { setOrigin, setDestination, setIsRoundTrip } = useSearchStore();
  const { observation, dismiss } = useVoya('home');
  const firstName = profile?.full_name?.split(' ')[0];

  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [corridorPrice, setCorridorPrice]     = useState<PriceHistory | null>(null);
  const [prevPrice, setPrevPrice]             = useState<PriceHistory | null>(null);

  useEffect(() => {
    loadUpcomingBooking();
    if (profile?.home_origin && profile?.home_destination) {
      loadCorridorPrice(profile.home_origin, profile.home_destination);
    }
  }, [profile]);

  const loadUpcomingBooking = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed')
      .gt('departure_at', new Date().toISOString())
      .order('departure_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) setUpcomingBooking(data as Booking);
  };

  const loadCorridorPrice = async (origin: string, destination: string) => {
    const { data } = await supabase
      .from('price_history')
      .select('*')
      .eq('origin', origin)
      .eq('destination', destination)
      .eq('cabin_class', 'economy')
      .order('snapshot_at', { ascending: false })
      .limit(2);
    if (data && data.length > 0) {
      setCorridorPrice(data[0] as PriceHistory);
      if (data.length > 1) setPrevPrice(data[1] as PriceHistory);
    }
  };

  const quickSearch = (origin: string, destination: string) => {
    const { airports } = require('@/constants/airports');
    const o = airports?.find?.((a: any) => a.iata === origin);
    const d = airports?.find?.((a: any) => a.iata === destination);
    if (o) setOrigin(o);
    if (d) setDestination(d);
    setIsRoundTrip(false);
  };

  // Pick 6 corridors near the user's home or show top ones
  const homeOrigin = profile?.home_origin;
  const quickRoutes = homeOrigin
    ? TOP_CORRIDORS.filter(c => c.origin === homeOrigin).slice(0, 6)
    : TOP_CORRIDORS.slice(0, 6);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Navy hero ──────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0D1B3E', paddingTop: 16, paddingBottom: 48, paddingHorizontal: spacing.pagePadding }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={require('@/assets/logo.png')}
              style={{ width: 44, height: 44, marginRight: 10 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 24 }}>
                {firstName ? `Where to, ${firstName}?` : 'Where to next?'}
              </Text>
              <Text style={{ fontSize: fontSize.label, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                Book fast · Pay fair · Fly smarter
              </Text>
            </View>
          </View>

          {/* Voya insight card */}
          {observation && (
            <VoyaCard observation={observation} onDismiss={dismiss} />
          )}
        </View>

        {/* ── Search card (floats over hero) ─────────────────────────── */}
        <View style={{
          marginTop: -32,
          marginHorizontal: spacing.pagePadding,
          backgroundColor: colors.background,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}>
          <SearchForm />
        </View>

        {/* ── Upcoming booking strip ─────────────────────────────────── */}
        {upcomingBooking && (
          <TouchableOpacity
            onPress={() => router.push(`/booking/${upcomingBooking.duffel_order_id}`)}
            style={{
              marginHorizontal: spacing.pagePadding,
              marginTop: 20,
              backgroundColor: `${colors.accent}10`,
              borderWidth: 1.5,
              borderColor: `${colors.accent}30`,
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 22, marginRight: 10 }}>✈️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 2 }}>
                Upcoming flight
              </Text>
              <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
                {upcomingBooking.origin} → {upcomingBooking.destination}
              </Text>
              {upcomingBooking.departure_at && (
                <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
                  {fmtDate(upcomingBooking.departure_at)} · PNR {upcomingBooking.pnr ?? '—'}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 18, color: colors.accent }}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Corridor price widget ──────────────────────────────────── */}
        {profile?.home_origin && profile?.home_destination && (
          <View style={{
            marginHorizontal: spacing.pagePadding,
            marginTop: 20,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 14,
          }}>
            <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
              YOUR CORRIDOR
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                  {profile.home_origin}
                  <Text style={{ color: colors.accent }}> → </Text>
                  {profile.home_destination}
                </Text>
                {corridorPrice?.price_usd ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent }}>
                      from ${corridorPrice.price_usd.toFixed(0)}
                    </Text>
                    <TrendBadge current={corridorPrice.price_usd} previous={prevPrice?.price_usd ?? null} />
                  </View>
                ) : (
                  <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: 4 }}>
                    Tap to search
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => quickSearch(profile.home_origin!, profile.home_destination!)}
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: '#fff' }}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Quick route shortcuts ──────────────────────────────────── */}
        {quickRoutes.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{
              fontSize: fontSize.label, fontWeight: '700',
              color: colors.textMuted, marginBottom: 10,
              paddingHorizontal: spacing.pagePadding,
            }}>
              POPULAR ROUTES
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.pagePadding, gap: 10 }}
            >
              {quickRoutes.map((c) => (
                <TouchableOpacity
                  key={`${c.origin}-${c.destination}`}
                  onPress={() => quickSearch(c.origin, c.destination)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: colors.background,
                    minWidth: 110,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                    {c.origin}
                    <Text style={{ color: colors.accent }}> → </Text>
                    {c.destination}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {c.label.split(' → ')[1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
