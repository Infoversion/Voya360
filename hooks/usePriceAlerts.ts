import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PriceAlert } from '@/types/booking';

export function usePriceAlerts() {
  const [alerts,  setAlerts]  = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('price_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    setAlerts((data as PriceAlert[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAlert = async (fields: {
    origin:           string;
    destination:      string;
    target_price_usd: number;
    cabin_class:      string;
  }): Promise<PriceAlert | null> => {
    const { data, error } = await supabase
      .from('price_alerts')
      .insert([{ ...fields, is_active: true }])
      .select()
      .single();
    if (!error) await load();
    return error ? null : (data as PriceAlert);
  };

  const deleteAlert = async (id: string) => {
    await supabase.from('price_alerts').delete().eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return { alerts, loading, createAlert, deleteAlert, refresh: load };
}
