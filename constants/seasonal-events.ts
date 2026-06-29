export interface SeasonalEvent {
  name:        string;
  corridors:   string[];  // destination IATA codes
  windows:     Array<{ month: number; day: number; durationDays: number }>;
  demandLevel: 'high' | 'very_high';
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    name: 'Eid al-Fitr',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'KHI', 'LHE', 'ISB', 'DAC', 'DXB', 'AUH'],
    windows: [
      { month: 3,  day: 20, durationDays: 30 }, // ~Apr 2025
      { month: 3,  day: 10, durationDays: 30 }, // ~Mar 2026
    ],
    demandLevel: 'very_high',
  },
  {
    name: 'Eid al-Adha',
    corridors: ['DEL', 'BOM', 'KHI', 'LHE', 'ISB', 'DAC', 'DXB', 'AUH'],
    windows: [
      { month: 5,  day: 27, durationDays: 21 }, // ~Jun 2025
      { month: 5,  day: 17, durationDays: 21 }, // ~Jun 2026
    ],
    demandLevel: 'high',
  },
  {
    name: 'Diwali',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'CCU'],
    windows: [
      { month: 9,  day: 15, durationDays: 30 }, // ~Oct
    ],
    demandLevel: 'very_high',
  },
  {
    name: 'Christmas / New Year',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'KHI', 'LHE', 'ISB', 'DAC', 'MNL', 'SIN', 'KUL'],
    windows: [
      { month: 11, day: 10, durationDays: 40 }, // Dec–Jan
    ],
    demandLevel: 'very_high',
  },
  {
    name: 'Summer holidays',
    corridors: ['DEL', 'BOM', 'HYD', 'MAA', 'BLR', 'CCU', 'KHI', 'LHE', 'ISB'],
    windows: [
      { month: 4,  day: 15, durationDays: 75 }, // May–Jul
    ],
    demandLevel: 'high',
  },
];
