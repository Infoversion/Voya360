import { useState } from 'react';
import { Image, View, Text } from 'react-native';
import { colors } from '@/constants/design';

// Kiwi.com hosts free airline logos for all IATA codes.
// Duffel's logo_symbol_url is used first if available, then Kiwi, then initials.
function kiwiUrl(iata: string) {
  return `https://images.kiwi.com/airlines/64/${iata}.png`;
}

interface Props {
  iataCode:  string;
  logoUrl?:  string | null;
  size?:     number;
  radius?:   number;
}

export function AirlineLogo({ iataCode, logoUrl, size = 32, radius = 6 }: Props) {
  const iata = (iataCode ?? '').toUpperCase();

  // Try sources in order: Duffel URL → Kiwi → initials
  const sources = [
    logoUrl ?? null,
    iata ? kiwiUrl(iata) : null,
  ].filter(Boolean) as string[];

  const [srcIndex, setSrcIndex] = useState(0);

  if (srcIndex < sources.length) {
    return (
      <Image
        source={{ uri: sources[srcIndex] }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="contain"
        onError={() => setSrcIndex(i => i + 1)}
      />
    );
  }

  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: Math.round(size * 0.32), fontWeight: '800', color: colors.accent }}>
        {iata.slice(0, 2)}
      </Text>
    </View>
  );
}
