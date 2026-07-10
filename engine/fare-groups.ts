import { DuffelOffer } from '@/types/duffel';
import { getIncludedCheckedBags, getIncludedCarryOnBags, getFareType } from './total-cost';

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
 * Airline's actual named fare tier. Prefers slices[0].fare_brand_name —
 * the authoritative field for this (confirmed against real Duffel data:
 * a Frontier "Basic" vs "Economy" fare pair both reported the SAME
 * generic passengers[].cabin_class_marketing_name ("Economy"), making
 * that field useless for telling them apart). Falls back to the
 * passenger-level marketing name, then to the cabin class capitalized
 * ("Economy", "Premium Economy", "Business", "First").
 * Kept short and stable so it never overflows a chip — other real
 * differentiators (bags, fare flexibility, seat selection) are shown as
 * icons on the chip itself (see FareChipRow in FlightCard.tsx), not
 * appended here.
 */
export function getFareBrandLabel(offer: DuffelOffer): string {
  const sliceBrand = offer.slices[0]?.fare_brand_name;
  if (sliceBrand) return sliceBrand;
  const marketingName = offer.passengers[0]?.cabin_class_marketing_name;
  if (marketingName) return marketingName;
  const cabinClass = offer.slices[0]?.segments[0]?.passengers[0]?.cabin_class;
  return CABIN_LABELS[cabinClass ?? ''] ?? 'Economy';
}

/**
 * Whether this fare lets you pick your seat in advance (vs. an
 * airline-assigned seat at check-in) — a real Duffel-exposed condition
 * that can differ between same-cabin fare brands even when refund/change
 * flexibility and included bags are identical.
 */
export function getAdvanceSeatSelection(offer: DuffelOffer): boolean {
  return offer.slices[0]?.conditions?.advance_seat_selection ?? false;
}

export interface FareAttributes {
  bags:             number;
  carryOn:          number;
  flexShort:        string; // FLEX | CHG | REF | NON-REF, from getFareType
  seatSelection:    boolean;
  priorityBoarding: boolean | null;
  priorityCheckIn:  boolean | null;
  wifiAvailable:    boolean | null;
  powerAvailable:   boolean | null;
}

/**
 * Every attribute of an offer that could plausibly explain a price
 * difference between two fare brands of the same flight. Used by
 * getFareDifferences to find which of these actually vary within a
 * fare group, instead of guessing at a fixed set to display.
 */
export function getFareAttributes(offer: DuffelOffer): FareAttributes {
  const sliceConditions = offer.slices[0]?.conditions;
  const amenities       = offer.slices[0]?.segments[0]?.passengers[0]?.cabin?.amenities;

  return {
    bags:             getIncludedCheckedBags(offer),
    carryOn:          getIncludedCarryOnBags(offer),
    flexShort:        getFareType(offer).short,
    seatSelection:    getAdvanceSeatSelection(offer),
    priorityBoarding: sliceConditions?.priority_boarding ?? null,
    priorityCheckIn:  sliceConditions?.priority_check_in ?? null,
    wifiAvailable:    amenities?.wifi?.available  ?? null,
    powerAvailable:   amenities?.power?.available ?? null,
  };
}

export interface FareDifferences {
  bags:             boolean;
  carryOn:          boolean;
  flexibility:      boolean;
  seatSelection:    boolean;
  priorityBoarding: boolean;
  priorityCheckIn:  boolean;
  wifi:             boolean;
  power:            boolean;
  anyDifference:    boolean;
}

/**
 * Compares every offer in a fare group across every attribute
 * getFareAttributes reads, and reports which ones actually vary. A field
 * is only "different" if at least two offers in the group disagree on
 * it — a group of one, or a group where every offer happens to match on
 * a field, reports false for that field. If every field matches across
 * the whole group, anyDifference is false: the UI should say so plainly
 * rather than implying a benefit that isn't there.
 */
export function getFareDifferences(group: DuffelOffer[]): FareDifferences {
  const attrs = group.map(getFareAttributes);

  const differs = (values: Array<string | number | boolean | null>): boolean =>
    new Set(values).size > 1;

  const bags             = differs(attrs.map(a => a.bags));
  const carryOn          = differs(attrs.map(a => a.carryOn));
  const flexibility      = differs(attrs.map(a => a.flexShort));
  const seatSelection    = differs(attrs.map(a => a.seatSelection));
  const priorityBoarding = differs(attrs.map(a => a.priorityBoarding));
  const priorityCheckIn  = differs(attrs.map(a => a.priorityCheckIn));
  const wifi             = differs(attrs.map(a => a.wifiAvailable));
  const power             = differs(attrs.map(a => a.powerAvailable));

  return {
    bags, carryOn, flexibility, seatSelection, priorityBoarding, priorityCheckIn, wifi, power,
    anyDifference: bags || carryOn || flexibility || seatSelection || priorityBoarding || priorityCheckIn || wifi || power,
  };
}
