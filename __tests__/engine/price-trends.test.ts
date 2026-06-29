import { calculateTrend } from '@/engine/price-trends';
import type { PriceHistory } from '@/types/booking';

function makeSnapshot(price: number, daysAgo: number): PriceHistory {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  return {
    id: String(daysAgo),
    origin: 'JFK', destination: 'DEL',
    cabin_class: 'economy', departure_date: '2026-09-01',
    airline: 'EK', bags_included: false,
    price_usd: price,
    snapshot_at: d.toISOString(),
  } as PriceHistory;
}

describe('calculateTrend', () => {
  it('returns stable with fewer than 2 snapshots', () => {
    expect(calculateTrend([])).toBe('stable');
    expect(calculateTrend([makeSnapshot(500, 1)])).toBe('stable');
  });

  it('returns stable when recent and older prices are within 3%', () => {
    const snapshots = [
      makeSnapshot(500, 10), // older
      makeSnapshot(510, 2),  // recent — 2% increase, below threshold
    ];
    expect(calculateTrend(snapshots)).toBe('stable');
  });

  it('returns up when recent average is >3% higher than older', () => {
    const snapshots = [
      makeSnapshot(500, 10), // older
      makeSnapshot(560, 2),  // recent — 12% increase
    ];
    expect(calculateTrend(snapshots)).toBe('up');
  });

  it('returns down when recent average is >3% lower than older', () => {
    const snapshots = [
      makeSnapshot(600, 10), // older
      makeSnapshot(540, 2),  // recent — 10% decrease
    ];
    expect(calculateTrend(snapshots)).toBe('down');
  });

  it('returns stable when no snapshots fall in recent 7-day window', () => {
    const snapshots = [
      makeSnapshot(500, 20),
      makeSnapshot(600, 15),
    ];
    expect(calculateTrend(snapshots)).toBe('stable');
  });

  it('averages multiple snapshots in each window', () => {
    const snapshots = [
      makeSnapshot(400, 12), makeSnapshot(600, 11), // older avg = 500
      makeSnapshot(580, 3),  makeSnapshot(620, 2),  // recent avg = 600 (+20%)
    ];
    expect(calculateTrend(snapshots)).toBe('up');
  });
});
