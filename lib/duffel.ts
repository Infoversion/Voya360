import { supabase } from '@/lib/supabase';
import { DuffelOffer } from '@/types/duffel';
import { AirportOption } from '@/store/search.store';
import { CabinClass } from '@/types/booking';
import { searchAirports } from '@/constants/airports';

async function proxyCall<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('duffel-proxy', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.data as T;
}

// Local airport search — instant, no API call needed
export function suggestPlaces(query: string): AirportOption[] {
  return searchAirports(query);
}

export type DuffelPassengerType = 'adult' | 'child' | 'infant_without_seat';

export interface SearchParams {
  origin:        string;
  destination:   string;
  departureDate: string;
  returnDate?:   string;
  isRoundTrip?:  boolean;
  passengers:    Array<{ type: DuffelPassengerType }>;
  cabinClass:    CabinClass;
}

export interface SearchResult {
  offerRequestId: string;
  offers:         DuffelOffer[];
}

export async function searchFlights(params: SearchParams): Promise<SearchResult> {
  const result = await proxyCall<{
    id:     string;
    offers: DuffelOffer[];
  }>('offer_requests_create', {
    origin:        params.origin,
    destination:   params.destination,
    departureDate: params.departureDate,
    returnDate:    params.returnDate,
    isRoundTrip:   params.isRoundTrip,
    passengers:    params.passengers,
    cabinClass:    params.cabinClass,
  });

  return {
    offerRequestId: result.id,
    offers:         result.offers ?? [],
  };
}

export async function getOffer(offerId: string): Promise<DuffelOffer> {
  return proxyCall<DuffelOffer>('offer_get', { offerId });
}

export interface PaymentIntentParams {
  offerId:  string;
  amount:   string;
  currency: string;
}

export interface PaymentIntentResult {
  id:          string;
  clientToken: string;
  status:      string;
}

export async function createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
  return proxyCall<PaymentIntentResult>('payment_intent_create', params as unknown as Record<string, unknown>);
}

export interface OrderPassengerPayload {
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
}

export interface CreateOrderParams {
  offerId:         string;
  passengers:      OrderPassengerPayload[];
  paymentIntentId: string;
  amount:          string;
  currency:        string;
}

export interface OrderResult {
  id:                string;
  booking_reference: string;
}

export async function createOrder(params: CreateOrderParams): Promise<OrderResult> {
  return proxyCall<OrderResult>('order_create', params as unknown as Record<string, unknown>);
}
