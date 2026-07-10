import {
  getFlightIdentityKey, groupOffersByFlight, getFareBrandLabel, getAdvanceSeatSelection,
  getFareAttributes, getFareDifferences,
} from '@/engine/fare-groups';
import type { DuffelOffer } from '@/types/duffel';

function makeOffer(opts: {
  id?:                      string;
  totalAmount?:             number;
  flightNumber?:            string;
  departingAt?:             string;
  cabinClassMarketingName?: string | null;
  cabinClass?:              string;
  fareBrandName?:           string | null;
  advanceSeatSelection?:    boolean | null;
  checkedBags?:             number;
  carryOnBags?:             number;
  refundable?:              boolean;
  changeable?:              boolean;
  priorityBoarding?:        boolean | null;
  priorityCheckIn?:         boolean | null;
  wifiAvailable?:           boolean | null;
  powerAvailable?:          boolean | null;
} = {}): DuffelOffer {
  const {
    id                      = 'offer-1',
    totalAmount             = 400,
    flightNumber            = 'EK501',
    departingAt             = '2026-09-01T08:00:00',
    cabinClassMarketingName = null,
    cabinClass              = 'economy',
    fareBrandName           = null,
    advanceSeatSelection    = null,
    checkedBags             = 0,
    carryOnBags             = 0,
    refundable              = false,
    changeable              = false,
    priorityBoarding        = null,
    priorityCheckIn         = null,
    wifiAvailable           = null,
    powerAvailable          = null,
  } = opts;

  const baggages: Array<{ type: 'checked' | 'carry_on'; quantity: number }> = [];
  if (checkedBags > 0) baggages.push({ type: 'checked', quantity: checkedBags });
  if (carryOnBags > 0) baggages.push({ type: 'carry_on', quantity: carryOnBags });

  const segment = {
    id:           'seg-1',
    origin:       { iata_code: 'JFK', name: 'JFK', city_name: 'New York', time_zone: 'America/New_York' },
    destination:  { iata_code: 'DEL', name: 'DEL', city_name: 'Delhi',    time_zone: 'Asia/Kolkata' },
    departing_at: departingAt,
    arriving_at:  '2026-09-01T22:00:00',
    duration:     'PT14H',
    operating_carrier: { iata_code: 'EK', name: 'Emirates', logo_symbol_url: null, logo_lockup_url: null },
    marketing_carrier:  { iata_code: 'EK', name: 'Emirates', logo_symbol_url: null, logo_lockup_url: null },
    marketing_carrier_flight_number: flightNumber,
    passengers: [{
      passenger_id: 'pax-1',
      cabin_class:  cabinClass,
      baggages,
      cabin: {
        amenities: {
          wifi:  wifiAvailable  === null ? null : { available: wifiAvailable,  cost: null },
          power: powerAvailable === null ? null : { available: powerAvailable },
        },
      },
    }],
  };

  return {
    id,
    total_amount:   String(totalAmount),
    total_currency: 'USD',
    base_amount:    String(totalAmount),
    tax_amount:     '0.00',
    expires_at:     '2026-09-02T00:00:00',
    conditions: {
      change_before_departure: changeable ? { allowed: true, penalty_amount: null } : null,
      refund_before_departure: refundable ? { allowed: true, penalty_amount: null } : null,
    },
    slices: [{
      id:               'slice-1',
      origin:           segment.origin,
      destination:      segment.destination,
      duration:         'PT14H',
      fare_brand_name:  fareBrandName,
      conditions: {
        change_before_departure: null,
        priority_check_in:       priorityCheckIn,
        priority_boarding:       priorityBoarding,
        advance_seat_selection:  advanceSeatSelection,
      },
      segments: [segment],
    }],
    passengers: [{ id: 'pax-1', type: 'adult', cabin_class_marketing_name: cabinClassMarketingName }],
  } as DuffelOffer;
}

