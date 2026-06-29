import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/design';
import {
  getHolidaysForDate,
  getHolidaysForMonth,
  HOLIDAY_COLORS,
  HolidayEntry,
} from '@/constants/public-holidays';

interface Props {
  label:        string;
  value:        string | null;
  onChange:     (date: string) => void;
  minDate?:     Date;
  destination?: string;
  rangeStart?:  string; // ISO date — when set, highlights the range from here to value
}

const RANGE_BG = `${colors.accent}22`; // very light saffron strip

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// Today gets its own distinct green so it's never confused with selected (orange)
const TODAY_BG   = '#D1FAE5';
const TODAY_TEXT = '#065F46';
const TODAY_DOT  = '#10B981';

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function pad2(n: number) { return String(n).padStart(2, '0'); }

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ yearMonth, destination }: { yearMonth: string; destination?: string }) {
  const holidays = destination ? getHolidaysForMonth(yearMonth, destination) : [];

  return (
    <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#EBEBEB', paddingTop: 12 }}>

      {/* Color key */}
      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.7, marginBottom: 8 }}>
        HOW TO READ THIS CALENDAR
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {[
          { bg: TODAY_BG,                   text: TODAY_TEXT,  label: 'Today'           },
          { bg: colors.accent,              text: '#fff',      label: 'Your pick'       },
          { bg: '#F3F4F6',                  text: '#6B7280',   label: 'Weekend (Sa/Su)' },
          { bg: HOLIDAY_COLORS.national.bg, text: HOLIDAY_COLORS.national.text, label: 'National holiday' },
          { bg: HOLIDAY_COLORS.festival.bg, text: HOLIDAY_COLORS.festival.text, label: 'Festival'         },
          { bg: HOLIDAY_COLORS.religious.bg,text: HOLIDAY_COLORS.religious.text,label: 'Religious day'    },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: item.bg,
              borderWidth: item.bg === '#F3F4F6' ? 1 : 0,
              borderColor: '#E0E0E0',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.text === '#fff' ? '#fff' : item.text, opacity: 0.85 }} />
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Holiday list for this month */}
      {holidays.length > 0 && (
        <>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.7, marginBottom: 6 }}>
            HOLIDAYS THIS MONTH{destination ? ` · ${destination}` : ''}
          </Text>
          {holidays.map((h, i) => {
            const cfg = HOLIDAY_COLORS[h.type];
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: cfg.dot }} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.text, fontWeight: '500' }}>{h.name}</Text>
                <View style={{
                  backgroundColor: cfg.bg, borderRadius: 5,
                  paddingHorizontal: 7, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.text, textTransform: 'capitalize' }}>
                    {h.type}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {!destination && (
        <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
          Select a destination to see public holidays.
        </Text>
      )}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DatePicker({ label, value, onChange, minDate, destination, rangeStart }: Props) {
  const today  = new Date();
  const todayStr = toISO(today);
  const min    = minDate ?? today;
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open,  setOpen]  = useState(false);
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const openCalendar = () => {
    const start = parsed ?? (min > today ? min : today);
    setYear(start.getFullYear());
    setMonth(start.getMonth());
    setOpen(true);
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const chosen = new Date(year, month, day);
    if (chosen < min) return;
    onChange(toISO(chosen));
    setOpen(false);
  };

  const firstDay  = new Date(year, month, 1).getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);
  const yearMonth = `${year}-${pad2(month + 1)}`;

  // Pre-compute holidays for this month
  const holidayMap = useMemo<Record<number, HolidayEntry[]>>(() => {
    if (!destination) return {};
    const map: Record<number, HolidayEntry[]> = {};
    for (let d = 1; d <= totalDays; d++) {
      const hols = getHolidaysForDate(`${yearMonth}-${pad2(d)}`, destination);
      if (hols.length) map[d] = hols;
    }
    return map;
  }, [yearMonth, destination, totalDays]);

  // Build week rows: null = empty cell, number = day
  const weeks = useMemo<(number | null)[][]>(() => {
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null); // pad last week
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [firstDay, totalDays]);

  const displayLabel = parsed
    ? parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Select date';

  return (
    <>
      {/* ── Trigger ── */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginBottom: 4 }}>
          {label}
        </Text>
        <TouchableOpacity
          onPress={openCalendar}
          style={{
            borderWidth: 1.5,
            borderColor: value ? colors.accent : colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: spacing.touchTarget,
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: fontSize.body,
            color: value ? colors.text : colors.textMuted,
            fontWeight: value ? '600' : '400',
          }}>
            {displayLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal ── */}
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: '#FAFAFA',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              maxHeight: '90%',
            }}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Drag handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 18 }} />

              {/* ── Navigation ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={prevMonth}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: '#F0F0F0',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24, fontWeight: '900', color: colors.accent, lineHeight: 30 }}>{'<'}</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{MONTHS[month]}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>{year}</Text>
                </View>

                <TouchableOpacity
                  onPress={nextMonth}
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: '#F0F0F0',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24, fontWeight: '900', color: colors.accent, lineHeight: 30 }}>{'>'}</Text>
                </TouchableOpacity>
              </View>

              {/* ── Day header row ── */}
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {DAYS.map((d, i) => {
                  const isWknd = i === 0 || i === 6;
                  return (
                    <View key={d} style={{
                      flex: 1, alignItems: 'center', paddingVertical: 6,
                      backgroundColor: isWknd ? '#F3F4F6' : 'transparent',
                      borderRadius: isWknd ? 6 : 0,
                    }}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isWknd ? '#6B7280' : colors.textMuted,
                        letterSpacing: 0.3,
                      }}>
                        {d}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* ── Week rows ── */}
              {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  {week.map((day, di) => {
                    // Empty filler cell
                    if (day === null) {
                      const isWknd = di === 0 || di === 6;
                      return (
                        <View key={di} style={{
                          flex: 1, height: 52,
                          backgroundColor: isWknd ? '#F3F4F6' : 'transparent',
                          borderRadius: isWknd ? 6 : 0,
                        }} />
                      );
                    }

                    const dateStr    = `${yearMonth}-${pad2(day)}`;
                    const dayDate    = new Date(year, month, day);
                    const isToday    = dateStr === todayStr;
                    const isSel      = dateStr === value;
                    const isPast     = dayDate < min;
                    const isWknd     = di === 0 || di === 6;
                    const holidays   = holidayMap[day] ?? [];
                    const topHol     = holidays[0];

                    // Range highlight
                    const rsDate       = rangeStart ? new Date(rangeStart + 'T00:00:00') : null;
                    const reDate       = value     ? new Date(value      + 'T00:00:00') : null;
                    const isRangeStart = !!rangeStart && dateStr === rangeStart;
                    const isRangeEnd   = isSel && !!rangeStart;
                    const isInRange    = !!(rsDate && reDate && dayDate > rsDate && dayDate < reDate);

                    // Cell background (holiday / weekend tint — range overrides below with absolute strip)
                    let cellBg = 'transparent';
                    if (isWknd && !topHol && !isSel && !isRangeStart)  cellBg = '#F3F4F6';
                    if (topHol  && !isSel && !isRangeStart)            cellBg = HOLIDAY_COLORS[topHol.type].bg;

                    // Circle fill
                    let circleBg = 'transparent';
                    if (isSel || isRangeStart)  circleBg = colors.accent;
                    else if (isToday)            circleBg = TODAY_BG;

                    // Number color
                    let numColor: string = isWknd ? '#6B7280' : colors.text;
                    if (isPast)                              numColor = '#D1D5DB';
                    if (isSel || isRangeStart)               numColor = '#fff';
                    if (isToday && !isSel && !isRangeStart) numColor = TODAY_TEXT;
                    if (topHol  && !isSel && !isRangeStart && !isToday) numColor = HOLIDAY_COLORS[topHol.type].text;
                    if (isInRange)                           numColor = colors.text;

                    return (
                      <TouchableOpacity
                        key={di}
                        onPress={() => selectDay(day)}
                        disabled={isPast}
                        activeOpacity={0.65}
                        style={{
                          flex: 1, height: 52,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: cellBg,
                          borderRadius: 6,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Range strip — drawn behind circle */}
                        {isInRange && (
                          <View style={{
                            position: 'absolute', top: 6, bottom: 6, left: 0, right: 0,
                            backgroundColor: RANGE_BG,
                          }} />
                        )}
                        {isRangeStart && (
                          <View style={{
                            position: 'absolute', top: 6, bottom: 6, right: 0, width: '50%',
                            backgroundColor: RANGE_BG,
                          }} />
                        )}
                        {isRangeEnd && (
                          <View style={{
                            position: 'absolute', top: 6, bottom: 6, left: 0, width: '50%',
                            backgroundColor: RANGE_BG,
                          }} />
                        )}

                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: circleBg,
                          borderWidth: isToday && !isSel && !isRangeStart ? 2 : 0,
                          borderColor: TODAY_DOT,
                        }}>
                          <Text style={{
                            fontSize: 17,
                            fontWeight: isSel || isRangeStart || isToday ? '800' : isWknd ? '600' : '500',
                            color: numColor,
                            lineHeight: 22,
                          }}>
                            {day}
                          </Text>
                        </View>

                        {/* Holiday dot */}
                        {topHol && !isSel && !isRangeStart && (
                          <View style={{
                            position: 'absolute', bottom: 5,
                            width: 5, height: 5, borderRadius: 2.5,
                            backgroundColor: HOLIDAY_COLORS[topHol.type].dot,
                          }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* ── Trip summary (return picker only) ── */}
              {rangeStart && value && (() => {
                const startDate = new Date(rangeStart + 'T00:00:00');
                const endDate   = new Date(value      + 'T00:00:00');
                const nights    = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
                const fmtFull   = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
                return (
                  <View style={{
                    marginTop: 14, marginBottom: 4,
                    backgroundColor: `${colors.accent}12`,
                    borderRadius: 12, padding: 14,
                    borderLeftWidth: 3, borderLeftColor: colors.accent,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.accent, marginBottom: 3 }}>
                      {nights}-night trip
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                      Departing {fmtFull(startDate)} · returning {fmtFull(endDate)}
                    </Text>
                  </View>
                );
              })()}

              {/* ── Legend ── */}
              <Legend yearMonth={yearMonth} destination={destination} />

              {/* ── Cancel ── */}
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={{ marginTop: 16, alignItems: 'center', padding: 12 }}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
