import { useRef, useState, useMemo } from 'react';
import { View, Text, TextInput, Image, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSearchStore } from '@/store/search.store';
import { useAuthStore }   from '@/store/auth.store';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { FlightCard }     from '@/components/results/FlightCard';
import { FilterBar }      from '@/components/results/FilterBar';
import { VoyaCard }       from '@/components/voya/VoyaCard';
import { useVoya }        from '@/hooks/useVoya';
import { colors, fontSize, spacing } from '@/constants/design';
import type { DuffelOffer } from '@/types/duffel';

type SelectionMode = 'bundled' | 'stepwise';

function outboundKey(offer: DuffelOffer): string {
  const seg = offer.slices[0]?.segments[0];
  return `${seg?.marketing_carrier?.iata_code ?? ''}-${seg?.flight_number ?? ''}-${seg?.departing_at ?? ''}`;
}

function returnKey(offer: DuffelOffer): string {
  const seg = offer.slices[1]?.segments[0];
  return `${seg?.marketing_carrier?.iata_code ?? ''}-${seg?.flight_number ?? ''}-${seg?.departing_at ?? ''}`;
}

function totalMinutes(offer: DuffelOffer): number {
  return offer.slices.reduce((sum, s) => {
    const m = s.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    return sum + parseInt(m?.[1] ?? '0') * 60 + parseInt(m?.[2] ?? '0');
  }, 0);
}

