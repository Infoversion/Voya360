import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_KEY  = Deno.env.get('DUFFEL_API_KEY') ?? '';

// Set to 'true' once Duffel enables Payments on your account.
// When false, orders are created with sandbox balance (no Stripe needed).
const DUFFEL_PAYMENTS_ENABLED = Deno.env.get('DUFFEL_PAYMENTS_ENABLED') === 'true';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
