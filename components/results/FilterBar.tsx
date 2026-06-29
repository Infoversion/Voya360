import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSearchStore, SortMode } from '@/store/search.store';
import { colors, fontSize } from '@/constants/design';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'total',     label: 'Total price' },
  { value: 'duration',  label: 'Shortest' },
  { value: 'departure', label: 'Departure' },
];

export function FilterBar() {
  const { sortMode, sortDirection, setSortMode, bagCount, setBagCount } = useSearchStore();

  return (
    <View style={{
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' }}
      >
        {/* Sort chips */}
        {SORT_OPTIONS.map(opt => {
          const active = sortMode === opt.value;
          const arrow  = active ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setSortMode(opt.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical:   7,
                borderRadius:      20,
                borderWidth:       1.5,
                borderColor:       active ? colors.accent : colors.border,
                backgroundColor:   active ? `${colors.accent}15` : 'transparent',
              }}
            >
              <Text style={{
                fontSize:   fontSize.label,
                fontWeight: active ? '700' : '400',
                color:      active ? colors.accent : colors.textMuted,
              }}>
                {opt.label}{arrow}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Divider */}
        <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 4 }} />

        {/* Bag count chips */}
        {[1, 2, 3].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => setBagCount(n)}
            style={{
              paddingHorizontal: 14,
              paddingVertical:   7,
              borderRadius:      20,
              borderWidth:       1.5,
              borderColor:       bagCount === n ? colors.accent : colors.border,
              backgroundColor:   bagCount === n ? `${colors.accent}15` : 'transparent',
              flexDirection:     'row',
              alignItems:        'center',
              gap:               4,
            }}
          >
            <Text style={{ fontSize: 12 }}>🧳</Text>
            <Text style={{
              fontSize:   fontSize.label,
              fontWeight: bagCount === n ? '700' : '400',
              color:      bagCount === n ? colors.accent : colors.textMuted,
            }}>
              ×{n}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
