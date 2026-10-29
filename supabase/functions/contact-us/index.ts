import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPPORT_FROM    = 'Voya360 Support <support@voya360.com>';
const DEFAULT_NOTIFY_EMAIL = 'support@infoversion.com';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email sending is best-effort and non-blocking — a failed or unconfigured
// send never rolls back the query/reply that triggered it, since the DB row
// is the source of truth and the email is just a notification of it.
async function sendEmail(to: string, subject: string, html: string, from: string = SUPPORT_FROM): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error(`Resend send failed (${res.status}): ${await res.text()}`);
    }
  } catch (err) {
    console.error('Resend send threw:', err instanceof Error ? err.message : err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();
    let result: unknown;

    switch (action) {

      // ── submit ──────────────────────────────────────────────────────────────
      // User submits a new contact query. Attachments are already uploaded to
      // storage client-side by this point — only their paths are passed here.
      case 'submit': {
        const { subject, message, attachments = [] } = payload as {
          subject:      string;
          message:      string;
          attachments?: Array<{ path: string; fileName: string; contentType?: string }>;
        };

        if (!subject?.trim() || !message?.trim()) {
          throw new Error('Subject and message are required.');
        }

        const { data: callerRow } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const { data: query, error: insertErr } = await supabase
          .from('contact_queries')
          .insert({
            user_id:         user.id,
            submitter_name:  callerRow?.full_name ?? null,
            submitter_email: user.email ?? '',
            subject:         subject.trim(),
            message:         message.trim(),
          })
          .select('id')
          .single();
        if (insertErr || !query) {
          throw new Error(insertErr?.message ?? 'Could not submit your message. Please try again.');
        }

        if (attachments.length > 0) {
          const { error: attachErr } = await supabase.from('contact_query_attachments').insert(
            attachments.map(a => ({
              query_id:     query.id,
              storage_path: a.path,
              file_name:    a.fileName,
              content_type: a.contentType ?? null,
            })),
          );
          if (attachErr) console.error('Failed to save attachment rows:', attachErr.message);
        }

        // app_settings is admin-only under RLS — a submitting user can't read
        // it with their own client, so the service-role client reads it here.
        const admin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { data: settingRow } = await admin
          .from('app_settings')
          .select('value')
          .eq('key', 'contact_notification_email')
          .maybeSingle();
        const notifyEmail = settingRow?.value || DEFAULT_NOTIFY_EMAIL;

        const attachmentLines = attachments.length
          ? `<p><strong>Attachments (${attachments.length}):</strong></p><ul>${attachments.map(a => `<li>${a.fileName}</li>`).join('')}</ul><p>View them in the admin app.</p>`
          : '';

        await sendEmail(
          notifyEmail,
          `New contact query: ${subject.trim()}`,
          `<p><strong>From:</strong> ${user.email}</p><p><strong>Subject:</strong> ${subject.trim()}</p><p>${message.trim().replace(/\n/g, '<br/>')}</p>${attachmentLines}`,
        );

        if (user.email) {
          await sendEmail(
            user.email,
            "We've received your message — Voya360 Support",
            `<p>Hi,</p><p>Thanks for reaching out — we've received your message about "<strong>${subject.trim()}</strong>" and will get back to you soon.</p><p>— Voya360 Support</p>`,
          );
        }

        result = { queryId: query.id };
        break;
      }

      // ── reply ───────────────────────────────────────────────────────────────
      // Admin replies to a query. Re-checks is_admin server-side regardless of
      // what the client believes — RLS also enforces this independently.
      case 'reply': {
        const { queryId, message } = payload as { queryId: string; message: string };
        if (!message?.trim()) throw new Error('Reply message is required.');

        const { data: callerProfile } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!callerProfile?.is_admin) {
          return new Response(JSON.stringify({ error: 'Not authorized.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: query, error: queryErr } = await supabase
          .from('contact_queries')
          .select('id, user_id, subject, status')
          .eq('id', queryId)
          .single();
        if (queryErr || !query) throw new Error('Query not found.');

        const { error: replyErr } = await supabase
          .from('contact_query_replies')
          .insert({ query_id: queryId, admin_user_id: user.id, message: message.trim() });
        if (replyErr) throw new Error(replyErr.message);

        if (query.status === 'new') {
          await supabase.from('contact_queries').update({ status: 'in_progress' }).eq('id', queryId);
        }

        // Resolve the recipient's email via the Auth admin API rather than
        // granting the admin's own client broad read access to other users'
        // profile rows — keeps the RLS surface minimal.
        const admin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { data: authUser } = await admin.auth.admin.getUserById(query.user_id);
        const recipientEmail = authUser?.user?.email;

        if (recipientEmail) {
          await sendEmail(
            recipientEmail,
            `Re: ${query.subject}`,
            `<p>Hi,</p><p>${message.trim().replace(/\n/g, '<br/>')}</p><p>— Voya360 Support</p>`,
          );
        }

        result = { replied: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
