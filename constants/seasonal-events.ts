export interface SeasonalEvent {
  name:        string;
  corridors:   string[];  // destination IATA codes
  windows:     Array<{ month: number; day: number; durationDays: number }>;
  demandLevel: 'high' | 'very_high';
}

// month is 0-indexed (JS Date): 0=Jan, 1=Feb, 2=Mar, 3=Apr, 4=May, 5=Jun ...
// Islamic festivals shift ~11 days earlier each Gregorian year.
// durationDays covers the travel surge window starting from the event date.

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    name: 'Eid al-Fitr',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'KHI', 'LHE', 'ISB', 'DAC', 'DXB', 'AUH'],
    windows: [
      { month: 2,  day: 30, durationDays: 30 }, // Mar 30 2025
      { month: 2,  day: 20, durationDays: 30 }, // Mar 20 2026
      { month: 2,  day:  9, durationDays: 30 }, // Mar  9 2027
    ],
    demandLevel: 'very_high',
  },
  {
    name: 'Eid al-Adha',
    corridors: ['DEL', 'BOM', 'KHI', 'LHE', 'ISB', 'DAC', 'DXB', 'AUH'],
    windows: [
      { month: 5,  day:  6, durationDays: 21 }, // Jun  6 2025
      { month: 4,  day: 27, durationDays: 21 }, // May 27 2026 — window closes Jun 17
      { month: 4,  day: 17, durationDays: 21 }, // May 17 2027
    ],
    demandLevel: 'high',
  },
  {
    name: 'Diwali',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'CCU'],
    windows: [
      { month: 9,  day: 20, durationDays: 30 }, // ~Oct 20 2025
      { month: 9,  day:  8, durationDays: 30 }, // ~Oct  8 2026
    ],
    demandLevel: 'very_high',
  },
  {
    name: 'Christmas / New Year',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'KHI', 'LHE', 'ISB', 'DAC', 'MNL', 'SIN', 'KUL'],
    windows: [
      { month: 11, day: 10, durationDays: 40 }, // Dec 10 → Jan 19
    ],
    demandLevel: 'very_high',
  },
  {
    name: 'Summer holidays',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'CCU', 'KHI', 'LHE', 'ISB'],
    windows: [
      { month: 4,  day: 15, durationDays: 75 }, // May 15 → Jul 29
    ],
    demandLevel: 'high',
  },
];
