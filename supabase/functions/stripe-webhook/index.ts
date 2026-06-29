import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const SERVICE_FEE_USD = 9.99;
const DUFFEL_BASE     = 'https://api.duffel.com';
const DUFFEL_KEY      = Deno.env.get('DUFFEL_API_KEY') ?? '';

async function duffel(method: string, path: string, body?: unknown) {
  const res = await fetch(`${DUFFEL_BASE}${path}`, {
    method,
    headers: {
      'Authorization':  `Bearer ${DUFFEL_KEY}`,
      'Duffel-Version': 'v2',
      'Content-Type':   'application/json',
      'Accept':         'application/json',
    },
    body: body ? JSON.stringify({ data: body }) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.errors?.[0]?.message ?? `Duffel error ${res.status}`);
  }
  return json.data;
}

function getIncludedBags(offer: any): number {
  const pax = offer?.slices?.[0]?.segments?.[0]?.passengers?.[0];
  if (!pax) return 0;
  return (pax.baggages ?? [])
    .filter((b: any) => b.type === 'checked')
    .reduce((sum: number, b: any) => sum + (b.quantity as number), 0);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-04-10',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    );
  } catch (err) {
    console.error('Stripe signature verification failed:', (err as Error).message);
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 });
  }

  // Only act on payment success; acknowledge all other events immediately.
  if (event.type !== 'payment_intent.succeeded') {
    return new Response('ok', { status: 200 });
  }

  const intent = event.data.object as Stripe.PaymentIntent;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Idempotency guard — Stripe may retry on non-2xx or network failures.
  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('stripe_payment_intent_id', intent.id)
    .maybeSingle();

  if (existing) {
    return new Response('ok', { status: 200 });
  }

  const { data: pending, error: pendingErr } = await admin
    .from('pending_bookings')
    .select('*')
    .eq('stripe_intent', intent.id)
    .single();

  if (pendingErr || !pending) {
    console.error('No pending booking for intent', intent.id, pendingErr?.message);
    return new Response('Pending booking not found', { status: 400 });
  }

  try {
    const passengers = pending.passengers_json as Array<{
      givenName:       string;
      familyName:      string;
      dateOfBirth:     string;
      passportNumber:  string;
      passportCountry: string;
      passportExpiry:  string;
      gender:          string;
      email:           string;
      phone:           string;
    }>;

    // Fetch fresh offer for passenger IDs and flight metadata.
    const offer     = await duffel('GET', `/air/offers/${pending.offer_id}`);
    const offerPaxIds: string[] = (offer.passengers ?? []).map((p: { id: string }) => p.id);

    const duffelPassengers = passengers.map((p, i) => ({
      id:           offerPaxIds[i] ?? '',
      title:        'mr',
      given_name:   p.givenName,
      family_name:  p.familyName,
      born_on:      p.dateOfBirth,
      gender:       p.gender,
      email:        p.email,
      phone_number: p.phone,
      identity_documents: [{
        unique_identifier:    p.passportNumber,
        issuing_country_code: p.passportCountry,
        expires_on:           p.passportExpiry,
        type:                 'passport',
      }],
    }));

    // Voya360 pays Duffel from its pre-funded Duffel account balance.
    const order = await duffel('POST', '/air/orders', {
      type:            'instant',
      selected_offers: [pending.offer_id],
      passengers:      duffelPassengers,
      payments:        [{
        type:     'balance',
        currency: (pending.currency as string).toUpperCase(),
        amount:   offer.total_amount,
      }],
    });

    // Compute costs from authoritative Duffel data, not client-sent values.
    const baseFare    = parseFloat(offer.total_amount ?? '0');
    const extraBags   = Math.max(0, (pending.bag_count as number) - getIncludedBags(offer));
    const baggageFee  = extraBags * 65;
    const totalUsd    = baseFare + SERVICE_FEE_USD + baggageFee;

    const slice    = offer.slices[0];
    const firstSeg = slice.segments[0];
    const lastSeg  = slice.segments[slice.segments.length - 1];

    await admin.from('bookings').insert({
      user_id:                  pending.user_id,
      duffel_order_id:          order.id,
      pnr:                      order.booking_reference,
      status:                   'confirmed',
      origin:                   slice.origin.iata_code,
      destination:              slice.destination.iata_code,
      departure_at:             firstSeg.departing_at,
      arrival_at:               lastSeg.arriving_at,
      airline:                  firstSeg.marketing_carrier.iata_code,
      cabin_class:              offer.passengers?.[0]?.cabin_class_marketing_name?.toLowerCase() ?? 'economy',
      passenger_count:          passengers.length,
      base_fare_usd:            baseFare,
      service_fee_usd:          SERVICE_FEE_USD,
      baggage_fee_usd:          baggageFee,
      total_usd:                totalUsd,
      stripe_payment_intent_id: intent.id,
    });

    // Remove the pending entry — passport data no longer needed.
    await admin.from('pending_bookings').delete().eq('id', pending.id);

    return new Response('ok', { status: 200 });
  } catch (err) {
    // Return 5xx so Stripe retries on transient errors (Duffel timeout, etc.).
    const message = err instanceof Error ? err.message : 'Processing error';
    console.error('stripe-webhook processing error:', message);
    return new Response(message, { status: 500 });
  }
});
