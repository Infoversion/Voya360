import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlightCard } from '@/components/results/FlightCard';
import type { DuffelOffer } from '@/types/duffel';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// ── Fixture builder ──────────────────────────────────────────────────────────

function makeOffer(opts: {
  id?:            string;
  baseFare?:      string;
  includedBags?:  number;
  stops?:         number;
  isRoundTrip?:   boolean;
} = {}): DuffelOffer {
  const {
    id           = 'offer-1',
    baseFare     = '400.00',
    includedBags = 1,
    stops        = 0,
    isRoundTrip  = false,
  } = opts;

  const makeSeg = (orig: string, dest: string, flight: string) => ({
    id:                 `seg-${flight}`,
    origin:             { iata_code: orig, name: orig, city_name: 'City', time_zone: 'UTC' },
    destination:        { iata_code: dest, name: dest, city_name: 'City', time_zone: 'UTC' },
    departing_at:       '2026-09-01T08:00:00',
    arriving_at:        '2026-09-01T22:00:00',
    duration:           'PT14H',
    operating_carrier:  { iata_code: 'EK', name: 'Emirates', logo_symbol_url: null, logo_lockup_url: null },
    marketing_carrier:  { iata_code: 'EK', name: 'Emirates', logo_symbol_url: null, logo_lockup_url: null },
    marketing_carrier_flight_number: flight,
    passengers:         [{
      passenger_id: 'pax-1',
      cabin_class:  'economy',
      baggages:     [
        { type: 'checked' as const, quantity: includedBags },
        { type: 'carry_on' as const, quantity: 1 },
      ],
    }],
  });

  const segments = stops === 0
    ? [makeSeg('JFK', 'DEL', 'EK501')]
    : [makeSeg('JFK', 'DXB', 'EK501'), makeSeg('DXB', 'DEL', 'EK511')];

  const outbound = {
    id:          'slice-out',
    origin:      { iata_code: 'JFK', name: 'JFK', city_name: 'New York', time_zone: 'America/New_York' },
    destination: { iata_code: 'DEL', name: 'DEL', city_name: 'Delhi',    time_zone: 'Asia/Kolkata' },
    duration:    'PT14H',
    segments,
  };

  const returnSlice = {
    id:          'slice-ret',
    origin:      outbound.destination,
    destination: outbound.origin,
    duration:    'PT14H',
    segments:    [makeSeg('DEL', 'JFK', 'EK502')],
  };

  return {
    id,
    total_amount:   baseFare,
    total_currency: 'USD',
    base_amount:    baseFare,
    tax_amount:     '0.00',
    expires_at:     '2026-09-02T00:00:00',
    conditions:     { change_before_departure: null, refund_before_departure: null },
    slices:         isRoundTrip ? [outbound, returnSlice] : [outbound],
    passengers:     [{ id: 'pax-1', type: 'adult' }],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FlightCard', () => {
  beforeEach(() => jest.clearAllMocks());

  // Price display

  it('shows total-you-pay price including service fee', async () => {
    // base $400 + $9.99 service fee + $0 bags (1 included, bagCount=1) = $409.99 → $410
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ baseFare: '400.00', includedBags: 1 })} bagCount={1} />,
    );
    expect(getByText('$410')).toBeTruthy();
  });

  it('adds baggage fee when extra bags needed', async () => {
    // base $400 + $9.99 + $65 (1 extra bag: 2 needed, 1 included) = $474.99 → $475
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ baseFare: '400.00', includedBags: 1 })} bagCount={2} />,
    );
    expect(getByText('$475')).toBeTruthy();
    expect(getByText(/incl. ~\$65 bags/)).toBeTruthy();
  });

  it('shows no bag fee line when enough bags included', async () => {
    const { queryByText } = await render(
      <FlightCard offer={makeOffer({ includedBags: 2 })} bagCount={2} />,
    );
    expect(queryByText(/incl. ~\$/)).toBeNull();
  });

  // Badges

  it('renders no badges by default', async () => {
    const { queryByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} />,
    );
    expect(queryByText('Cheapest')).toBeNull();
    expect(queryByText('Fastest')).toBeNull();
    expect(queryByText("Voya's pick")).toBeNull();
    expect(queryByText('Your airline')).toBeNull();
  });

  it('renders Cheapest badge when isCheapest', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} isCheapest />,
    );
    expect(getByText('Cheapest')).toBeTruthy();
  });

  it('renders Fastest badge when isFastest', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} isFastest />,
    );
    expect(getByText('Fastest')).toBeTruthy();
  });

  it("renders Voya's pick badge when isVoyaPick", async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} isVoyaPick />,
    );
    expect(getByText("Voya's pick")).toBeTruthy();
  });

  it('renders Your airline badge when isPreferredAirline', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} isPreferredAirline />,
    );
    expect(getByText('Your airline')).toBeTruthy();
  });

  // Trend arrow

  it('shows trend arrow for up trend', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} trend="up" />,
    );
    expect(getByText(/rising/i)).toBeTruthy();
  });

  it('hides trend arrow for stable trend', async () => {
    const { queryByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} trend="stable" />,
    );
    expect(queryByText(/rising|falling/i)).toBeNull();
  });

  // Stop display

  it('shows Nonstop for a direct flight', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ stops: 0 })} bagCount={2} />,
    );
    expect(getByText('Nonstop')).toBeTruthy();
  });

  it('shows stop count for a connecting flight', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ stops: 1 })} bagCount={2} />,
    );
    expect(getByText('1 stop')).toBeTruthy();
  });

  // Avoided airport

  it('shows avoided airport warning when route contains an avoided airport', async () => {
    // The offer goes JFK → DXB → DEL; DXB is on avoid list
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ stops: 1 })} bagCount={2} avoidedAirports={['DXB']} />,
    );
    expect(getByText(/Avoid-list airport/)).toBeTruthy();
  });

  it('does not show warning when avoided airports do not appear in route', async () => {
    const { queryByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} avoidedAirports={['CDG']} />,
    );
    expect(queryByText(/Avoid-list airport/)).toBeNull();
  });

  // Interaction

  it('calls custom onPress when provided', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <FlightCard offer={makeOffer()} bagCount={2} onPress={onPress} />,
    );
    // Press propagates from any child text up to the outer TouchableOpacity.
    fireEvent.press(getByText('Total you pay · incl. all taxes'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('navigates to offer detail when no onPress provided', async () => {
    const { router } = require('expo-router');
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ id: 'offer-abc' })} bagCount={2} />,
    );
    fireEvent.press(getByText('Total you pay · incl. all taxes'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/flight/[offerId]',
      params:   { offerId: 'offer-abc' },
    });
  });

  // Round-trip

  it('shows OUTBOUND and RETURN labels for round-trip offer', async () => {
    const { getByText } = await render(
      <FlightCard offer={makeOffer({ isRoundTrip: true })} bagCount={2} />,
    );
    expect(getByText('OUTBOUND')).toBeTruthy();
    expect(getByText('RETURN')).toBeTruthy();
  });

  it('hides round-trip labels for one-way offer', async () => {
    const { queryByText } = await render(
      <FlightCard offer={makeOffer({ isRoundTrip: false })} bagCount={2} />,
    );
    expect(queryByText('OUTBOUND')).toBeNull();
    expect(queryByText('RETURN')).toBeNull();
  });
});
