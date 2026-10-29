import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ContactQuery, ContactQueryStatus } from '@/types/booking';

// Every query, across all users — RLS's admin policy is what makes this
// return more than the caller's own rows; a non-admin gets an empty list.
export function useAdminContactQueries() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('contact_queries')
      .select('*, contact_query_attachments(*)')
      .order('created_at', { ascending: false });
    setQueries((data as ContactQuery[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { queries, loading, refresh: load };
}

export async function getContactQueryDetail(id: string): Promise<ContactQuery | null> {
  const { data } = await supabase
    .from('contact_queries')
    .select('*, contact_query_attachments(*), contact_query_replies(*)')
    .eq('id', id)
    .single();
  return data as ContactQuery | null;
}

export async function updateQueryStatus(id: string, status: ContactQueryStatus): Promise<void> {
  await supabase.from('contact_queries').update({ status }).eq('id', id);
}

// Attachments live in a private bucket — resolved to a short-lived signed
// URL on demand rather than storing one, so it never goes stale.
export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('contact-attachments')
    .createSignedUrl(storagePath, 60 * 10); // 10 minutes — just enough to view/download
  return data?.signedUrl ?? null;
}
