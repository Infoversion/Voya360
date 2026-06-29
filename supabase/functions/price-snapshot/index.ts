import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Top diaspora corridors to snapshot every 6 hours
const CORRIDORS = [
  { origin: 'JFK', destination: 'DEL' },
  { origin: 'JFK', destination: 'BOM' },
  { origin: 'JFK', destination: 'HYD' },
  { origin: 'JFK', destination: 'KHI' },
  { origin: 'JFK', destination: 'DAC' },
  { origin: 'ORD', destination: 'DEL' },
  { origin: 'ORD', destination: 'BOM' },
  { origin: 'LAX', destination: 'DEL' },
  { origin: 'LAX', destination: 'MNL' },
  { origin: 'SFO', destination: 'DEL' },
  { origin: 'LHR', destination: 'DEL' },
  { origin: 'LHR', destination: 'KHI' },
  { origin: 'YYZ', destination: 'DEL' },
  { origin: 'YYZ', destination: 'BOM' },
];

const CABIN_CLASSES = ['economy', 'business'];

const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_KEY  = Deno.env.get('DUFFEL_API_KEY') ?? '';

async function fetchLowestPrice(
  origin: string,
  destination: string,
  cabinClass: string,
): Promise<{ price: number; airline: string; bagsIncluded: boolean } | null> {
  // Use a date ~30 days out for the snapshot
  const dept = new Date();
  dept.setDate(dept.getDate() + 30);
  const departureDate = dept.toISOString().split('T')[0];

  try {
    const res = await fetch(`${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${DUFFEL_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type':   'application/json',
        'Accept':         'application/json',
      },
      body: JSON.stringify({
        data: {
          slices:      [{ origin, destination, departure_date: departureDate }],
          passengers:  [{ type: 'adult' }],
          cabin_class: cabinClass,
        },
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const offers = json.data?.offers ?? [];
    if (!offers.length) return null;

    // Sort by total_amount ascending
    offers.sort((a: { total_amount: string }, b: { total_amount: string }) =>
      parseFloat(a.total_amount) - parseFloat(b.total_amount),
    );

    const best = offers[0];
    const seg  = best.slices?.[0]?.segments?.[0];
    const pax  = seg?.passengers?.[0];
    const bags = (pax?.baggages ?? []).filter((b: { type: string }) => b.type === 'checked');
    const bagsIncluded = bags.some((b: { quantity: number }) => b.quantity > 0);

    return {
      price:       parseFloat(best.total_amount),
      airline:     seg?.marketing_carrier?.iata_code ?? '',
      bagsIncluded,
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')          ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const snapshotAt = new Date().toISOString();
    const rows: Array<{
      origin: string;
      destination: string;
      cabin_class: string;
      departure_date: string;
      airline: string;
      price_usd: number;
      bags_included: boolean;
      snapshot_at: string;
    }> = [];

    const deptDate = new Date();
    deptDate.setDate(deptDate.getDate() + 30);
    const departureDate = deptDate.toISOString().split('T')[0];

    for (const corridor of CORRIDORS) {
      for (const cabin of CABIN_CLASSES) {
        const result = await fetchLowestPrice(corridor.origin, corridor.destination, cabin);
        if (result) {
          rows.push({
            origin:         corridor.origin,
            destination:    corridor.destination,
            cabin_class:    cabin,
            departure_date: departureDate,
            airline:        result.airline,
            price_usd:      result.price,
            bags_included:  result.bagsIncluded,
            snapshot_at:    snapshotAt,
          });
        }
        // Rate limit — Duffel has burst limits
        await new Promise(r => setTimeout(r, 300));
      }
    }

    if (rows.length > 0) {
      await supabase.from('price_history').insert(rows);
    }

    return new Response(JSON.stringify({ snapped: rows.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
