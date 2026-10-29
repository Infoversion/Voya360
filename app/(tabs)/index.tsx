import { useRef } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore }   from '@/store/auth.store';
import { useSearchStore } from '@/store/search.store';
import { SearchForm }     from '@/components/search/SearchForm';
import { VoyaCard }       from '@/components/voya/VoyaCard';
import { useVoya }        from '@/hooks/useVoya';
import { TOP_CORRIDORS }  from '@/constants/corridors';
import { getAirportByIata } from '@/constants/airports';
import { colors, fontSize, spacing } from '@/constants/design';

export default function HomeScreen() {
  const { profile }             = useAuthStore();
  const { setOrigin, setDestination, setIsRoundTrip } = useSearchStore();
  const { observation, dismiss } = useVoya('home');
  const firstName = profile?.full_name?.split(' ')[0];
  const scrollRef = useRef<ScrollView>(null);

  const quickSearch = (origin: string, destination: string) => {
    const o = getAirportByIata(origin);
    const d = getAirportByIata(destination);
    if (o) setOrigin(o);
    if (d) setDestination(d);
    setIsRoundTrip(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Pick 6 corridors near the user's home or show top ones
  const homeOrigin = profile?.home_origin;
  const quickRoutes = homeOrigin
    ? TOP_CORRIDORS.filter(c => c.origin === homeOrigin).slice(0, 6)
    : TOP_CORRIDORS.slice(0, 6);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Navy hero ──────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0D1B3E', paddingTop: 8, paddingBottom: 48, paddingHorizontal: spacing.pagePadding }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 24 }}>
                {firstName ? `Where to, ${firstName}?` : 'Where to next?'}
              </Text>
              <Text style={{ fontSize: fontSize.label, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                Book fast · Pay fair · Fly smarter
              </Text>
            </View>
            <View style={{ width: 80, height: 60, position: 'relative' }}>
              <Image
                source={require('@/assets/logo.png')}
                style={{ width: 80, height: 80, position: 'absolute', top: -10, right: 0 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Voya insight card */}
          {observation && (
            <VoyaCard observation={observation} onDismiss={dismiss} />
          )}
        </View>

        {/* ── Search card (floats over hero) ─────────────────────────── */}
        <View style={{
          marginTop: -56,
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
