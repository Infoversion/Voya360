import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore, SortMode } from '@/store/search.store';
import { colors, fontSize } from '@/constants/design';

type SelectionMode = 'bundled' | 'stepwise';

interface Props {
  mode?:      SelectionMode;
  onMode?:    (m: SelectionMode) => void;
  isRoundTrip?: boolean;
}

const SORT_OPTIONS: { value: SortMode; icon: string; label: string }[] = [
  { value: 'total',     icon: 'pricetag-outline',  label: 'Price'    },
  { value: 'duration',  icon: 'timer-outline',      label: 'Fastest'  },
  { value: 'departure', icon: 'time-outline',       label: 'Depart'   },
];

export function FilterBar({ mode, onMode, isRoundTrip }: Props) {
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
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 7, gap: 6, flexDirection: 'row', alignItems: 'center' }}
      >
        {/* Mode toggle — only for round trips */}
        {isRoundTrip && onMode && (
          <>
            <TouchableOpacity
              onPress={() => onMode('bundled')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                borderWidth: 1.5,
                borderColor: mode === 'bundled' ? '#9333EA' : colors.border,
                backgroundColor: mode === 'bundled' ? '#FAF5FF' : 'transparent',
              }}
            >
              <Ionicons name="sparkles-outline" size={13} color={mode === 'bundled' ? '#9333EA' : colors.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: mode === 'bundled' ? '700' : '400', color: mode === 'bundled' ? '#9333EA' : colors.textMuted }}>
                Voya
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onMode('stepwise')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                borderWidth: 1.5,
                borderColor: mode === 'stepwise' ? colors.accent : colors.border,
                backgroundColor: mode === 'stepwise' ? `${colors.accent}15` : 'transparent',
              }}
            >
              <Ionicons name="git-branch-outline" size={13} color={mode === 'stepwise' ? colors.accent : colors.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: mode === 'stepwise' ? '700' : '400', color: mode === 'stepwise' ? colors.accent : colors.textMuted }}>
                Pick each
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ width: 1, height: 18, backgroundColor: colors.border, marginHorizontal: 2 }} />
          </>
        )}

        {/* Sort chips */}
        {SORT_OPTIONS.map(opt => {
          const active = sortMode === opt.value;
          const arrow  = active ? (sortDirection === 'asc' ? '↑' : '↓') : '';
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setSortMode(opt.value)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                borderWidth: 1.5,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? `${colors.accent}15` : 'transparent',
              }}
            >
              <Ionicons name={opt.icon as any} size={13} color={active ? colors.accent : colors.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: active ? '700' : '400', color: active ? colors.accent : colors.textMuted }}>
                {opt.label}{arrow ? ` ${arrow}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Divider */}
        <View style={{ width: 1, height: 18, backgroundColor: colors.border, marginHorizontal: 2 }} />

        {/* Bag count chips */}
        {[1, 2, 3].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => setBagCount(n)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 3,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
              borderWidth: 1.5,
              borderColor: bagCount === n ? colors.accent : colors.border,
              backgroundColor: bagCount === n ? `${colors.accent}15` : 'transparent',
            }}
          >
            <Ionicons name="briefcase-outline" size={13} color={bagCount === n ? colors.accent : colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: bagCount === n ? '700' : '400', color: bagCount === n ? colors.accent : colors.textMuted }}>
              ×{n}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
