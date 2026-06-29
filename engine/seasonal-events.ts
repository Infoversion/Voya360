import { SEASONAL_EVENTS, SeasonalEvent } from '@/constants/seasonal-events';

export interface ActiveEvent {
  name:        string;
  demandLevel: 'high' | 'very_high';
  daysUntil:   number;
}

export function getActiveEvents(
  destination: string,
  departureDate: Date,
  windowDays: number = 90,
): ActiveEvent[] {
  const results: ActiveEvent[] = [];
  const depTime = departureDate.getTime();

  for (const event of SEASONAL_EVENTS) {
    if (!event.corridors.includes(destination)) continue;

    for (const w of event.windows) {
      const year      = departureDate.getFullYear();
      const eventDate = new Date(year, w.month, w.day);
      const windowEnd = new Date(eventDate.getTime() + w.durationDays * 86400_000);

      const daysUntil = Math.floor((eventDate.getTime() - depTime) / 86400_000);

      if (depTime >= eventDate.getTime() && depTime <= windowEnd.getTime()) {
        results.push({ name: event.name, demandLevel: event.demandLevel, daysUntil: 0 });
      } else if (daysUntil > 0 && daysUntil <= windowDays) {
        results.push({ name: event.name, demandLevel: event.demandLevel, daysUntil });
      }
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}
