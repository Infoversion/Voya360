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

function toE164(phone: string): string {
  // Strip everything except digits and a leading +
  const digits = phone.replace(/[^\d+]/g, '');
  // Ensure it starts with +
  return digits.startsWith('+') ? digits : `+${digits}`;
}

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

        const firstValidPhone2 = (() => {
          for (const p of paxList) {
            const n = toE164(p.phone ?? '');
            if (/^\+[1-9]\d{6,14}$/.test(n)) return n;
          }
          return null;
        })();

        const duffelPassengers = paxList.map((p, i) => {
          const normalized = toE164(p.phone ?? '');
          const phoneOk    = /^\+[1-9]\d{6,14}$/.test(normalized);
          return {
          id:          offerPassengerIds[i] ?? '',
          title:       'mr',
          given_name:  p.givenName,
          family_name: p.familyName,
          born_on:     p.dateOfBirth,
          gender:      p.gender,
          email:       p.email,
          phone_number: phoneOk ? normalized : (firstValidPhone2 ?? normalized),
          identity_documents: [{
            unique_identifier:    p.passportNumber,
            issuing_country_code: p.passportCountry,
            expires_on:           p.passportExpiry,
            type:                 'passport',
          }],
          };
        });

        // Use sandbox balance payment when Duffel Payments isn't enabled yet.
        const payments = DUFFEL_PAYMENTS_ENABLED && paymentIntentId !== 'sandbox_skip'
          ? [{ type: 'payment_intent', id: paymentIntentId }]
          : [{ type: 'balance', amount: offer.total_amount, currency: offer.total_currency }];

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
      // ── seat_map_get ──────────────────────────────────────────────────────────
      case 'seat_map_get': {
        const { offerId } = payload as { offerId: string };
        const data = await duffel('GET', `/air/seat_maps?offer_id=${offerId}`);
        result = Array.isArray(data) ? data : (data ?? []);
        break;
      }

      // ── available_services_get ────────────────────────────────────────────────
      case 'available_services_get': {
        const { offerId } = payload as { offerId: string };
        const data = await duffel('GET', `/air/offers/${offerId}/available_services`);
        result = (Array.isArray(data) ? data : (data ?? []))
          .filter((s: any) => s.type === 'baggage');
        break;
      }

      case 'booking_initiate': {
        const { offerId, passengers: paxList, bagCount, services: extraServices = [] } = payload as {
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
          bagCount:  number;
          services?: Array<{ id: string; quantity: number }>;
        };

        // Fetch offer to get passenger IDs, flight details, and authoritative pricing.
        const offer = await duffel('GET', `/air/offers/${offerId}`);
        const offerPaxIds: string[] = (offer.passengers ?? []).map((p: { id: string }) => p.id);

        // E.164 with minimum 11 digits total (catches too-short numbers like +9727993028)
        const PHONE_RE = /^\+[1-9]\d{10,14}$/;

        // Validate all passenger phones before hitting Duffel
        for (let i = 0; i < paxList.length; i++) {
          if (paxList[i].type === 'infant_without_seat') continue;
          const norm = toE164(paxList[i].phone ?? '');
          if (!PHONE_RE.test(norm)) {
            throw new Error(
              `Phone number "${norm}" for passenger ${i + 1} is invalid. ` +
              `Must be a full international number with country code, e.g. +12125551234 (US), +919876543210 (India), +923001234567 (Pakistan). ` +
              `Go back to Passenger details and update it.`
            );
          }
        }

        const duffelPassengers = paxList.map((p, i) => {
          const norm = toE164(p.phone ?? '');
          // Infants inherit first adult's validated phone
          const adultPhone = toE164(paxList.find(x => x.type !== 'infant_without_seat')?.phone ?? '');
          return {
            id:           offerPaxIds[i] ?? '',
            title:        'mr',
            given_name:   p.givenName,
            family_name:  p.familyName,
            born_on:      p.dateOfBirth,
            gender:       p.gender,
            email:        p.email || paxList[0].email,
            phone_number: p.type === 'infant_without_seat' ? adultPhone : norm,
            identity_documents: [{
              unique_identifier:    p.passportNumber,
              issuing_country_code: p.passportCountry,
              expires_on:           p.passportExpiry,
              type:                 'passport',
            }],
          };
        });

        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

        if (!stripeKey) {
          // ── Sandbox: create order + write bookings row now ──────────────
          if (!offer.total_amount || !offer.total_currency) {
            throw new Error('Offer price is missing — it may have expired. Please go back and search again.');
          }
          const order = await duffel('POST', '/air/orders', {
            type:            'instant',
            selected_offers: [offerId],
            passengers:      duffelPassengers,
            services:        extraServices,
            payments:        [{
              type:     'balance',
              amount:   offer.total_amount,
              currency: offer.total_currency,
            }],
          });

          const baseFare   = parseFloat(offer.total_amount ?? '0');
          const inclBags   = getIncludedBags(offer);
          const extraBags  = Math.max(0, bagCount - inclBags);
          const baggageFee = extraBags * 65;
          const totalUsd   = baseFare + SERVICE_FEE_USD + baggageFee;

          const slice    = offer.slices[0];
          const firstSeg = slice.segments[0];
          const lastSeg  = slice.segments[slice.segments.length - 1];

          const { data: bookingRow } = await supabase.from('bookings').insert({
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
          }).select('id').single();

          if (bookingRow?.id) {
            await supabase.from('booking_passengers').insert(
              paxList.map((p: any) => ({
                booking_id:         bookingRow.id,
                saved_traveler_id:  p.savedTravelerId ?? null,
                full_name:          `${p.givenName} ${p.familyName}`.trim(),
                dietary_preference: p.dietary ?? null,
              }))
            );
          }

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

      // ── order_get ────────────────────────────────────────────────────────────
      // Fetches the live Duffel order so the client can inspect slices/passengers.
      case 'order_get': {
        const { duffelOrderId } = payload as { duffelOrderId: string };
        result = await duffel('GET', `/air/orders/${duffelOrderId}`);
        break;
      }

      // ── order_change_preview ──────────────────────────────────────────────────
      // Creates an order change request to remove specific slices (does NOT confirm).
      // Returns the refund offer so the user can see what they'll get back.
      case 'order_change_preview': {
        const { duffelOrderId, removeSliceIds } = payload as {
          duffelOrderId:  string;
          removeSliceIds: string[];
        };

        const changeReq = await duffel('POST', '/air/order_change_requests', {
          order_id: duffelOrderId,
          slices: {
            remove: removeSliceIds.map((id: string) => ({ slice_id: id })),
            add:    [],
          },
        });

        const offers = changeReq.order_change_offers ?? [];
        if (!offers.length) {
          throw new Error(
            'This airline does not support online partial cancellations. ' +
            'Please email support@voya360.com or contact the airline directly.',
          );
        }

        const offer      = offers[0];
        const changeAmt  = parseFloat(offer.change_total_amount  ?? '0');
        const penaltyAmt = parseFloat(offer.penalty_total_amount ?? '0');

        result = {
          changeOfferId: offer.id,
          // change_total_amount is negative when the customer receives a refund
          refundAmount:  Math.abs(Math.min(0, changeAmt)).toFixed(2),
          penaltyAmount: penaltyAmt.toFixed(2),
          currency:      (offer.change_total_currency ?? 'USD').toUpperCase(),
        };
        break;
      }

      // ── order_change_confirm ──────────────────────────────────────────────────
      // Confirms a previously offered order change (slice removal).
      case 'order_change_confirm': {
        const { changeOfferId, duffelOrderId, newStatus } = payload as {
          changeOfferId: string;
          duffelOrderId: string;
          newStatus:     string;
        };

        try {
          const orderChange = await duffel('POST', '/air/order_changes', {
            selected_order_change_offer: changeOfferId,
          });
          await duffel('POST', `/air/order_changes/${orderChange.id}/actions/confirm`);
        } catch (_) {
          // Sandbox limitation — still update DB below.
        }

        const { error: updateErr } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('duffel_order_id', duffelOrderId)
          .eq('user_id', user.id);

        if (updateErr) throw new Error(`Failed to update booking status: ${updateErr.message}`);

        result = { changed: true };
        break;
      }

      // ── order_cancel_preview ──────────────────────────────────────────────────
      // In production: calls Duffel to create a cancellation object and returns
      // the airline's refund offer. In sandbox (no STRIPE_SECRET_KEY): calculates
      // refund from our DB to avoid Duffel sandbox limitations.
      case 'order_cancel_preview': {
        const { duffelOrderId } = payload as { duffelOrderId: string };

        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
        if (!stripeKey) {
          // Sandbox path — derive refund from DB without hitting Duffel
          const { data: booking } = await supabase
            .from('bookings')
            .select('base_fare_usd, total_usd')
            .eq('duffel_order_id', duffelOrderId)
            .eq('user_id', user.id)
            .single();

          result = {
            cancellationId: 'sandbox_preview',
            refundAmount:   ((booking?.base_fare_usd as number) ?? 0).toFixed(2),
            refundCurrency: 'USD',
            refundTo:       'original_form_of_payment',
            expiresAt:      null,
          };
          break;
        }

        // Production path — use Duffel API
        const cancellation = await duffel('POST', '/air/order_cancellations', {
          order_id: duffelOrderId,
        });

        result = {
          cancellationId: cancellation.id,
          refundAmount:   cancellation.refund_amount   ?? '0.00',
          refundCurrency: cancellation.refund_currency ?? 'USD',
          refundTo:       cancellation.refund_to       ?? 'original_form_of_payment',
          expiresAt:      cancellation.expires_at      ?? null,
        };
        break;
      }

      // ── order_cancel_confirm ──────────────────────────────────────────────────
      // Confirms a previously created cancellation and marks the booking cancelled.
      case 'order_cancel_confirm': {
        const { cancellationId, duffelOrderId } = payload as {
          cancellationId: string;
          duffelOrderId:  string;
        };

        // In sandbox the cancellationId is a sentinel — skip Duffel entirely.
        // In production, confirm with Duffel (errors are caught so DB always updates).
        if (cancellationId !== 'sandbox_preview') {
          try {
            await duffel('POST', `/air/order_cancellations/${cancellationId}/actions/confirm`);
          } catch (_) {
            // Sandbox or transient error — still update DB below.
          }
        }

        const { error: updateErr } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('duffel_order_id', duffelOrderId)
          .eq('user_id', user.id);

        if (updateErr) throw new Error(`Failed to update booking status: ${updateErr.message}`);

        result = { cancelled: true };
        break;
      }

      // ── delete_account ────────────────────────────────────────────────────────
      // Deletes all user data and the auth user. Irreversible.
      case 'delete_account': {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Delete in FK-safe order
        const { data: bookingRows } = await admin
          .from('bookings').select('id').eq('user_id', user.id);
        if (bookingRows && bookingRows.length > 0) {
          const ids = bookingRows.map((b: { id: string }) => b.id);
          await admin.from('booking_passengers').delete().in('booking_id', ids);
        }
        await admin.from('bookings').delete().eq('user_id', user.id);
        await admin.from('price_alerts').delete().eq('user_id', user.id);
        await admin.from('saved_travelers').delete().eq('user_id', user.id);
        await admin.from('users').delete().eq('id', user.id);

        const { error: authDeleteErr } = await admin.auth.admin.deleteUser(user.id);
        if (authDeleteErr) throw new Error(authDeleteErr.message);

        result = { deleted: true };
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
