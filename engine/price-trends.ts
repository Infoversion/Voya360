import { PriceHistory } from '@/types/booking';

export type PriceTrend = 'up' | 'down' | 'stable';

export function calculateTrend(snapshots: PriceHistory[]): PriceTrend {
  if (snapshots.length < 2) return 'stable';

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime(),
  );

  const cutoff  = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent  = sorted.filter(s => new Date(s.snapshot_at).getTime() > cutoff);
  const older   = sorted.filter(s => new Date(s.snapshot_at).getTime() <= cutoff);

  if (!recent.length || !older.length) return 'stable';

  const avgRecent = avg(recent.map(s => s.price_usd ?? 0));
  const avgOlder  = avg(older.map(s => s.price_usd ?? 0));
  const diff      = avgRecent - avgOlder;
  const pct       = Math.abs(diff) / avgOlder;

  if (pct < 0.03) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

function avg(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
