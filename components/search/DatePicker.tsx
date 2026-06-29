import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '@/constants/design';
import {
  getHolidaysForDate,
  HOLIDAY_COLORS,
  HolidayEntry,
} from '@/constants/public-holidays';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS      = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const TODAY_BG  = '#D1FAE5';
const TODAY_TEXT = '#065F46';
const TODAY_DOT  = '#10B981';
const RANGE_BG   = `${colors.accent}22`;
const MONTH_COUNT = 13; // current + 12 ahead

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function toISO(d: Date)  { return d.toISOString().split('T')[0]; }
function pad2(n: number) { return String(n).padStart(2, '0'); }
function fmtShort(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function genMonths(from: Date, count: number): { year: number; month: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
}

interface Props {
  isRoundTrip:  boolean;
  departure:    string | null;
  returnDate:   string | null;
  onDeparture:  (date: string) => void;
  onReturn:     (date: string | null) => void;
  destination?: string;
}

// ── Month grid ────────────────────────────────────────────────────────────────
interface MonthGridProps {
  year:        number;
  month:       number;
  today:       Date;
  departure:   string | null;
  returnDate:  string | null;
  destination?: string;
  onDay:       (iso: string) => void;
}

function MonthGrid({ year, month, today, departure, returnDate, destination, onDay }: MonthGridProps) {
  const yearMonth = `${year}-${pad2(month + 1)}`;
  const firstDay  = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);

  const holidayMap = useMemo<Record<number, HolidayEntry[]>>(() => {
    if (!destination) return {};
    const map: Record<number, HolidayEntry[]> = {};
    for (let d = 1; d <= totalDays; d++) {
      const hols = getHolidaysForDate(`${yearMonth}-${pad2(d)}`, destination);
      if (hols.length) map[d] = hols;
    }
    return map;
  }, [yearMonth, destination, totalDays]);

  const weeks = useMemo<(number | null)[][]>(() => {
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [firstDay, totalDays]);

  const depDate = departure  ? new Date(departure  + 'T00:00:00') : null;
  const retDate = returnDate ? new Date(returnDate + 'T00:00:00') : null;
  const todayStr = toISO(today);

  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12, paddingHorizontal: 2 }}>
        {MONTHS[month]} {year}
      </Text>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginBottom: 2 }}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={{ flex: 1, height: 46 }} />;

            const dateStr  = `${yearMonth}-${pad2(day)}`;
            const dayDate  = new Date(year, month, day);
            const isToday  = dateStr === todayStr;
            const isPast   = dayDate < today;
            const isWknd   = di === 0 || di === 6;
            const holidays = holidayMap[day] ?? [];
            const topHol   = holidays[0];

            const isDep    = dateStr === departure;
            const isRet    = dateStr === returnDate;
            const isInRange = !!(depDate && retDate && dayDate > depDate && dayDate < retDate);

            let circleBg = 'transparent';
            if (isDep || isRet)      circleBg = colors.accent;
            else if (isToday)        circleBg = TODAY_BG;

            let cellBg = 'transparent';
            if (isWknd && !topHol && !isDep && !isRet) cellBg = '#F9FAFB';
            if (topHol && !isDep && !isRet)            cellBg = HOLIDAY_COLORS[topHol.type].bg;

            let numColor: string = isWknd ? '#9CA3AF' : colors.text;
            if (isPast)                         numColor = '#D1D5DB';
            if (isDep || isRet)                 numColor = '#fff';
            if (isToday && !isDep && !isRet)    numColor = TODAY_TEXT;
            if (topHol && !isDep && !isRet && !isToday) numColor = HOLIDAY_COLORS[topHol.type].text;
            if (isInRange)                      numColor = colors.text;

            return (
              <TouchableOpacity
                key={di}
                onPress={() => !isPast && onDay(dateStr)}
                disabled={isPast}
                activeOpacity={0.65}
                style={{
                  flex: 1, height: 46,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cellBg,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                {/* Range fill strip */}
                {isInRange && (
                  <View style={{ position: 'absolute', top: 3, bottom: 3, left: 0, right: 0, backgroundColor: RANGE_BG }} />
                )}
                {isDep && retDate && (
                  <View style={{ position: 'absolute', top: 3, bottom: 3, right: 0, width: '50%', backgroundColor: RANGE_BG }} />
                )}
                {isRet && depDate && (
                  <View style={{ position: 'absolute', top: 3, bottom: 3, left: 0, width: '50%', backgroundColor: RANGE_BG }} />
                )}

                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: circleBg,
                  borderWidth: isToday && !isDep && !isRet ? 2 : 0,
                  borderColor: TODAY_DOT,
                }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: isDep || isRet || isToday ? '800' : '500',
                    color: numColor,
                    lineHeight: 19,
                  }}>
                    {day}
                  </Text>
                </View>

                {topHol && !isDep && !isRet && (
                  <View style={{
                    position: 'absolute', bottom: 3,
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: HOLIDAY_COLORS[topHol.type].dot,
                  }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DatePicker({ isRoundTrip, departure, returnDate, onDeparture, onReturn, destination }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const months = useMemo(() => genMonths(today, MONTH_COUNT), [today]);

  const [open,     setOpen]     = useState(false);
  const [localDep, setLocalDep] = useState<string | null>(null);
  const [localRet, setLocalRet] = useState<string | null>(null);

  const openCalendar = () => {
    setLocalDep(departure);
    setLocalRet(returnDate);
    setOpen(true);
  };

  const handleDay = (iso: string) => {
    if (!isRoundTrip) {
      setLocalDep(iso);
      return;
    }
    // Round-trip: if no dep or both already set → start over
    if (!localDep || (localDep && localRet)) {
      setLocalDep(iso);
      setLocalRet(null);
    } else {
      // dep set, ret not set
      if (iso > localDep) {
        setLocalRet(iso);
      } else {
        // tapped same day or earlier → reset to this day as new dep
        setLocalDep(iso);
        setLocalRet(null);
      }
    }
  };

  const canDone = isRoundTrip ? (!!localDep && !!localRet) : !!localDep;

  const handleDone = () => {
    if (!localDep) return;
    onDeparture(localDep);
    if (isRoundTrip) onReturn(localRet);
    setOpen(false);
  };

  // Hint shown below title
  const hint = isRoundTrip
    ? (!localDep ? 'Tap a date to set departure' : !localRet ? 'Now tap a return date' : null)
    : null;

  const nights = (localDep && localRet)
    ? Math.round((new Date(localRet + 'T00:00:00').getTime() - new Date(localDep + 'T00:00:00').getTime()) / 86400000)
    : null;

  const hasAny = !!departure || (isRoundTrip && !!returnDate);

  // Compact date label for single-line display
  const fmtTiny = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    const wd  = d.toLocaleDateString('en-US', { weekday: 'short' });
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${wd} ${mon} ${day}`;
  };

  const depTiny = departure  ? fmtTiny(departure)  : null;
  const retTiny = returnDate ? fmtTiny(returnDate) : null;

  const triggerText = (() => {
    if (!isRoundTrip) {
      return depTiny ? `Dep. ${depTiny}` : 'Select departure date';
    }
    if (depTiny && retTiny) return `Dep. ${depTiny} / Ret. ${retTiny}`;
    if (depTiny)            return `Dep. ${depTiny} / Ret. —`;
    return 'Select travel dates';
  })();

  return (
    <>
      {/* ── Single-line trigger ── */}
      <TouchableOpacity
        onPress={openCalendar}
        style={{
          marginTop: 12,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: spacing.touchTarget,
        }}
      >
        <Ionicons name="calendar-outline" size={20} color={hasAny ? colors.accent : colors.textMuted} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '400',
            color: hasAny ? colors.text : colors.textMuted,
          }}
        >
          {triggerText}
        </Text>
      </TouchableOpacity>

      {/* ── Modal ── */}
      <Modal visible={open} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FAFAFA',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: '92%',
          }}>

            {/* Sticky top bar */}
            <View style={{
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: '#FAFAFA',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}>
              {/* Drag handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 14 }} />

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                    {isRoundTrip ? 'Select dates' : 'Select departure'}
                  </Text>
                  {hint ? (
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 3 }}>{hint}</Text>
                  ) : nights !== null ? (
                    <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '700', marginTop: 3 }}>
                      {fmtShort(localDep)} → {fmtShort(localRet)} · {nights} night{nights !== 1 ? 's' : ''}
                    </Text>
                  ) : localDep && !isRoundTrip ? (
                    <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '700', marginTop: 3 }}>
                      {fmtShort(localDep)}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => setOpen(false)} style={{ paddingTop: 2 }}>
                  <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: '500' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day-of-week header — sticky */}
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: 20,
              paddingVertical: 8,
              backgroundColor: '#F5F5F5',
              borderBottomWidth: 1,
              borderBottomColor: '#EBEBEB',
            }}>
              {DAYS.map((d, i) => (
                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    color: (i === 0 || i === 6) ? '#9CA3AF' : colors.textMuted,
                    letterSpacing: 0.3,
                  }}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Scrollable months */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}
            >
              {months.map(({ year, month }) => (
                <MonthGrid
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  today={today}
                  departure={localDep}
                  returnDate={isRoundTrip ? localRet : null}
                  destination={destination}
                  onDay={handleDay}
                />
              ))}
            </ScrollView>

            {/* Done button */}
            <View style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: '#FAFAFA',
            }}>
              <TouchableOpacity
                onPress={handleDone}
                disabled={!canDone}
                style={{
                  backgroundColor: canDone ? colors.accent : `${colors.accent}50`,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#fff' }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </>
  );
}
