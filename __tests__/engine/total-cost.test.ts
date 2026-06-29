import { calculateCost, shouldFlipSort, sortByTotalCost, formatDuration } from '@/engine/total-cost';
import type { DuffelOffer } from '@/types/duffel';

function makeOffer(baseFare: number, checkedBags: number, id = 'offer'): DuffelOffer {
  return {
    id,
    total_amount: String(baseFare),
    base_amount:  String(baseFare),
    tax_amount:   '0',
    total_currency: 'USD',
    slices: [{
      id: 's1', origin: {} as any, destination: {} as any,
      duration: 'PT10H', segments: [{
        id: 'seg1',
        passengers: [{
          id: 'p1', cabin_class: 'economy',
          baggages: checkedBags > 0
            ? [{ type: 'checked', quantity: checkedBags }]
            : [],
        }],
        marketing_carrier: { iata_code: 'EK', name: 'Emirates' } as any,
        operating_carrier:  { iata_code: 'EK', name: 'Emirates' } as any,
        origin:      { iata_code: 'JFK', name: 'JFK', city_name: 'New York' } as any,
        destination: { iata_code: 'DEL', name: 'DEL', city_name: 'Delhi' } as any,
        departing_at: '2026-09-01T10:00:00Z',
        arriving_at:  '2026-09-02T08:00:00Z',
        duration: 'PT22H',
        flight_number: 'EK201',
      }],
    }],
    passengers: [],
    conditions: {},
    expires_at: null,
    live_mode: false,
  } as unknown as DuffelOffer;
}

describe('calculateCost', () => {
  it('adds service fee to base fare', () => {
    const result = calculateCost(makeOffer(800, 1), 1);
    expect(result.total).toBe(800 + 9.99);
    expect(result.serviceFee).toBe(9.99);
  });

  it('charges $65 per bag beyond what is included', () => {
    const result = calculateCost(makeOffer(800, 1), 3); // 1 included, need 3 → 2 extra
    expect(result.baggageFee).toBe(130);
    expect(result.total).toBe(800 + 9.99 + 130);
  });

  it('charges nothing when bags needed ≤ bags included', () => {
    const result = calculateCost(makeOffer(800, 2), 1);
    expect(result.baggageFee).toBe(0);
  });

  it('defaults to 2 bags when bagCount not provided', () => {
    const result = calculateCost(makeOffer(800, 0));
    expect(result.baggageFee).toBe(130); // 2 bags × $65
  });
});

describe('shouldFlipSort', () => {
  it('returns true when expensive offer has more bags and is within $80', () => {
    const cheap     = makeOffer(700, 0); // no bags
    const expensive = makeOffer(750, 1); // 1 bag included
    expect(shouldFlipSort(cheap, expensive, 2)).toBe(true);
  });

  it('returns false when price diff exceeds $80', () => {
    const cheap     = makeOffer(700, 0);
    const expensive = makeOffer(790, 1);
    expect(shouldFlipSort(cheap, expensive, 2)).toBe(false);
  });

  it('returns false when both offers have same bags included', () => {
    const a = makeOffer(700, 1);
    const b = makeOffer(750, 1);
    expect(shouldFlipSort(a, b, 2)).toBe(false);
  });
});

describe('sortByTotalCost', () => {
  it('sorts by total cost including bags', () => {
    const expensive_with_bags = makeOffer(750, 2, 'a'); // total = 750+9.99
    const cheap_no_bags       = makeOffer(700, 0, 'b'); // total = 700+9.99+130
    const sorted = sortByTotalCost([cheap_no_bags, expensive_with_bags], 2);
    expect(sorted[0].id).toBe('a'); // cheaper overall after bags
  });

  it('flips adjacent pair when expensive offer has free bags and is within $80', () => {
    const cheap     = makeOffer(700, 0, 'cheap');
    const expensive = makeOffer(750, 1, 'expensive'); // $50 more but saves $65 on 1 bag
    const sorted = sortByTotalCost([cheap, expensive], 2);
    expect(sorted[0].id).toBe('expensive');
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration('PT14H30M')).toBe('14h 30m');
  });

  it('omits minutes when zero', () => {
    expect(formatDuration('PT10H')).toBe('10h');
  });

  it('handles hours-only ISO duration', () => {
    expect(formatDuration('PT2H')).toBe('2h');
  });
});
