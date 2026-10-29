import {
  View, Text, TouchableOpacity, ScrollView,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore, SortMode, StopFilter, TimeFilter } from '@/store/search.store';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import { colors } from '@/constants/design';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AirlineOption { iata: string; name: string; logoUrl?: string | null }

interface Props {
  availableAirlines: AirlineOption[];
  filteredCount:     number;
  totalCount:        number;
}

// ── Pill chip ────────────────────────────────────────────────────────────────
function Chip({ label, icon, active, onPress, accent = colors.accent, filled = false }: {
  label: string; icon?: string; active: boolean; onPress: () => void;
  accent?: string; filled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
        borderColor:     active ? accent : colors.border,
        backgroundColor: active
          ? (filled ? accent : `${accent}18`)
          : '#F5F5F5',
      }}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={12}
          color={active ? (filled ? '#fff' : accent) : colors.textMuted}
        />
      )}
      <Text style={{
        fontSize: 12, fontWeight: active ? '700' : '500',
        color: active ? (filled ? '#fff' : accent) : colors.textMuted,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 10, fontWeight: '800', color: colors.textMuted,
      letterSpacing: 0.8, marginBottom: 8,
    }}>
      {label}
    </Text>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
function RowDivider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />;
}

const SORT_OPTIONS: { value: SortMode; icon: string; label: string }[] = [
  { value: 'recommended', icon: 'sparkles-outline',  label: 'Recommended' },
  { value: 'total',       icon: 'pricetag-outline',  label: 'Price'       },
  { value: 'duration',    icon: 'flash-outline',     label: 'Fastest'     },
  { value: 'departure',   icon: 'time-outline',      label: 'Depart'      },
];

const STOP_OPTIONS: { value: StopFilter; label: string; icon: string }[] = [
  { value: 'nonstop', label: 'Nonstop',  icon: 'remove-outline'      },
  { value: '1stop',   label: '1 Stop',   icon: 'git-commit-outline'  },
  { value: '2plus',   label: '2+ Stops', icon: 'git-branch-outline'  },
];

const TIME_OPTIONS: { value: TimeFilter; icon: string; label: string; sub: string }[] = [
  { value: 'morning',   icon: 'sunny-outline',        label: 'Morning',   sub: '6am – noon' },
  { value: 'afternoon', icon: 'partly-sunny-outline',  label: 'Afternoon', sub: 'noon – 6pm' },
  { value: 'evening',   icon: 'moon-outline',          label: 'Evening',   sub: '6pm onward' },
];

export function FilterBar({ availableAirlines, filteredCount, totalCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  const {
    sortMode, sortDirection, setSortMode,
    stopFilter, setStopFilter,
    timeFilter, setTimeFilter,
    airlineFilter, toggleAirlineFilter,
    clearFilters,
  } = useSearchStore();

  const activeFilterCount = [
    stopFilter !== 'all',
    timeFilter !== 'any',
    airlineFilter.length > 0,
  ].filter(Boolean).length;

  const isFiltered = filteredCount < totalCount;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  return (
    <View style={{
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>

      {/* ── Collapsed header (always visible) ─────────────────────────── */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 14, paddingVertical: 10, gap: 8,
        }}
      >
        {/* Left: icon + label */}
        <Ionicons
          name="options-outline"
          size={16}
          color={activeFilterCount > 0 ? colors.accent : colors.textMuted}
        />
        <Text style={{
          fontSize: 13, fontWeight: '600',
          color: activeFilterCount > 0 ? colors.accent : colors.text,
        }}>
          Sort & Filter
        </Text>

        {/* Active filter badge */}
        {activeFilterCount > 0 && (
          <View style={{
            backgroundColor: colors.accent,
            borderRadius: 10, minWidth: 18, height: 18,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 5,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>
              {activeFilterCount}
            </Text>
          </View>
        )}

        {/* Sort mode pill */}
        <View style={{
          backgroundColor: '#F3F4F6', borderRadius: 10,
          paddingHorizontal: 8, paddingVertical: 3,
          flexDirection: 'row', alignItems: 'center', gap: 3,
        }}>
          <Ionicons
            name={SORT_OPTIONS.find(s => s.value === sortMode)?.icon as any ?? 'sparkles-outline'}
            size={10}
            color={colors.textMuted}
          />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>
            {SORT_OPTIONS.find(s => s.value === sortMode)?.label}
            {sortMode !== 'recommended' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Result count */}
        <View style={{
          backgroundColor: isFiltered ? `${colors.accent}15` : '#F3F4F6',
          borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700',
            color: isFiltered ? colors.accent : colors.textMuted,
          }}>
            {filteredCount}{isFiltered ? `/${totalCount}` : ''} flights
          </Text>
        </View>

        {/* Expand chevron */}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* ── Expanded panel ─────────────────────────────────────────────── */}
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>

          {/* Row 1 — Sort */}
          <SectionLabel label="SORT BY" />
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, flexDirection: 'row' }}
          >
            {SORT_OPTIONS.map(opt => {
              const active = sortMode === opt.value;
              const arrow  = active && opt.value !== 'recommended'
                ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
              return (
                <Chip
                  key={opt.value}
                  label={`${opt.label}${arrow}`}
                  icon={opt.icon}
                  active={active}
                  filled={active}
                  onPress={() => setSortMode(opt.value)}
                />
              );
            })}
          </ScrollView>

          <RowDivider />

          {/* Row 2 — Stops */}
          <SectionLabel label="STOPS" />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STOP_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                active={stopFilter === opt.value}
                onPress={() => setStopFilter(stopFilter === opt.value ? 'all' : opt.value)}
              />
            ))}
          </View>

          <RowDivider />

          {/* Row 3 — Airlines */}
          <SectionLabel label="AIRLINES" />
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, flexDirection: 'row', alignItems: 'center' }}
          >
            {availableAirlines.map(airline => {
              const active = airlineFilter.includes(airline.iata);
              return (
                <TouchableOpacity
                  key={airline.iata}
                  onPress={() => toggleAirlineFilter(airline.iata)}
                  activeOpacity={0.75}
                  style={{
                    alignItems: 'center', gap: 5,
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    borderWidth: active ? 2.5 : 1.5,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? `${colors.accent}12` : '#F8F8F8',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AirlineLogo
                      iataCode={airline.iata}
                      logoUrl={airline.logoUrl}
                      size={30}
                      radius={8}
                    />
                    {active && (
                      <View style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 16, height: 16, borderRadius: 8,
                        backgroundColor: colors.accent,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 9, fontWeight: active ? '700' : '500',
                      color: active ? colors.accent : colors.textMuted,
                      maxWidth: 44, textAlign: 'center',
                    }}
                  >
                    {airline.iata}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <RowDivider />

          {/* Row 4 — Departure time */}
          <SectionLabel label="DEPARTURE TIME" />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TIME_OPTIONS.map(opt => {
              const active = timeFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setTimeFilter(timeFilter === opt.value ? 'any' : opt.value)}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor:     active ? '#7C3AED' : colors.border,
                    backgroundColor: active ? '#F5F3FF' : '#F5F5F5',
                    gap: 3,
                  }}
                >
                  <Ionicons name={opt.icon as any} size={16} color={active ? '#7C3AED' : colors.textMuted} />
                  <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#7C3AED' : colors.text }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted }}>{opt.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              onPress={clearFilters}
              style={{
                marginTop: 12, paddingVertical: 9, borderRadius: 10,
                borderWidth: 1.5, borderColor: '#DC2626',
                backgroundColor: '#FEF2F2',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
