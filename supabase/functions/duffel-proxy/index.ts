import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_KEY  = Deno.env.get('DUFFEL_API_KEY') ?? '';

const SERVICE_FEE_USD = 9.99;

// Set to 'true' once Duffel enables Payments on your account.
// When false, orders are created with sandbox balance (no Stripe needed).
const DUFFEL_PAYMENTS_ENABLED = Deno.env.get('DUFFEL_PAYMENTS_ENABLED') === 'true';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getIncludedBags(offer: any): number {
  const pax = offer?.slices?.[0]?.segments?.[0]?.passengers?.[0];
  if (!pax) return 0;
  return (pax.baggages ?? [])
    .filter((b: any) => b.type === 'checked')
    .reduce((sum: number, b: any) => sum + (b.quantity as number), 0);
}

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

      case 'offer_requests_create': {
        const { origin, destination, departureDate, returnDate, isRoundTrip, passengers, cabinClass } = payload as {
          origin:        string;
          destination:   string;
          departureDate: string;
          returnDate?:   string;
          isRoundTrip?:  boolean;
          passengers:    Array<{ type: 'adult' | 'child' | 'infant_without_seat' }>;
          cabinClass:    string;
        };

        const slices = [{ origin, destination, departure_date: departureDate }];
        if (isRoundTrip && returnDate) {
          slices.push({ origin: destination, destination: origin, departure_date: returnDate });
        }

        result = await duffel('POST', '/air/offer_requests?return_offers=true', {
          slices,
          passengers,   // typed array passed directly — adults, children, infants
          cabin_class: cabinClass,
        });
        break;
      }

      case 'offer_get': {
        const { offerId } = payload as { offerId: string };
        result = await duffel('GET', `/air/offers/${offerId}`);
        break;
      }

      case 'payment_intent_create': {
        // Only available once Duffel Payments is enabled on the account.
        if (!DUFFEL_PAYMENTS_ENABLED) {
          // Return a sentinel so the client knows to skip Stripe.
          result = { id: 'sandbox_skip', clientToken: '', status: 'sandbox' };
          break;
        }
        const { offerId, amount, currency } = payload as {
          offerId:  string;
          amount:   string;
          currency: string;
        };
        const raw = await duffel('POST', '/payments/payment_intents', {
          currency,
          amount,
          services: [{ type: 'offer', id: offerId }],
        });
        result = { id: raw.id, clientToken: raw.client_token, status: raw.status };
        break;
      }

      case 'order_create': {
        const { offerId, passengers: paxList, paymentIntentId, amount, currency } = payload as {
          offerId:         string;
          passengers:      Array<{
            savedTravelerId: string | null;
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
          paymentIntentId: string;
          amount:          string;
          currency:        string;
        };

        // Fetch the offer so we have Duffel passenger IDs
        const offer = await duffel('GET', `/air/offers/${offerId}`);
        const offerPassengerIds: string[] = (offer.passengers ?? []).map((p: { id: string }) => p.id);

        const duffelPassengers = paxList.map((p, i) => ({
          id:          offerPassengerIds[i] ?? '',
          title:       'mr',
          given_name:  p.givenName,
          family_name: p.familyName,
          born_on:     p.dateOfBirth,
          gender:      p.gender,
          email:       p.email,
          phone_number: p.phone,
          identity_documents: [{
            unique_identifier:    p.passportNumber,
            issuing_country_code: p.passportCountry,
            expires_on:           p.passportExpiry,
            type:                 'passport',
          }],
        }));

        // Use sandbox balance payment when Duffel Payments isn't enabled yet.
        const payments = DUFFEL_PAYMENTS_ENABLED && paymentIntentId !== 'sandbox_skip'
          ? [{ type: 'payment_intent', id: paymentIntentId }]
          : [{ type: 'balance' }];

        result = await duffel('POST', '/air/orders', {
          type:       'instant',
          selected_offers: [offerId],
          passengers: duffelPassengers,
          payments,
        });
        break;
      }

      // ── booking_initiate ─────────────────────────────────────────────────
      // Single action that replaces the separate payment_intent_create + order_create flow.
      // • STRIPE_SECRET_KEY set  → creates Stripe PI + stores passengers in pending_bookings
      //   (passport numbers never touch Stripe metadata); returns clientSecret for the SDK.
      // • STRIPE_SECRET_KEY unset → sandbox path: creates Duffel order with balance payment
      //   and writes the bookings row directly, returns orderId so the client can redirect.
      case 'booking_initiate': {
        const { offerId, passengers: paxList, bagCount } = payload as {
          offerId:    string;
          passengers: Array<{
            savedTravelerId: string | null;
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
          bagCount: number;
        };

        // Fetch offer to get passenger IDs, flight details, and authoritative pricing.
        const offer = await duffel('GET', `/air/offers/${offerId}`);
        const offerPaxIds: string[] = (offer.passengers ?? []).map((p: { id: string }) => p.id);

        const duffelPassengers = paxList.map((p, i) => ({
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

        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

        if (!stripeKey) {
          // ── Sandbox: create order + write bookings row now ──────────────
          const order = await duffel('POST', '/air/orders', {
            type:            'instant',
            selected_offers: [offerId],
            passengers:      duffelPassengers,
            payments:        [{ type: 'balance' }],
          });

          const baseFare   = parseFloat(offer.total_amount ?? '0');
          const inclBags   = getIncludedBags(offer);
          const extraBags  = Math.max(0, bagCount - inclBags);
          const baggageFee = extraBags * 65;
          const totalUsd   = baseFare + SERVICE_FEE_USD + baggageFee;

          const slice    = offer.slices[0];
          const firstSeg = slice.segments[0];
          const lastSeg  = slice.segments[slice.segments.length - 1];

          await supabase.from('bookings').insert({
            user_id:         user.id,
            duffel_order_id: order.id,
            pnr:             order.booking_reference,
            status:          'confirmed',
            origin:          slice.origin.iata_code,
            destination:     slice.destination.iata_code,
            departure_at:    firstSeg.departing_at,
            arrival_at:      lastSeg.arriving_at,
            airline:         firstSeg.marketing_carrier.iata_code,
            cabin_class:     offer.passengers?.[0]?.cabin_class_marketing_name?.toLowerCase() ?? 'economy',
            passenger_count: paxList.length,
            base_fare_usd:   baseFare,
            service_fee_usd: SERVICE_FEE_USD,
            baggage_fee_usd: baggageFee,
            total_usd:       totalUsd,
          });

          result = { mode: 'sandbox', orderId: order.id, pnr: order.booking_reference };
          break;
        }

        // ── Production: create Stripe PI + save pending booking ─────────
        const stripe = new Stripe(stripeKey, {
          apiVersion:  '2024-04-10',
          httpClient:  Stripe.createFetchHttpClient(),
        });

        const baseFare   = parseFloat(offer.total_amount ?? '0');
        const inclBags   = getIncludedBags(offer);
        const extraBags  = Math.max(0, bagCount - inclBags);
        const baggageFee = extraBags * 65;
        const totalUsd   = baseFare + SERVICE_FEE_USD + baggageFee;
        const currency   = (offer.total_currency ?? 'usd').toLowerCase();

        const intent = await stripe.paymentIntents.create({
          amount:   Math.round(totalUsd * 100), // cents
          currency,
          // Only non-PII identifiers in Stripe metadata — passport data stays in pending_bookings.
          metadata: { user_id: user.id, offer_id: offerId },
        });

        // Service-role client to write pending_bookings (bypasses RLS).
        const admin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        await admin.from('pending_bookings').insert({
          user_id:         user.id,
          offer_id:        offerId,
          bag_count:       bagCount,
          stripe_intent:   intent.id,
          passengers_json: paxList,
          currency,
        });

        result = {
          mode:         'stripe',
          clientSecret: intent.client_secret,
          intentId:     intent.id,
        };
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
