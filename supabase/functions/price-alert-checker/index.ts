import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get all active alerts
    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('*, users!inner(id)')
      .eq('is_active', true)
      .is('triggered_at', null);

    if (!alerts?.length) {
      return new Response(JSON.stringify({ checked: 0, triggered: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let triggered = 0;

    for (const alert of alerts) {
      // Find the latest price snapshot for this corridor
      const { data: snapshots } = await supabase
        .from('price_history')
        .select('price_usd')
        .eq('origin', alert.origin)
        .eq('destination', alert.destination)
        .eq('cabin_class', alert.cabin_class)
        .order('snapshot_at', { ascending: false })
        .limit(1);

      const latestPrice = snapshots?.[0]?.price_usd;
      if (!latestPrice) continue;

      if (latestPrice <= alert.target_price_usd) {
        // Mark alert as triggered
        await supabase
          .from('price_alerts')
          .update({ triggered_at: new Date().toISOString(), is_active: false })
          .eq('id', alert.id);

        // Send push notification via Expo push service
        const { data: profile } = await supabase
          .from('users')
          .select('push_token')
          .eq('id', alert.user_id)
          .single();

        if (profile?.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to:    profile.push_token,
              title: '✈ Price alert triggered — Voya',
              body:  `${alert.origin}→${alert.destination} dropped to $${Math.round(latestPrice)}. Tap to book.`,
              data:  { origin: alert.origin, destination: alert.destination },
            }),
          });
        }

        triggered++;
      }
    }

    return new Response(JSON.stringify({ checked: alerts.length, triggered }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
