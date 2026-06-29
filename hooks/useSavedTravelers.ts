import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SavedTraveler } from '@/types/booking';

export function useSavedTravelers() {
  const [travelers, setTravelers] = useState<SavedTraveler[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('saved_travelers')
      .select('*')
      .order('is_primary', { ascending: false });
    setTravelers((data as SavedTraveler[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTraveler = async (fields: Partial<SavedTraveler>): Promise<SavedTraveler | null> => {
    const { data, error } = await supabase
      .from('saved_travelers')
      .insert([fields])
      .select()
      .single();
    if (error || !data) return null;
    await load();
    return data as SavedTraveler;
  };

  const updateTraveler = async (id: string, fields: Partial<SavedTraveler>) => {
    await supabase.from('saved_travelers').update(fields).eq('id', id);
    await load();
  };

  const deleteTraveler = async (id: string) => {
    await supabase.from('saved_travelers').delete().eq('id', id);
    setTravelers(prev => prev.filter(t => t.id !== id));
  };

  return { travelers, loading, addTraveler, updateTraveler, deleteTraveler, refresh: load };
}
