import { supabase } from '@/lib/supabase';

async function proxyCall<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('contact-us', {
    body: { action, ...payload },
  });
  if (error) {
    const body = await (error as any).context?.json?.().catch?.(() => null);
    throw new Error(body?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data.data as T;
}

export interface UploadedAttachment {
  path:        string;
  fileName:    string;
  contentType: string;
}

// Supabase Storage rejects object keys containing spaces or other unsafe
// characters — picked file names (e.g. "Screenshot 2026-06-08 at 5.51.13 PM.png")
// commonly have both. Only the storage key needs sanitizing; the original
// name is kept as-is for display (file_name column, UI).
function sanitizeForStorageKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// Uploads a picked file (photo or document) to the private contact-attachments
// bucket, under the user's own folder — matches the RLS policy's
// (storage.foldername(name))[1] = auth.uid() check.
export async function uploadContactAttachment(
  userId:      string,
  uri:         string,
  fileName:    string,
  contentType: string,
): Promise<UploadedAttachment> {
  const path = `${userId}/${Date.now()}-${sanitizeForStorageKey(fileName)}`;
  const arrayBuffer = await fetch(uri).then(r => r.arrayBuffer());
  const { error } = await supabase.storage
    .from('contact-attachments')
    .upload(path, arrayBuffer, { contentType });
  if (error) throw error;
  return { path, fileName, contentType };
}

export async function submitContactQuery(params: {
  subject:     string;
  message:     string;
  attachments: UploadedAttachment[];
}): Promise<{ queryId: string }> {
  return proxyCall<{ queryId: string }>('submit', params as unknown as Record<string, unknown>);
}

export async function sendContactReply(queryId: string, message: string): Promise<void> {
  await proxyCall<{ replied: boolean }>('reply', { queryId, message });
}
