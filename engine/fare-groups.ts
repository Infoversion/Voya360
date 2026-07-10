import { DuffelOffer } from '@/types/duffel';
import { getIncludedCheckedBags, getFareType } from './total-cost';

export interface FareGroup {
  key:    string;
  offers: DuffelOffer[]; // sorted cheapest-first (by total_amount)
}

const CABIN_LABELS: Record<string, string> = {
  economy:         'Economy',
  premium_economy: 'Premium Economy',
  business:        'Business',
  first:           'First',
};

/**
 * Same physical flight(s) regardless of fare brand: chains every segment's
 * carrier + flight number + departure time across all slices, in order.
 */
export function getFlightIdentityKey(offer: DuffelOffer): string {
  return offer.slices
    .map(slice =>
      slice.segments
        .map(seg => `${seg.marketing_carrier.iata_code}-${seg.marketing_carrier_flight_number}-${seg.departing_at}`)
        .join('>'),
    )
    .join('||');
}

/**
 * Groups offers sharing a flight identity key. A group's position in the
 * output equals the position of the first offer in that group as it
 * appeared in the input — this must be an already-sorted/filtered list.
 * Offers within a group are sorted by total_amount ascending.
 */
export function groupOffersByFlight(offers: DuffelOffer[]): FareGroup[] {
  const groups: FareGroup[]        = [];
  const indexByKey = new Map<string, number>();

  for (const offer of offers) {
    const key = getFlightIdentityKey(offer);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({ key, offers: [offer] });
    } else {
      groups[existingIndex].offers.push(offer);
    }
  }

  for (const group of groups) {
    group.offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
  }

  return groups;
}

/**
 * Airline's marketed brand name if Duffel provides one, else the cabin
 * class capitalized ("Economy", "Premium Economy", "Business", "First")
 * plus the included checked-bag count and fare-flexibility short code
 * (FLEX/CHG/REF/NON-REF from getFareType). Same-cabin fallback offers
 * within a fare group are otherwise indistinguishable by label alone —
 * bag count and flexibility are the two traits that actually explain a
 * price difference when Duffel gives no brand name.
 */
export function getFareBrandLabel(offer: DuffelOffer): string {
  const marketingName = offer.passengers[0]?.cabin_class_marketing_name;
  if (marketingName) return marketingName;
  const cabinClass = offer.slices[0]?.segments[0]?.passengers[0]?.cabin_class;
  const cabinLabel = CABIN_LABELS[cabinClass ?? ''] ?? 'Economy';
  const bags  = getIncludedCheckedBags(offer);
  const flex  = getFareType(offer).short;
  return `${cabinLabel} · ${bags} bag${bags === 1 ? '' : 's'} · ${flex}`;
}