export default function ResultsScreen() {
  const {
    sortedOffers, offers: rawOffers, isSearching, searchError,
    origin, destination, departureDate, returnDate, passengerCounts, cabinClass,
    isRoundTrip, bagCount, sortMode, sortDirection,
  } = useSearchStore();

  const paxSummary = [
    passengerCounts.adults   > 0 ? `${passengerCounts.adults} adult${passengerCounts.adults > 1 ? 's' : ''}` : null,
    passengerCounts.children > 0 ? `${passengerCounts.children} child${passengerCounts.children > 1 ? 'ren' : ''}` : null,
    passengerCounts.infants  > 0 ? `${passengerCounts.infants} infant${passengerCounts.infants > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');
  const { profile }              = useAuthStore();
  const { observation, dismiss } = useVoya('results');
  const { createAlert }          = usePriceAlerts();

  const listRef = useRef<FlatList>(null);
  const [mode, setMode]                       = useState<SelectionMode>('bundled');
  const [step, setStep]                       = useState<1 | 2>(1);
  const [chosenOutboundKey, setChosen]        = useState<string | null>(null);
  const [chosenOutboundOffer, setChosenOffer] = useState<DuffelOffer | null>(null);
  const [alertPrice, setAlertPrice]           = useState('');
  const [alertSaved, setAlertSaved]           = useState(false);

  const preferredAirlines = profile?.preferred_airlines ?? [];
  const avoidedAirports   = profile?.avoided_airports   ?? [];

  // ── Stepwise: unique outbound flights (one card per unique flight) ──
  const stepwiseOutbounds = useMemo(() => {
    if (!isRoundTrip || !sortedOffers) return [];
    const seen = new Set<string>();
    return sortedOffers.filter(o => {
      const key = outboundKey(o);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [sortedOffers, isRoundTrip]);

  // ── Stepwise: all unique return flights from the search result ──
  // We show every return option (not just those pairing with the chosen outbound)
  // so the user has a full selection. On press we find the best bookable offer:
  // exact outbound+return match first, then any offer with the chosen return.
  const stepwiseReturns = useMemo(() => {
    if (!isRoundTrip || !sortedOffers || !chosenOutboundKey) return [];
    const seen = new Set<string>();
    return sortedOffers
      .filter(o => o.slices.length >= 2)
      .filter(o => {
        const key = returnKey(o);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [sortedOffers, isRoundTrip, chosenOutboundKey]);

  const allOffers    = sortedOffers ?? [];
  const displayOffers: DuffelOffer[] = isRoundTrip && mode === 'stepwise'
    ? (step === 1 ? stepwiseOutbounds : stepwiseReturns)
    : allOffers;

  const cheapestOffer = allOffers[0];
  const fastestOffer  = [...allOffers].sort((a, b) => totalMinutes(a) - totalMinutes(b))[0];

  const depDate = departureDate
    ? new Date(departureDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const retDate = returnDate
    ? new Date(returnDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
    setStep(1);
    setChosen(null);
    setChosenOffer(null);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleCardPress = (offer: DuffelOffer) => {
    if (isRoundTrip && mode === 'stepwise') {
      if (step === 1) {
        setChosen(outboundKey(offer));
        setChosenOffer(offer);
        setStep(2);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        return;
      }
      // Step 2: find the best bookable offer for the chosen return.
      // Prefer exact outbound+return pair; fall back to any offer with the chosen return.
      const rKey   = returnKey(offer);
      const allRaw = rawOffers ?? [];
      const exactMatch   = allRaw.find(o => outboundKey(o) === chosenOutboundKey && returnKey(o) === rKey);
      const returnMatch  = allRaw.find(o => returnKey(o) === rKey);
      const best = exactMatch ?? returnMatch ?? offer;
      router.push({ pathname: '/flight/[offerId]', params: { offerId: best.id } });
      return;
    }
    router.push({ pathname: '/flight/[offerId]', params: { offerId: offer.id } });
  };

  // ── Loading / Error states ──
  if (isSearching) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 16, fontSize: fontSize.body, color: colors.textMuted }}>Finding best flights…</Text>
      </SafeAreaView>
    );
  }

  if (searchError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Something went wrong</Text>
        <Text style={{ fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>{searchError}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.accent, fontWeight: '600', fontSize: fontSize.body }}>← Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Determine which slice to show per card ──
  const showSliceIndex = isRoundTrip && mode === 'stepwise'
    ? (step === 1 ? 0 : 1)
    : undefined;

  const listKey = `${sortMode}-${sortDirection}-${mode}-${step}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* ── Header ── */}
      <View style={{
        backgroundColor: colors.background,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.text }}>
            {origin?.iata} → {destination?.iata}{isRoundTrip ? ` → ${origin?.iata}` : ''}
          </Text>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            {depDate}{retDate ? ` – ${retDate}` : ''} · {paxSummary} · {cabinClass}
          </Text>
        </View>
        <Image source={require('@/assets/logo.png')} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
      </View>

      {/* ── Round trip mode toggle ── */}
      {isRoundTrip && (
        <View style={{
          flexDirection: 'row', backgroundColor: colors.background,
          borderBottomWidth: 1, borderBottomColor: colors.border,
          paddingHorizontal: spacing.pagePadding, paddingVertical: 10, gap: 8,
        }}>
          {([
            { value: 'bundled',  label: 'Vayo\'s picks' },
            { value: 'stepwise', label: 'Choose separately' },
          ] as { value: SelectionMode; label: string }[]).map(opt => {
            const active = mode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleModeChange(opt.value)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                  backgroundColor: active ? colors.accent : '#F3F4F6',
                }}
              >
                <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: active ? '#fff' : colors.textMuted }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Stepwise step header ── */}
      {isRoundTrip && mode === 'stepwise' && (
        <View style={{
          backgroundColor: '#FFF7ED', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
          paddingHorizontal: spacing.pagePadding, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          {step === 2 && (
            <TouchableOpacity onPress={() => { setStep(1); setChosen(null); setChosenOffer(null); }}>
              <Text style={{ fontSize: 18, color: colors.accent }}>←</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.label, fontWeight: '700', color: colors.accent }}>
              {step === 1 ? 'Step 1 of 2 — Pick your outbound flight' : 'Step 2 of 2 — Pick your inward (return) flight'}
            </Text>
            {step === 2 && (
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                {stepwiseReturns.length} return option{stepwiseReturns.length !== 1 ? 's' : ''} available
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ── Selected outbound summary (pinned above return list) ── */}
      {isRoundTrip && mode === 'stepwise' && step === 2 && chosenOutboundOffer && (() => {
        const seg      = chosenOutboundOffer.slices[0]?.segments[0];
        const lastSeg  = chosenOutboundOffer.slices[0]?.segments[chosenOutboundOffer.slices[0].segments.length - 1];
        const carrier  = seg?.marketing_carrier;
        const depTime  = seg?.departing_at ? new Date(seg.departing_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
        const arrTime  = lastSeg?.arriving_at ? new Date(lastSeg.arriving_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
        const stops    = (chosenOutboundOffer.slices[0]?.segments.length ?? 1) - 1;
        return (
          <View style={{
            backgroundColor: '#F0FDF4',
            borderBottomWidth: 1.5, borderBottomColor: colors.success,
            paddingHorizontal: spacing.pagePadding, paddingVertical: 12,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, letterSpacing: 0.5, marginBottom: 6 }}>
              ✓ OUTBOUND SELECTED
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 24, height: 24, borderRadius: 4,
                  backgroundColor: `${colors.accent}20`, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: colors.accent }}>
                    {(carrier?.iata_code ?? '??').slice(0, 2)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    {carrier?.name ?? '—'} · {seg?.flight_number}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  {depTime} → {arrTime}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {chosenOutboundOffer.slices[0]?.origin.iata_code} → {chosenOutboundOffer.slices[0]?.destination.iata_code}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => { setStep(1); setChosen(null); setChosenOffer(null); }}
              style={{ marginTop: 6 }}
            >
              <Text style={{ fontSize: 11, color: colors.accent, fontWeight: '600' }}>Change outbound ›</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ── Filter bar ── */}
      <FilterBar />

      {/* ── Voya insight ── */}
      {observation && (
        <View style={{ paddingTop: 8 }}>
          <VoyaCard observation={observation} onDismiss={dismiss} />
        </View>
      )}

      {/* ── Results count ── */}
      {displayOffers.length > 0 && (
        <View style={{ paddingHorizontal: spacing.pagePadding, paddingVertical: 8 }}>
          <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>
            {displayOffers.length} {mode === 'stepwise' && step === 1 ? 'outbound' : mode === 'stepwise' && step === 2 ? 'return' : ''} flight{displayOffers.length !== 1 ? 's' : ''} · <Text style={{ color: colors.accent, fontWeight: '600' }}>
              {sortMode === 'total' ? 'Total you pay' : sortMode === 'duration' ? 'Shortest time' : 'Departure time'}
              {sortDirection === 'asc' ? ' ↑' : ' ↓'}
            </Text>
          </Text>
        </View>
      )}

      {/* ── Results list ── */}
      <View style={{ flex: 1, position: 'relative' }}>
        <FlatList
          ref={listRef}
          key={listKey}
          data={displayOffers}
          keyExtractor={item => `${item.id}-${showSliceIndex ?? 'all'}`}
          extraData={listKey}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 48 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>✈️</Text>
              <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text, marginBottom: 8 }}>No flights found</Text>
              <Text style={{ fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' }}>Try different dates or airports.</Text>
            </View>
          }
          ListFooterComponent={displayOffers.length > 0 && mode === 'bundled' && origin && destination ? (
            <View style={{ marginHorizontal: spacing.pagePadding, marginTop: 4, marginBottom: 16 }}>
              {/* Alert CTA */}
              <View style={{
                backgroundColor: '#FFF7ED', borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: `${colors.accent}30`, marginBottom: 12,
              }}>
                {alertSaved ? (
                  <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                    <Text style={{ fontSize: 22 }}>🔔</Text>
                    <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.accent, marginTop: 6 }}>
                      Alert set!
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                      We'll notify you when {origin.iata} → {destination.iata} drops below ${alertPrice}.
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')} style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>View all alerts →</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
                      🔔 Alert me when prices drop
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                      {origin.iata} → {destination.iata} · {cabinClass.replace('_', ' ')}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center',
                        borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
                        paddingHorizontal: 12, paddingVertical: 10,
                        backgroundColor: '#FFF',
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMuted, marginRight: 4 }}>$</Text>
                        <TextInput
                          value={alertPrice}
                          onChangeText={v => setAlertPrice(v.replace(/[^0-9]/g, ''))}
                          placeholder="Target price"
                          placeholderTextColor="#B0B0B0"
                          keyboardType="numeric"
                          style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          const price = parseFloat(alertPrice);
                          if (!alertPrice || isNaN(price) || price <= 0) return;
                          await createAlert({
                            origin:           origin.iata,
                            destination:      destination.iata,
                            target_price_usd: price,
                            cabin_class:      cabinClass,
                          });
                          setAlertSaved(true);
                        }}
                        style={{
                          backgroundColor: colors.accent, borderRadius: 10,
                          paddingHorizontal: 16, paddingVertical: 12,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Set alert</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {/* Back to top */}
              {displayOffers.length > 3 && (
                <TouchableOpacity
                  onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
                  style={{
                    paddingVertical: 12, borderRadius: 10,
                    backgroundColor: colors.background,
                    borderWidth: 1.5, borderColor: colors.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: fontSize.label, fontWeight: '600', color: colors.textMuted }}>↑ Back to top</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
          renderItem={({ item, index }) => (
            <FlightCard
              offer={item}
              bagCount={bagCount}
              showSliceIndex={showSliceIndex}
              onPress={() => handleCardPress(item)}
              isCheapest={item.id === cheapestOffer?.id && mode === 'bundled'}
              isFastest={item.id === fastestOffer?.id && mode === 'bundled'}
              isVayoPick={mode === 'bundled' && isRoundTrip && index === 0}
              isPreferredAirline={item.slices[0]?.segments.some(
                (s: { marketing_carrier: { iata_code: string } }) => preferredAirlines.includes(s.marketing_carrier.iata_code),
              )}
              preferredAirlines={preferredAirlines}
              avoidedAirports={avoidedAirports}
            />
          )}
        />

        {/* ── Floating ↓ jump to bottom ── */}
        {displayOffers.length > 3 && (
          <TouchableOpacity
            onPress={() => listRef.current?.scrollToEnd({ animated: true })}
            style={{
              position: 'absolute', bottom: 40, right: 16,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 }, elevation: 4,
            }}
          >
            <Text style={{ fontSize: 18, color: '#fff', lineHeight: 22 }}>↓</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
