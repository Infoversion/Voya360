// Public holidays per country, keyed by ISO-2 country code.
// date: 'MM-DD' = fixed every year | 'YYYY-MM-DD' = specific year (Islamic/lunar calendars)
export type HolidayType = 'national' | 'festival' | 'religious';

export interface HolidayEntry {
  date: string;
  name: string;
  type: HolidayType;
}

// Map IATA destination codes to ISO country codes
export const IATA_TO_COUNTRY: Record<string, string> = {
  // India
  DEL: 'IN', BOM: 'IN', HYD: 'IN', MAA: 'IN', BLR: 'IN', CCU: 'IN',
  // Pakistan
  KHI: 'PK', LHE: 'PK', ISB: 'PK',
  // Bangladesh
  DAC: 'BD',
  // Philippines
  MNL: 'PH',
  // Sri Lanka
  CMB: 'LK',
  // Nepal
  KTM: 'NP',
  // UAE
  DXB: 'AE', AUH: 'AE',
  // Singapore
  SIN: 'SG',
  // Malaysia
  KUL: 'MY',
};

export const HOLIDAYS_BY_COUNTRY: Record<string, HolidayEntry[]> = {

  IN: [ // India
    // Fixed national holidays
    { date: '01-26', name: 'Republic Day',      type: 'national'  },
    { date: '08-15', name: 'Independence Day',  type: 'national'  },
    { date: '10-02', name: 'Gandhi Jayanti',    type: 'national'  },
    { date: '12-25', name: 'Christmas',         type: 'festival'  },
    // Variable festivals (2025 & 2026 approximate)
    { date: '2025-02-26', name: 'Maha Shivaratri', type: 'religious' },
    { date: '2026-02-15', name: 'Maha Shivaratri', type: 'religious' },
    { date: '2025-03-14', name: 'Holi',             type: 'festival'  },
    { date: '2026-03-03', name: 'Holi',             type: 'festival'  },
    { date: '2025-03-31', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-04-14', name: 'Dr. Ambedkar Jayanti', type: 'national' },
    { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti', type: 'national' },
    { date: '2025-04-18', name: 'Good Friday',       type: 'religious' },
    { date: '2026-04-03', name: 'Good Friday',       type: 'religious' },
    { date: '2025-05-12', name: 'Buddha Purnima',    type: 'religious' },
    { date: '2026-05-01', name: 'Buddha Purnima',    type: 'religious' },
    { date: '2025-06-07', name: 'Eid al-Adha',       type: 'religious' },
    { date: '2026-05-27', name: 'Eid al-Adha',       type: 'religious' },
    { date: '2025-10-02', name: 'Dussehra',           type: 'festival'  },
    { date: '2026-10-22', name: 'Dussehra',           type: 'festival'  },
    { date: '2025-10-20', name: 'Diwali',             type: 'festival'  },
    { date: '2026-11-08', name: 'Diwali',             type: 'festival'  },
    { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'religious' },
    { date: '2026-10-25', name: 'Guru Nanak Jayanti', type: 'religious' },
  ],

  PK: [ // Pakistan
    { date: '02-05', name: 'Kashmir Solidarity Day', type: 'national'  },
    { date: '03-23', name: 'Pakistan Day',            type: 'national'  },
    { date: '05-01', name: 'Labour Day',              type: 'national'  },
    { date: '08-14', name: 'Independence Day',        type: 'national'  },
    { date: '11-09', name: 'Iqbal Day',               type: 'national'  },
    { date: '12-25', name: 'Jinnah\'s Birthday',      type: 'national'  },
    { date: '2025-03-31', name: 'Eid al-Fitr',   type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr',   type: 'religious' },
    { date: '2025-04-01', name: 'Eid al-Fitr',   type: 'religious' },
    { date: '2025-06-07', name: 'Eid al-Adha',   type: 'religious' },
    { date: '2026-05-27', name: 'Eid al-Adha',   type: 'religious' },
    { date: '2025-09-05', name: 'Eid Milad-un-Nabi', type: 'religious' },
    { date: '2026-08-25', name: 'Eid Milad-un-Nabi', type: 'religious' },
  ],

  BD: [ // Bangladesh
    { date: '02-21', name: 'Language Martyrs Day', type: 'national'  },
    { date: '03-26', name: 'Independence Day',      type: 'national'  },
    { date: '04-14', name: 'Bengali New Year',      type: 'festival'  },
    { date: '05-01', name: 'May Day',               type: 'national'  },
    { date: '08-15', name: 'National Mourning Day', type: 'national'  },
    { date: '12-16', name: 'Victory Day',           type: 'national'  },
    { date: '12-25', name: 'Christmas',             type: 'festival'  },
    { date: '2025-03-31', name: 'Eid al-Fitr', type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr', type: 'religious' },
    { date: '2025-06-07', name: 'Eid al-Adha', type: 'religious' },
    { date: '2026-05-27', name: 'Eid al-Adha', type: 'religious' },
  ],

  PH: [ // Philippines
    { date: '01-01', name: 'New Year\'s Day',     type: 'national'  },
    { date: '04-09', name: 'Araw ng Kagitingan',  type: 'national'  },
    { date: '05-01', name: 'Labour Day',           type: 'national'  },
    { date: '06-12', name: 'Independence Day',     type: 'national'  },
    { date: '08-25', name: 'National Heroes Day',  type: 'national'  },
    { date: '11-01', name: 'All Saints Day',       type: 'religious' },
    { date: '11-02', name: 'All Souls Day',        type: 'religious' },
    { date: '11-30', name: 'Bonifacio Day',        type: 'national'  },
    { date: '12-25', name: 'Christmas',            type: 'festival'  },
    { date: '12-30', name: 'Rizal Day',            type: 'national'  },
    { date: '2025-04-17', name: 'Maundy Thursday', type: 'religious' },
    { date: '2025-04-18', name: 'Good Friday',     type: 'religious' },
    { date: '2026-04-02', name: 'Maundy Thursday', type: 'religious' },
    { date: '2026-04-03', name: 'Good Friday',     type: 'religious' },
    { date: '2025-01-29', name: 'Chinese New Year', type: 'festival' },
    { date: '2026-02-17', name: 'Chinese New Year', type: 'festival' },
  ],

  LK: [ // Sri Lanka
    { date: '02-04', name: 'Independence Day',       type: 'national'  },
    { date: '04-13', name: 'Sinhala & Tamil New Year', type: 'festival' },
    { date: '04-14', name: 'Sinhala & Tamil New Year', type: 'festival' },
    { date: '05-01', name: 'Labour Day',              type: 'national'  },
    { date: '12-25', name: 'Christmas',               type: 'festival'  },
    { date: '2025-03-31', name: 'Eid al-Fitr',   type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr',   type: 'religious' },
    { date: '2025-05-12', name: 'Vesak Poya',    type: 'religious' },
    { date: '2026-05-01', name: 'Vesak Poya',    type: 'religious' },
  ],

  NP: [ // Nepal
    { date: '01-11', name: 'Prithvi Jayanti',       type: 'national' },
    { date: '02-19', name: 'National Democracy Day', type: 'national' },
    { date: '04-14', name: 'New Year (Bikram Sambat)', type: 'festival' },
    { date: '05-29', name: 'Republic Day',           type: 'national' },
    { date: '12-25', name: 'Christmas',              type: 'festival' },
    { date: '2025-10-20', name: 'Tihar/Diwali', type: 'festival' },
    { date: '2026-11-08', name: 'Tihar/Diwali', type: 'festival' },
  ],

  AE: [ // UAE
    { date: '01-01', name: 'New Year\'s Day',  type: 'national'  },
    { date: '12-02', name: 'UAE National Day', type: 'national'  },
    { date: '12-03', name: 'UAE National Day', type: 'national'  },
    { date: '2025-03-31', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-04-01', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-04-02', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2026-03-21', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-06-06', name: 'Arafat (Eid Eve)', type: 'religious' },
    { date: '2025-06-07', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2025-06-08', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2025-06-09', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2026-05-27', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2026-05-28', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2026-05-29', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2025-06-27', name: 'Islamic New Year',  type: 'religious' },
    { date: '2025-09-05', name: 'Prophet\'s Birthday', type: 'religious' },
  ],

  SG: [ // Singapore
    { date: '01-01', name: 'New Year\'s Day',  type: 'national' },
    { date: '05-01', name: 'Labour Day',       type: 'national' },
    { date: '08-09', name: 'National Day',     type: 'national' },
    { date: '12-25', name: 'Christmas',        type: 'festival' },
    { date: '2025-01-29', name: 'Chinese New Year', type: 'festival' },
    { date: '2025-01-30', name: 'Chinese New Year', type: 'festival' },
    { date: '2026-02-17', name: 'Chinese New Year', type: 'festival' },
    { date: '2026-02-18', name: 'Chinese New Year', type: 'festival' },
    { date: '2025-04-18', name: 'Good Friday',      type: 'religious' },
    { date: '2026-04-03', name: 'Good Friday',      type: 'religious' },
    { date: '2025-03-31', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-05-12', name: 'Vesak Day',         type: 'religious' },
    { date: '2026-05-01', name: 'Vesak Day',         type: 'religious' },
    { date: '2025-10-20', name: 'Deepavali',         type: 'festival' },
    { date: '2026-11-08', name: 'Deepavali',         type: 'festival' },
  ],

  MY: [ // Malaysia
    { date: '01-01', name: 'New Year\'s Day',  type: 'national' },
    { date: '05-01', name: 'Labour Day',       type: 'national' },
    { date: '08-31', name: 'National Day',     type: 'national' },
    { date: '09-16', name: 'Malaysia Day',     type: 'national' },
    { date: '12-25', name: 'Christmas',        type: 'festival' },
    { date: '2025-01-29', name: 'Chinese New Year', type: 'festival' },
    { date: '2025-01-30', name: 'Chinese New Year', type: 'festival' },
    { date: '2026-02-17', name: 'Chinese New Year', type: 'festival' },
    { date: '2026-02-18', name: 'Chinese New Year', type: 'festival' },
    { date: '2025-03-31', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-04-01', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2026-03-20', name: 'Eid al-Fitr',      type: 'religious' },
    { date: '2025-06-07', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2026-05-27', name: 'Eid al-Adha',      type: 'religious' },
    { date: '2025-10-20', name: 'Deepavali',         type: 'festival' },
    { date: '2026-11-08', name: 'Deepavali',         type: 'festival' },
  ],
};

/** Returns all holidays for a given date string (YYYY-MM-DD) and destination IATA. */
export function getHolidaysForDate(dateStr: string, destinationIata: string): HolidayEntry[] {
  const country = IATA_TO_COUNTRY[destinationIata?.toUpperCase()];
  if (!country) return [];
  const entries = HOLIDAYS_BY_COUNTRY[country] ?? [];
  const mmdd = dateStr.slice(5); // 'MM-DD'
  return entries.filter(h => h.date === dateStr || h.date === mmdd);
}

/** Returns all holidays that fall in a given year-month (YYYY-MM) for a destination. */
export function getHolidaysForMonth(yearMonth: string, destinationIata: string): HolidayEntry[] {
  const country = IATA_TO_COUNTRY[destinationIata?.toUpperCase()];
  if (!country) return [];
  const entries = HOLIDAYS_BY_COUNTRY[country] ?? [];
  const mm = yearMonth.slice(5); // 'MM'
  const seen = new Set<string>();
  return entries.filter(h => {
    const matches = h.date.startsWith(yearMonth) || h.date.slice(0, 2) === mm;
    if (!matches) return false;
    if (seen.has(h.name)) return false;
    seen.add(h.name);
    return true;
  });
}

export const HOLIDAY_COLORS: Record<HolidayType, { bg: string; text: string; dot: string }> = {
  national:  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6' },  // blue
  festival:  { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B' },  // amber/gold
  religious: { bg: '#EDE9FE', text: '#6D28D9', dot: '#8B5CF6' },  // purple
};
