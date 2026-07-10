import { getFlightIdentityKey, groupOffersByFlight, getFareBrandLabel } from '@/engine/fare-groups';
import type { DuffelOffer } from '@/types/duffel';

function makeOffer(opts: {
  id?:                      string;
  totalAmount?:             number;
  flightNumber?:            string;
  departingAt?:             string;
  cabinClassMarketingName?: string | null;
  cabinClass?:              string;
  checkedBags?:             number;
  refundable?:              boolean;
  changeable?:              boolean;
} = {}): DuffelOffer {
  const {
    id                      = 'offer-1',
    totalAmount             = 400,
    flightNumber            = 'EK501',
    departingAt             = '2026-09-01T08:00:00',
    cabinClassMarketingName = null,
    cabinClass              = 'economy',
    checkedBags             = 0,
    refundable              = false,
    changeable              = false,
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
    passengers: [{
      passenger_id: 'pax-1',
      cabin_class:  cabinClass,
      baggages:     checkedBags > 0 ? [{ type: 'checked' as const, quantity: checkedBags }] : [],
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
      id:          'slice-1',
      origin:      segment.origin,
      destination: segment.destination,
      duration:    'PT14H',
      segments:    [segment],
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
  it('returns the Duffel-provided marketing name when present', () => {
    const offer = makeOffer({ cabinClassMarketingName: 'Economy Flex' });
    expect(getFareBrandLabel(offer)).toBe('Economy Flex');
  });

  it('falls back to cabin class + bag count + fare flexibility when marketing name is absent', () => {
    const offer = makeOffer({ cabinClassMarketingName: null, cabinClass: 'premium_economy', checkedBags: 0 });
    expect(getFareBrandLabel(offer)).toBe('Premium Economy · 0 bags · NON-REF');
  });

  it('uses singular "bag" for exactly one included bag', () => {
    const offer = makeOffer({ cabinClassMarketingName: null, checkedBags: 1 });
    expect(getFareBrandLabel(offer)).toBe('Economy · 1 bag · NON-REF');
  });

  it('uses plural "bags" for more than one included bag', () => {
    const offer = makeOffer({ cabinClassMarketingName: null, checkedBags: 2 });
    expect(getFareBrandLabel(offer)).toBe('Economy · 2 bags · NON-REF');
  });

  it('appends the fare-flexibility short code (FLEX/CHG/REF/NON-REF)', () => {
    const flex = makeOffer({ cabinClassMarketingName: null, refundable: true, changeable: true });
    const chg  = makeOffer({ cabinClassMarketingName: null, refundable: false, changeable: true });
    const ref  = makeOffer({ cabinClassMarketingName: null, refundable: true, changeable: false });
    expect(getFareBrandLabel(flex)).toBe('Economy · 0 bags · FLEX');
    expect(getFareBrandLabel(chg)).toBe('Economy · 0 bags · CHG');
    expect(getFareBrandLabel(ref)).toBe('Economy · 0 bags · REF');
  });

  it('differentiates two same-cabin fallback offers with different bag counts', () => {
    const basic = makeOffer({ id: 'basic', cabinClassMarketingName: null, checkedBags: 0, totalAmount: 287 });
    const flex  = makeOffer({ id: 'flex',  cabinClassMarketingName: null, checkedBags: 1, totalAmount: 462 });
    expect(getFareBrandLabel(basic)).not.toBe(getFareBrandLabel(flex));
  });

  it('differentiates two same-cabin same-bag fallback offers by fare flexibility (the reported ambiguous case)', () => {
    // Same cabin, same 0 included bags, different price ($287 vs $462) — the only
    // real difference Duffel exposes is refund/change flexibility.
    const basic = makeOffer({ id: 'basic', cabinClassMarketingName: null, checkedBags: 0, totalAmount: 287, refundable: false, changeable: false });
    const flex  = makeOffer({ id: 'flex',  cabinClassMarketingName: null, checkedBags: 0, totalAmount: 462, refundable: true,  changeable: true });
    expect(getFareBrandLabel(basic)).not.toBe(getFareBrandLabel(flex));
    expect(getFareBrandLabel(basic)).toBe('Economy · 0 bags · NON-REF');
    expect(getFareBrandLabel(flex)).toBe('Economy · 0 bags · FLEX');
  });

  it('does not append bag count or fare flexibility when a real marketing name is present', () => {
    const offer = makeOffer({ cabinClassMarketingName: 'Economy Flex', checkedBags: 2, refundable: true, changeable: true });
    expect(getFareBrandLabel(offer)).toBe('Economy Flex');
  });
});
