import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ContactQuery } from '@/types/booking';

export function useContactQueries() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('contact_queries')
      .select('*, contact_query_attachments(*), contact_query_replies(*)')
      .order('created_at', { ascending: false });
    setQueries((data as ContactQuery[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { queries, loading, refresh: load };
}
