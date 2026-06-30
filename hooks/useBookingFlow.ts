import { useCallback } from 'react';
import { router } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { useBookingStore } from '@/store/booking.store';
import { initiateBooking } from '@/lib/duffel';
import { supabase } from '@/lib/supabase';
import { useSearchStore } from '@/store/search.store';

export function useBookingFlow() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    selectedOffer,
    setConfirmed,
    setCreatingIntent, setConfirming, setError,
  } = useBookingStore();
  const { bagCount } = useSearchStore();

  const startPayment = useCallback(async () => {
    if (!selectedOffer) return;
    setCreatingIntent(true);
    setError(null);

    try {
      // Read fresh from store so any normalisation done just before this call is picked up
      const freshPassengers = useBookingStore.getState().passengers;

      // Build services array: seat selections + extra baggage services
      const { selectedSeats, selectedServices } = useBookingStore.getState();
      const seatServices = Object.values(selectedSeats).map(id => ({ id, quantity: 1 }));
      // Merge: baggage services first (may have quantity > 1), then seat services
      const mergedServices = [
        ...selectedServices,
        ...seatServices,
      ];

      const result = await initiateBooking({
        offerId:    selectedOffer.id,
        passengers: freshPassengers.map(p => ({
          savedTravelerId: p.savedTravelerId,
          givenName:       p.givenName,
          familyName:      p.familyName,
          dateOfBirth:     p.dateOfBirth,
          passportNumber:  p.passportNumber,
          passportCountry: p.passportCountry,
          passportExpiry:  p.passportExpiry,
          gender:          p.gender,
          email:           p.email,
          phone:           p.phone,
          dietary:         p.dietary || null,
        })),
        bagCount,
        services: mergedServices.length > 0 ? mergedServices : undefined,
      });

      // ── Sandbox: order created server-side, navigate directly ──────────
      if (result.mode === 'sandbox') {
        setConfirmed(result.orderId, result.pnr);
        setCreatingIntent(false);
        router.replace(`/booking/${result.orderId}?new=1`);
        return;
      }

      // ── Stripe: present payment sheet, then poll for webhook confirmation ──
      const { clientSecret, intentId } = result;

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName:       'Voya360',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails:     {},
      });
      if (initError) throw new Error(initError.message);

      setCreatingIntent(false);

      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') setError(payError.message);
        return;
      }

      // Payment succeeded — stripe-webhook will create the Duffel order and
      // write the bookings row. Poll until it appears (up to 60 seconds).
      setConfirming(true);
      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          const { data } = await supabase
            .from('bookings')
            .select('duffel_order_id, pnr')
            .eq('stripe_payment_intent_id', intentId)
            .maybeSingle();

          if (data) {
            clearInterval(pollInterval);
            setConfirmed(data.duffel_order_id, data.pnr ?? '');
            setConfirming(false);
            router.replace(`/booking/${data.duffel_order_id}?new=1`);
          } else if (polls >= 30) {
            clearInterval(pollInterval);
            setConfirming(false);
            setError(
              'Booking is taking longer than expected. ' +
              'You will receive a confirmation email once issued.',
            );
          }
        } catch {
          // Transient network error — keep polling.
        }
      }, 2000);
    } catch (err) {
      setCreatingIntent(false);
      setConfirming(false);
      setError(err instanceof Error ? err.message : 'Booking failed');
    }
  }, [selectedOffer, bagCount]); // selectedSeats/selectedServices read via getState() inside callback

  return { startPayment };
}