describe('getFlightIdentityKey', () => {
  it('matches for the same flight with different fare brands', () => {
    const basic = makeOffer({ id: 'a', cabinClassMarketingName: 'Economy Basic' });
    const flex  = makeOffer({ id: 'b', cabinClassMarketingName: 'Economy Flex', totalAmount: 500 });
    expect(getFlightIdentityKey(basic)).toBe(getFlightIdentityKey(flex));
  });

  it('differs for different flight numbers', () => {
    const a = makeOffer({ id: 'a', flightNumber: 'EK501' });
    const b = makeOffer({ id: 'b', flightNumber: 'EK502' });
    expect(getFlightIdentityKey(a)).not.toBe(getFlightIdentityKey(b));
  });

  it('differs for different departure times', () => {
    const a = makeOffer({ id: 'a', departingAt: '2026-09-01T08:00:00' });
    const b = makeOffer({ id: 'b', departingAt: '2026-09-01T20:00:00' });
    expect(getFlightIdentityKey(a)).not.toBe(getFlightIdentityKey(b));
  });
});

describe('groupOffersByFlight', () => {
  it('groups same-flight offers together, sorted cheapest-first within the group', () => {
    const flex  = makeOffer({ id: 'flex',  totalAmount: 500 });
    const basic = makeOffer({ id: 'basic', totalAmount: 400 });
    const other = makeOffer({ id: 'other', totalAmount: 300, flightNumber: 'EK999' });

    const groups = groupOffersByFlight([flex, basic, other]);

    expect(groups).toHaveLength(2);
    expect(groups[0].offers.map(o => o.id)).toEqual(['basic', 'flex']);
    expect(groups[1].offers.map(o => o.id)).toEqual(['other']);
  });

  it('preserves group position based on first-seen offer', () => {
    const sameFlightFirst = makeOffer({ id: 'first', totalAmount: 400, flightNumber: 'EK501' });
    const differentFlight = makeOffer({ id: 'mid',   totalAmount: 350, flightNumber: 'EK999' });
    const sameFlightLater = makeOffer({ id: 'later', totalAmount: 600, flightNumber: 'EK501' });

    const groups = groupOffersByFlight([sameFlightFirst, differentFlight, sameFlightLater]);

    expect(groups.map(g => g.offers.map(o => o.id))).toEqual([
      ['first', 'later'],
      ['mid'],
    ]);
  });
});

describe('getFareBrandLabel', () => {
  it('prefers the slice-level fare_brand_name over the passenger-level marketing name', () => {
    // Real Duffel data: cabin_class_marketing_name is often a generic bucket
    // ("Economy") shared by every tier, while slices[].fare_brand_name is the
    // airline's actual named fare ("Basic", "Economy", etc).
    const offer = makeOffer({ fareBrandName: 'Basic', cabinClassMarketingName: 'Economy' });
    expect(getFareBrandLabel(offer)).toBe('Basic');
  });

  it('falls back to the passenger-level marketing name when fare_brand_name is absent', () => {
    const offer = makeOffer({ fareBrandName: null, cabinClassMarketingName: 'Economy Flex' });
    expect(getFareBrandLabel(offer)).toBe('Economy Flex');
  });

  it('falls back to capitalized cabin class when both are absent', () => {
    const offer = makeOffer({ fareBrandName: null, cabinClassMarketingName: null, cabinClass: 'premium_economy' });
    expect(getFareBrandLabel(offer)).toBe('Premium Economy');
  });

  it('falls back to "Economy" for an unrecognized cabin class', () => {
    const offer = makeOffer({ fareBrandName: null, cabinClassMarketingName: null, cabinClass: 'something_unexpected' });
    expect(getFareBrandLabel(offer)).toBe('Economy');
  });

  it('distinguishes two same-cabin fare brands that only differ by fare_brand_name (the reported case)', () => {
    // Reproduces the exact Frontier Airlines pair: both offers report
    // cabin_class_marketing_name "Economy", but are genuinely different fares.
    const basic   = makeOffer({ id: 'basic', fareBrandName: 'Basic',   cabinClassMarketingName: 'Economy' });
    const economy = makeOffer({ id: 'econ',  fareBrandName: 'Economy', cabinClassMarketingName: 'Economy' });
    expect(getFareBrandLabel(basic)).toBe('Basic');
    expect(getFareBrandLabel(economy)).toBe('Economy');
    expect(getFareBrandLabel(basic)).not.toBe(getFareBrandLabel(economy));
  });
});

describe('getAdvanceSeatSelection', () => {
  it('returns true when the slice allows advance seat selection', () => {
    const offer = makeOffer({ advanceSeatSelection: true });
    expect(getAdvanceSeatSelection(offer)).toBe(true);
  });

  it('returns false when the slice does not allow advance seat selection', () => {
    const offer = makeOffer({ advanceSeatSelection: false });
    expect(getAdvanceSeatSelection(offer)).toBe(false);
  });

  it('defaults to false when not specified', () => {
    const offer = makeOffer({ advanceSeatSelection: null });
    expect(getAdvanceSeatSelection(offer)).toBe(false);
  });
});

