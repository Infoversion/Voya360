import { supabase } from '@/lib/supabase';
import { DuffelOffer } from '@/types/duffel';
import { AirportOption } from '@/store/search.store';
import { CabinClass } from '@/types/booking';
import { searchAirports } from '@/constants/airports';

async function proxyCall<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('duffel-proxy', {
    body: { action, ...payload },
  });
  if (error) {
    // Extract the actual error message from the function response body
    const body = await (error as any).context?.json?.().catch?.(() => null);
    throw new Error(body?.error ?? error.message);
  }
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

export interface InitiateBookingParams {
  offerId:    string;
  passengers: OrderPassengerPayload[];
  bagCount:   number;
  services?:  Array<{ id: string; quantity: number }>;
}

export type InitiateBookingResult =
  | { mode: 'stripe';   clientSecret: string; intentId: string }
  | { mode: 'sandbox';  orderId: string; pnr: string };

export async function initiateBooking(params: InitiateBookingParams): Promise<InitiateBookingResult> {
  return proxyCall<InitiateBookingResult>('booking_initiate', params as unknown as Record<string, unknown>);
}

export interface DuffelSegment {
  departing_at:                    string;
  arriving_at:                     string;
  origin_terminal:                 string | null;
  destination_terminal:            string | null;
  marketing_carrier?:              { iata_code: string; name?: string };
  operating_carrier?:              { iata_code: string; name?: string };
  marketing_carrier_flight_number?: string;
  flight_number?:                   string;
}

export interface DuffelSlice {
  id:           string;
  origin:       { iata_code: string; name: string };
  destination:  { iata_code: string; name: string };
  departing_at: string | null;
  segments:     DuffelSegment[];
}

export interface DuffelOrderDetail {
  id:                string;
  booking_reference: string;
  slices:            DuffelSlice[];
  passengers:        Array<{ id: string; type: string; given_name: string; family_name: string }>;
  documents?:        Array<{ type: string; unique_identifier: string }>;
}

export async function getDuffelOrder(duffelOrderId: string): Promise<DuffelOrderDetail> {
  return proxyCall<DuffelOrderDetail>('order_get', { duffelOrderId });
}

export interface OrderChangePreview {
  changeOfferId: string;
  refundAmount:  string;
  penaltyAmount: string;
  currency:      string;
}

export async function previewOrderChange(
  duffelOrderId:  string,
  removeSliceIds: string[],
): Promise<OrderChangePreview> {
  return proxyCall<OrderChangePreview>('order_change_preview', { duffelOrderId, removeSliceIds });
}

export async function confirmOrderChange(
  changeOfferId: string,
  duffelOrderId: string,
  newStatus:     string,
): Promise<void> {
  await proxyCall<{ changed: boolean }>('order_change_confirm', { changeOfferId, duffelOrderId, newStatus });
}

export interface CancellationPreview {
  cancellationId: string;
  refundAmount:   string;
  refundCurrency: string;
  refundTo:       string;
  expiresAt:      string | null;
}

export async function previewCancellation(duffelOrderId: string): Promise<CancellationPreview> {
  return proxyCall<CancellationPreview>('order_cancel_preview', { duffelOrderId });
}

export async function confirmCancellation(cancellationId: string, duffelOrderId: string): Promise<void> {
  await proxyCall<{ cancelled: boolean }>('order_cancel_confirm', { cancellationId, duffelOrderId });
}

export async function deleteAccount(): Promise<void> {
  await proxyCall<{ deleted: boolean }>('delete_account', {});
}

// ── Seat maps ─────────────────────────────────────────────────────────────────

export interface SeatService {
  id:             string;
  passenger_id:   string;
  total_amount:   string;
  total_currency: string;
}

export interface SeatElement {
  type:                'seat' | 'empty' | 'bassinet' | 'lavatory' | 'galley' | 'closet' | 'stairs';
  designator?:         string;
  disclosures?:        string[];
  available_services?: SeatService[];
  exits?:              boolean;
}

export interface SeatMapRow {
  sections: Array<{ elements: SeatElement[] }>;
}

export interface SeatMapCabin {
  cabin_class: string;
  rows:        SeatMapRow[];
  aisles:      number[];
  wings:       { first_row_index: number; last_row_index: number } | null;
}

export interface SeatMap {
  id:         string;
  segment_id: string;
  slice_id:   string;
  cabins:     SeatMapCabin[];
}

export async function getSeatMaps(offerId: string): Promise<SeatMap[]> {
  return proxyCall<SeatMap[]>('seat_map_get', { offerId });
}

// ── Available services (extra bags, upgrades) ─────────────────────────────────

export interface BaggageService {
  id:               string;
  type:             'baggage';
  maximum_quantity: number;
  metadata: {
    type:              'checked' | 'carry_on';
    maximum_weight_kg: number | null;
  };
  passenger_ids:  string[];
  segment_ids:    string[];
  total_amount:   string;
  total_currency: string;
}

export async function getAvailableServices(offerId: string): Promise<BaggageService[]> {
  return proxyCall<BaggageService[]>('available_services_get', { offerId });
}
