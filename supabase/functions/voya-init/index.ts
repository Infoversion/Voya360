import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Switch provider via Supabase secret:
//   AI_PROVIDER=grok   → Grok (default, testing)
//   AI_PROVIDER=haiku  → Claude Haiku 4.5 (live)
const AI_PROVIDER = Deno.env.get('AI_PROVIDER') ?? 'grok';

const SYSTEM_PROMPT = `You are Voya, a silent travel intelligence layer for a mobile flight booking app serving South and Southeast Asian diaspora travelers (H1B/Green Card holders, international students, diaspora families).

Generate a JSON array of up to 7 ranked travel observations for this user's session. These appear as dismissible insight cards on relevant app screens.

Rules:
- Headlines ≤ 60 chars, body ≤ 120 chars
- Be specific — use actual numbers and route names when available
- Only include observations that are actionable right now
- Never repeat the same type twice
- Tone: confident, like a knowledgeable friend

Each observation must have:
- type: one of [corridor_opportunity, day_of_week_saving, baggage_comparison, seasonal_demand, hidden_passenger_saving, fastest_route, booking_validation, post_booking_tip]
- headline: short bold title
- body: 1–2 sentences of detail
- priority: 1 (most important) to 7 (least)

Respond ONLY with valid JSON: { "observations": [...] }`;

async function callGrok(userContext: string): Promise<{ observations: unknown[] }> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('GROK_API_KEY') ?? ''}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'grok-2-mini',
      max_tokens:  600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Generate travel observations for this user:\n\n${userContext}` },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grok error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : { observations: [] };
}

async function callHaiku(userContext: string): Promise<{ observations: unknown[] }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     SYSTEM_PROMPT,
      messages:   [{
        role:    'user',
        content: `Generate travel observations for this user:\n\n${userContext}`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Haiku error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json.content?.[0]?.text ?? '{}';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : { observations: [] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')      ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      homeOrigin,
      homeDestination,
      preferredAirlines = [],
      savedTravelerCount = 0,
      dietaryPreference,
    } = await req.json() as {
      homeOrigin?:         string | null;
      homeDestination?:    string | null;
      preferredAirlines?:  string[];
      savedTravelerCount?: number;
      dietaryPreference?:  string | null;
    };

    // Fetch latest price snapshots for the user's corridor
    const priceContext: string[] = [];
    if (homeOrigin && homeDestination) {
      const { data: snapshots } = await supabase
        .from('price_history')
        .select('price_usd, snapshot_at')
        .eq('origin', homeOrigin)
        .eq('destination', homeDestination)
        .order('snapshot_at', { ascending: false })
        .limit(10);

      if (snapshots && snapshots.length > 0) {
        const prices = snapshots.map(s => s.price_usd).filter(Boolean) as number[];
        const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
        const latest = prices[0];
        const pct    = Math.round(((latest - avg) / avg) * 100);
        priceContext.push(
          `${homeOrigin}→${homeDestination}: latest $${Math.round(latest)}, ` +
          `avg $${Math.round(avg)}, trend ${pct > 0 ? '+' : ''}${pct}%`,
        );
      }
    }

    const { count: alertCount } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const userContext = [
      homeOrigin && homeDestination
        ? `Home corridor: ${homeOrigin} → ${homeDestination}`
        : 'No home corridor set yet',
      preferredAirlines.length > 0
        ? `Preferred airlines: ${preferredAirlines.join(', ')}`
        : 'No preferred airlines set',
      `Saved traveler profiles: ${savedTravelerCount}`,
      `Past bookings: ${bookingCount ?? 0}`,
      `Active price alerts: ${alertCount ?? 0}`,
      dietaryPreference ? `Dietary preference: ${dietaryPreference}` : null,
      ...priceContext,
    ].filter(Boolean).join('\n');

    const result = AI_PROVIDER === 'haiku'
      ? await callHaiku(userContext)
      : await callGrok(userContext);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    // Voya always fails silently — never blocks the user
    return new Response(JSON.stringify({ observations: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