describe('getFareAttributes', () => {
  it('reads every comparable attribute off an offer', () => {
    const offer = makeOffer({
      checkedBags: 1, carryOnBags: 1, refundable: true, changeable: false,
      advanceSeatSelection: true, priorityBoarding: true, priorityCheckIn: false,
      wifiAvailable: true, powerAvailable: false,
    });
    const attrs = getFareAttributes(offer);
    expect(attrs.bags).toBe(1);
    expect(attrs.carryOn).toBe(1);
    expect(attrs.flexShort).toBe('REF');
    expect(attrs.seatSelection).toBe(true);
    expect(attrs.priorityBoarding).toBe(true);
    expect(attrs.priorityCheckIn).toBe(false);
    expect(attrs.wifiAvailable).toBe(true);
    expect(attrs.powerAvailable).toBe(false);
  });

  it('reports null for amenities the airline did not specify', () => {
    const offer = makeOffer({ priorityBoarding: null, priorityCheckIn: null, wifiAvailable: null, powerAvailable: null });
    const attrs = getFareAttributes(offer);
    expect(attrs.priorityBoarding).toBeNull();
    expect(attrs.priorityCheckIn).toBeNull();
    expect(attrs.wifiAvailable).toBeNull();
    expect(attrs.powerAvailable).toBeNull();
  });
});

describe('getFareDifferences', () => {
  it('flags only the fields that actually differ across the group', () => {
    // Reproduces the reported case: bags, flexibility, and seat selection are
    // all identical — only fare_brand_name (not compared here) differs.
    const a = makeOffer({ id: 'a', checkedBags: 0, refundable: false, changeable: false, advanceSeatSelection: false });
    const b = makeOffer({ id: 'b', checkedBags: 0, refundable: false, changeable: false, advanceSeatSelection: false });

    const diff = getFareDifferences([a, b]);

    expect(diff.bags).toBe(false);
    expect(diff.carryOn).toBe(false);
    expect(diff.flexibility).toBe(false);
    expect(diff.seatSelection).toBe(false);
    expect(diff.priorityBoarding).toBe(false);
    expect(diff.priorityCheckIn).toBe(false);
    expect(diff.wifi).toBe(false);
    expect(diff.power).toBe(false);
    expect(diff.anyDifference).toBe(false);
  });

  it('flags bags as differing when checked-bag counts differ', () => {
    const a = makeOffer({ id: 'a', checkedBags: 0 });
    const b = makeOffer({ id: 'b', checkedBags: 1 });
    const diff = getFareDifferences([a, b]);
    expect(diff.bags).toBe(true);
    expect(diff.anyDifference).toBe(true);
  });

  it('flags flexibility as differing when refund/change status differs', () => {
    const a = makeOffer({ id: 'a', refundable: false, changeable: false });
    const b = makeOffer({ id: 'b', refundable: true,  changeable: true });
    const diff = getFareDifferences([a, b]);
    expect(diff.flexibility).toBe(true);
    expect(diff.bags).toBe(false);
  });

  it('flags seat selection as differing (the Frontier Basic/Economy case)', () => {
    const basic   = makeOffer({ id: 'basic', fareBrandName: 'Basic',   advanceSeatSelection: false });
    const economy = makeOffer({ id: 'econ',  fareBrandName: 'Economy', advanceSeatSelection: true });
    const diff = getFareDifferences([basic, economy]);
    expect(diff.seatSelection).toBe(true);
    expect(diff.anyDifference).toBe(true);
  });

  it('flags wifi and power as differing when amenity availability differs', () => {
    const a = makeOffer({ id: 'a', wifiAvailable: false, powerAvailable: false });
    const b = makeOffer({ id: 'b', wifiAvailable: true,  powerAvailable: true });
    const diff = getFareDifferences([a, b]);
    expect(diff.wifi).toBe(true);
    expect(diff.power).toBe(true);
  });

  it('treats a group of one as having no differences', () => {
    const solo = makeOffer({ id: 'solo' });
    const diff = getFareDifferences([solo]);
    expect(diff.anyDifference).toBe(false);
  });
});
