import { getFlightIdentityKey, groupOffersByFlight, getFareBrandLabel, getAdvanceSeatSelection } from '@/engine/fare-groups';
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
  } = opts;

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
    passengers: [{ passenger_id: 'pax-1', cabin_class: cabinClass, baggages: [] }],
  };

  return {
    id,
    total_amount:   String(totalAmount),
    total_currency: 'USD',
    base_amount:    String(totalAmount),
    tax_amount:     '0.00',
    expires_at:     '2026-09-02T00:00:00',
    conditions:     { change_before_departure: null, refund_before_departure: null },
    slices: [{
      id:               'slice-1',
      origin:           segment.origin,
      destination:      segment.destination,
      duration:         'PT14H',
      fare_brand_name:  fareBrandName,
      conditions: {
        change_before_departure: null,
        priority_check_in:       null,
        priority_boarding:       null,
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
