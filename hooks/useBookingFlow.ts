import { useCallback } from 'react';
import { router } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { useBookingStore } from '@/store/booking.store';
import { createPaymentIntent, createOrder } from '@/lib/duffel';
import { supabase } from '@/lib/supabase';
import { SERVICE_FEE_USD } from '@/types/booking';
import { calculateCost } from '@/engine/total-cost';
import { useSearchStore } from '@/store/search.store';

export function useBookingFlow() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    selectedOffer, passengers,
    setPaymentIntent, setConfirmed,
    setCreatingIntent, setConfirming, setError,
  } = useBookingStore();
  const { bagCount } = useSearchStore();

  const startPayment = useCallback(async () => {
    if (!selectedOffer) return;
    setCreatingIntent(true);
    setError(null);

    try {
      const cost = calculateCost(selectedOffer, bagCount);

      const intent = await createPaymentIntent({
        offerId:  selectedOffer.id,
        amount:   cost.total.toFixed(2),
        currency: selectedOffer.total_currency,
      });

      setPaymentIntent(intent.id, intent.clientToken);

      // Sandbox mode: Edge Function returns status='sandbox' when Duffel Payments
      // isn't enabled yet. Skip Stripe and go straight to order creation.
      const isSandbox = intent.status === 'sandbox';

      if (!isSandbox) {
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName:       'Voya360',
          paymentIntentClientSecret: intent.clientToken,
          defaultBillingDetails:     {},
        });
        if (initError) throw new Error(initError.message);

        setCreatingIntent(false);

        const { error: payError } = await presentPaymentSheet();
        if (payError) {
          if (payError.code !== 'Canceled') setError(payError.message);
          return;
        }
      } else {
        setCreatingIntent(false);
      }

      setConfirming(true);
      const order = await createOrder({
        offerId:         selectedOffer.id,
        passengers,
        paymentIntentId: intent.id,
        amount:          cost.total.toFixed(2),
        currency:        selectedOffer.total_currency,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const slice = selectedOffer.slices[0];
        const seg   = slice.segments[0];
        const last  = slice.segments[slice.segments.length - 1];

        await supabase.from('bookings').insert({
          user_id:         user.id,
          duffel_order_id: order.id,
          pnr:             order.booking_reference,
          status:          'confirmed',
          origin:          slice.origin.iata_code,
          destination:     slice.destination.iata_code,
          departure_at:    seg.departing_at,
          arrival_at:      last.arriving_at,
          airline:         seg.marketing_carrier.iata_code,
          cabin_class:     selectedOffer.passengers[0]?.type ?? 'economy',
          passenger_count: passengers.length,
          base_fare_usd:   parseFloat(selectedOffer.total_amount),
          service_fee_usd: SERVICE_FEE_USD,
          baggage_fee_usd: calculateCost(selectedOffer, bagCount).baggageFee,
          total_usd:       calculateCost(selectedOffer, bagCount).total,
        });
      }

      setConfirmed(order.id, order.booking_reference);
      setConfirming(false);
      router.replace(`/booking/${order.id}`);
    } catch (err) {
      setCreatingIntent(false);
      setConfirming(false);
      setError(err instanceof Error ? err.message : 'Booking failed');
    }
  }, [selectedOffer, passengers, bagCount]);

  return { startPayment };
}
