import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateTrend } from '@/engine/price-trends';
import type { PriceTrend } from '@/engine/price-trends';
import type { PriceHistory } from '@/types/booking';

export function usePriceHistory(
  origin?: string,
  destination?: string,
  cabinClass?: string,
): { trend: PriceTrend; loading: boolean } {
  const [trend, setTrend]     = useState<PriceTrend>('stable');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination) return;

    let cancelled = false;
    setLoading(true);

    supabase
      .from('price_history')
      .select('price_usd, snapshot_at')
      .eq('origin', origin)
      .eq('destination', destination)
      .eq('cabin_class', cabinClass ?? 'economy')
      .order('snapshot_at', { ascending: false })
      .limit(28) // ~7 days of snapshots at 4/day
      .then(({ data }) => {
        if (cancelled) return;
        setTrend(calculateTrend((data ?? []) as PriceHistory[]));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [origin, destination, cabinClass]);

  return { trend, loading };
}
