# Fare Subcategories (Fare Brands) in Search Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the airline's actual fare-brand name (e.g. "Economy Basic", "Economy Flex") on search results, and group same-flight offers that differ only by fare brand into one card with a tappable brand-selector chip row, instead of duplicate cards.

**Architecture:** A new pure-TS engine module (`engine/fare-groups.ts`) groups already-filtered/sorted `DuffelOffer[]` by flight identity (carrier + flight number + departure time per segment, chained across slices). `FlightCard` gains an optional `fareGroup` prop; when present with 2+ offers it renders a chip row that swaps the active offer's price/fare-conditions in place. `results.tsx` and `CardDeckView` wire the grouping into bundled-mode rendering only — stepwise (round-trip step 1/2) mode is unchanged.

**Tech Stack:** React Native + Expo, TypeScript, Zustand, Jest + `@testing-library/react-native`.

## Global Constraints

- Duffel field names are used verbatim, no transformation (`cabin_class_marketing_name` — see `CLAUDE.md` "Duffel API Field Names (gotchas)").
- `duffel-proxy` passes raw Duffel fields through untouched — no proxy changes for this feature.
- Grouping/chip picker applies to **bundled mode only** (list + stack views). Round-trip **stepwise** mode is explicitly out of scope and must not change behavior.
- Type check command: `node node_modules/typescript/lib/tsc.js --noEmit` (the `tsc` binary is broken in this project — do not run `npx tsc` directly).
- Test command: `npx jest <path>`.

---

### Task 1: `engine/fare-groups.ts` — grouping + brand-label engine module

**Files:**
- Modify: `types/duffel.ts:64-67` (add `cabin_class_marketing_name` to `DuffelOfferPassenger`)
- Create: `engine/fare-groups.ts`
- Test: `__tests__/engine/fare-groups.test.ts`

**Interfaces:**
- Produces: `getFlightIdentityKey(offer: DuffelOffer): string`, `groupOffersByFlight(offers: DuffelOffer[]): FareGroup[]`, `getFareBrandLabel(offer: DuffelOffer): string`, `interface FareGroup { key: string; offers: DuffelOffer[] }` — all exported from `@/engine/fare-groups`. Consumed by Task 2 (`FlightCard`), Task 3 (`CardDeckView`), Task 4 (`results.tsx`).

- [ ] **Step 1: Add the new field to `DuffelOfferPassenger`**

In `types/duffel.ts`, replace:

```ts
export interface DuffelOfferPassenger {
  id:   string;
  type: 'adult' | 'child' | 'infant_without_seat';
}
```

with:

```ts
export interface DuffelOfferPassenger {
  id:                          string;
  type:                        'adult' | 'child' | 'infant_without_seat';
  cabin_class_marketing_name?: string | null;
}
```

- [ ] **Step 2: Write the failing test file**

Create `__tests__/engine/fare-groups.test.ts`:

```ts
import { getFlightIdentityKey, groupOffersByFlight, getFareBrandLabel } from '@/engine/fare-groups';
import type { DuffelOffer } from '@/types/duffel';

function makeOffer(opts: {
  id?:                      string;
  totalAmount?:             number;
  flightNumber?:            string;
  departingAt?:             string;
  cabinClassMarketingName?: string | null;
  cabinClass?:              string;
} = {}): DuffelOffer {
  const {
    id                      = 'offer-1',
    totalAmount             = 400,
    flightNumber            = 'EK501',
    departingAt             = '2026-09-01T08:00:00',
    cabinClassMarketingName = null,
    cabinClass              = 'economy',
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

  it('falls back to capitalized cabin class when marketing name is absent', () => {
    const offer = makeOffer({ cabinClassMarketingName: null, cabinClass: 'premium_economy' });
    expect(getFareBrandLabel(offer)).toBe('Premium Economy');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/engine/fare-groups.test.ts`
Expected: FAIL with "Cannot find module '@/engine/fare-groups'"

- [ ] **Step 4: Implement `engine/fare-groups.ts`**

Create `engine/fare-groups.ts`:

```ts
import { DuffelOffer } from '@/types/duffel';

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
 * class capitalized ("Economy", "Premium Economy", "Business", "First").
 */
export function getFareBrandLabel(offer: DuffelOffer): string {
  const marketingName = offer.passengers[0]?.cabin_class_marketing_name;
  if (marketingName) return marketingName;
  const cabinClass = offer.slices[0]?.segments[0]?.passengers[0]?.cabin_class;
  return CABIN_LABELS[cabinClass ?? ''] ?? 'Economy';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/engine/fare-groups.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add types/duffel.ts engine/fare-groups.ts __tests__/engine/fare-groups.test.ts
git commit -m "feat: add fare-brand grouping engine module"
```

---

### Task 2: `FlightCard` fare-brand chip row

**Files:**
- Modify: `components/results/FlightCard.tsx`
- Test: `__tests__/components/FlightCard.test.tsx`

**Interfaces:**
- Consumes: `getFareBrandLabel(offer: DuffelOffer): string` from `@/engine/fare-groups` (Task 1); `calculateCost`, `getFareType` from `@/engine/total-cost` (existing).
- Produces: `FlightCard` prop additions `fareGroup?: DuffelOffer[]` and changed `onPress?: (offer: DuffelOffer) => void`. Consumed by Task 3 (`CardDeckView`) and Task 4 (`results.tsx`).

- [ ] **Step 1: Extend the test fixture builder and write failing tests**

In `__tests__/components/FlightCard.test.tsx`, change the `makeOffer` options type and destructure (around line 10-23):

```ts
function makeOffer(opts: {
  id?:            string;
  baseFare?:      string;
  includedBags?:  number;
  stops?:         number;
  isRoundTrip?:   boolean;
  fareBrand?:     string;
} = {}): DuffelOffer {
  const {
    id           = 'offer-1',
    baseFare     = '400.00',
    includedBags = 1,
    stops        = 0,
    isRoundTrip  = false,
    fareBrand    = undefined,
  } = opts;
```

And change the `passengers` line in the returned object (around line 74):

```ts
    passengers:     [{ id: 'pax-1', type: 'adult', cabin_class_marketing_name: fareBrand ?? null }],
```

Then append these tests at the end of the `describe('FlightCard', ...)` block, before the final closing `});`:

```ts
  // Fare brand chip row

  it('does not render a chip row when no fareGroup is provided', async () => {
    const { queryByText } = await render(
      <FlightCard offer={makeOffer({ baseFare: '400.00' })} bagCount={2} />,
    );
    expect(queryByText('Economy Basic')).toBeNull();
  });

  it('does not render a chip row when fareGroup has only one offer', async () => {
    const solo = makeOffer({ id: 'offer-1', baseFare: '400.00', fareBrand: 'Economy Basic' });
    const { queryByText } = await render(
      <FlightCard offer={solo} bagCount={2} fareGroup={[solo]} />,
    );
    expect(queryByText('Economy Basic')).toBeNull();
  });

  it('renders a chip per fare brand and defaults to the cheapest', async () => {
    const basic = makeOffer({ id: 'basic', baseFare: '400.00', fareBrand: 'Economy Basic', includedBags: 0 });
    const flex  = makeOffer({ id: 'flex',  baseFare: '500.00', fareBrand: 'Economy Flex',  includedBags: 2 });
    const { getByText } = await render(
      <FlightCard offer={basic} bagCount={2} fareGroup={[basic, flex]} />,
    );
    expect(getByText('Economy Basic')).toBeTruthy();
    expect(getByText('Economy Flex')).toBeTruthy();
    // basic: 400 + 9.99 + 2 bags*$65 (0 included) = 539.99 → $540 (cheapest, selected by default)
    expect(getByText('$540')).toBeTruthy();
  });

  it('switches price when a different fare brand chip is tapped', async () => {
    const basic = makeOffer({ id: 'basic', baseFare: '400.00', fareBrand: 'Economy Basic', includedBags: 0 });
    const flex  = makeOffer({ id: 'flex',  baseFare: '500.00', fareBrand: 'Economy Flex',  includedBags: 2 });
    const { getByText, queryByText } = await render(
      <FlightCard offer={basic} bagCount={2} fareGroup={[basic, flex]} />,
    );
    expect(getByText('$540')).toBeTruthy();

    fireEvent.press(getByText('Economy Flex'));

    // flex: 500 + 9.99 + 0 extra bags (2 included) = 509.99 → $510
    expect(getByText('$510')).toBeTruthy();
    expect(queryByText('$540')).toBeNull();
  });

  it('calls onPress with the currently-selected fare brand offer', async () => {
    const basic = makeOffer({ id: 'basic', baseFare: '400.00', fareBrand: 'Economy Basic' });
    const flex  = makeOffer({ id: 'flex',  baseFare: '500.00', fareBrand: 'Economy Flex' });
    const onPress = jest.fn();
    const { getByText } = await render(
      <FlightCard offer={basic} bagCount={2} fareGroup={[basic, flex]} onPress={onPress} />,
    );
    fireEvent.press(getByText('Economy Flex'));
    fireEvent.press(getByText('Total you pay'));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'flex' }));
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest __tests__/components/FlightCard.test.tsx -t "fare brand"`
Expected: FAIL — `queryByText`/`getByText` can't find chip text because `FlightCard` doesn't render a chip row yet, and `onPress` isn't called with an offer argument.

(Note: 4 unrelated tests in this file — `adds baggage fee when extra bags needed`, `renders Voya's pick badge when isVoyaPick`, `calls custom onPress when provided`, `navigates to offer detail when no onPress provided` — already fail on `main` before this task, from earlier uncommitted UI copy changes. Leave them as-is; they are out of scope for this plan.)

- [ ] **Step 3: Implement the chip row and active-offer selection in `FlightCard.tsx`**

Add the import for `getFareBrandLabel` (modify line 7):

```ts
import { calculateCost, formatDuration, getFareType } from '@/engine/total-cost';
import { getFareBrandLabel } from '@/engine/fare-groups';
```

Add a new `FareChipRow` component after the `FareTypeSheet` function (after its closing `}` around line 295, before `interface Props`):

```tsx
// ── Fare brand chip row ───────────────────────────────────────────────────────
function FareChipRow({
  group, selectedId, bagCount, onSelect,
}: {
  group:      DuffelOffer[];
  selectedId: string;
  bagCount:   number;
  onSelect:   (offerId: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 8 }}
      contentContainerStyle={{ gap: 6 }}
    >
      {group.map(o => {
        const selected = o.id === selectedId;
        const price    = Math.round(calculateCost(o, bagCount).total);
        return (
          <TouchableOpacity
            key={o.id}
            onPress={(e) => { e.stopPropagation?.(); onSelect(o.id); }}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={{
              borderRadius:      10,
              paddingHorizontal: 10,
              paddingVertical:   6,
              borderWidth:       1.5,
              borderColor:       selected ? colors.accent : colors.border,
              backgroundColor:   selected ? colors.accent : colors.background,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: selected ? '#fff' : colors.text }}>
              {getFareBrandLabel(o)}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: selected ? '#fff' : colors.textMuted }}>
              ${price}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
```

Update the `Props` interface (around line 297-311) — add `fareGroup` and change `onPress`:

```ts
interface Props {
  offer:               DuffelOffer;
  bagCount:            number;
  fareGroup?:          DuffelOffer[];
  trend?:              PriceTrend;
  isCheapest?:         boolean;
  isFastest?:          boolean;
  isPreferredAirline?: boolean;
  isVoyaPick?:         boolean;
  preferredAirlines?:  string[];
  avoidedAirports?:    string[];
  showSliceIndex?:     number;
  index?:              number;
  total?:              number;
  onPress?:            (offer: DuffelOffer) => void;
}
```

Update the component signature (around line 313-318) to destructure `fareGroup`:

```tsx
export function FlightCard({
  offer, bagCount, fareGroup, trend = 'stable',
  isCheapest, isFastest, isPreferredAirline, isVoyaPick,
  preferredAirlines = [], avoidedAirports = [],
  showSliceIndex, index, total, onPress,
}: Props) {
```

Replace the cost/fareType computation (around line 319-320):

```ts
  const [activeOfferId, setActiveOfferId] = useState(fareGroup?.[0]?.id ?? offer.id);
  const activeOffer   = fareGroup?.find(o => o.id === activeOfferId) ?? offer;
  const cost          = calculateCost(activeOffer, bagCount);
  const fareType      = getFareType(activeOffer);
```

Update the outer `TouchableOpacity`'s `onPress` (around line 340):

```tsx
      onPress={() => (onPress ? onPress(activeOffer) : router.push({ pathname: '/flight/[offerId]', params: { offerId: activeOffer.id } }))}
```

Update the `FareTypeSheet` invocation at the bottom (around line 461) to use `activeOffer`:

```tsx
      <FareTypeSheet offer={activeOffer} visible={showFare} onClose={() => setShowFare(false)} />
```

Insert the chip row right before the "Bottom row: label left, price right" comment (around line 441-442):

```tsx
      {fareGroup && fareGroup.length > 1 && (
        <FareChipRow
          group={fareGroup}
          selectedId={activeOfferId}
          bagCount={bagCount}
          onSelect={setActiveOfferId}
        />
      )}

      {/* Bottom row: label left, price right */}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/components/FlightCard.test.tsx`
Expected: The 5 new "fare brand" tests PASS. The same 4 pre-existing unrelated tests from Step 2 still fail (unchanged count) — total should be 22 passed / 4 failed / 26 total.

- [ ] **Step 5: Typecheck**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: No new errors introduced by this task (pre-existing errors, if any, are unrelated).

- [ ] **Step 6: Commit**

```bash
git add components/results/FlightCard.tsx __tests__/components/FlightCard.test.tsx
git commit -m "feat: add fare-brand chip row to FlightCard"
```

---

### Task 3: `CardDeckView` fare-group passthrough

**Files:**
- Modify: `components/results/CardDeckView.tsx`

**Interfaces:**
- Consumes: `getFlightIdentityKey(offer: DuffelOffer): string` from `@/engine/fare-groups` (Task 1); `FlightCard` props `fareGroup?: DuffelOffer[]` and `onPress?: (offer: DuffelOffer) => void` (Task 2).
- Produces: `CardDeckView` prop addition `fareGroups?: Record<string, DuffelOffer[]>`. Consumed by Task 4 (`results.tsx`).

There is no existing test file for `CardDeckView`; this task is verified by typecheck plus the manual check in Step 4.

- [ ] **Step 1: Add the import and prop**

In `components/results/CardDeckView.tsx`, add the import (after line 6):

```ts
import { FlightCard } from './FlightCard';
import { getFlightIdentityKey } from '@/engine/fare-groups';
```

Add to the `Props` interface (around line 15-30):

```ts
interface Props {
  offers:            DuffelOffer[];
  index:             number;
  onIndexChange:     (i: number) => void;
  onSwitchToList:    () => void;
  bagCount:          number;
  trend:             PriceTrend;
  showSliceIndex?:   number;
  onCardPress:       (offer: DuffelOffer) => void;
  cheapestId?:       string;
  fastestId?:        string;
  isBundled:         boolean;
  isRoundTrip:       boolean;
  preferredAirlines: string[];
  avoidedAirports:   string[];
  fareGroups?:       Record<string, DuffelOffer[]>;
}
```

Add to the component's destructured params (around line 32-37):

```tsx
export function CardDeckView({
  offers, index, onIndexChange, onSwitchToList,
  bagCount, trend, showSliceIndex, onCardPress,
  cheapestId, fastestId, isBundled, isRoundTrip,
  preferredAirlines, avoidedAirports, fareGroups,
}: Props) {
```

- [ ] **Step 2: Pass `fareGroup` through to both the background and top `FlightCard`s**

In the `behindOffers.map` block, add `fareGroup` to the `<FlightCard ... />` (around line 176-185):

```tsx
                <FlightCard
                  offer={offer}
                  fareGroup={fareGroups?.[getFlightIdentityKey(offer)]}
                  bagCount={bagCount}
                  trend={trend}
                  showSliceIndex={showSliceIndex}
                  preferredAirlines={preferredAirlines}
                  avoidedAirports={avoidedAirports}
                  index={index + depth}
                  total={offers.length}
                />
```

In the top card's `<FlightCard ... />` (around line 195-212), add `fareGroup` and simplify `onPress` (their signatures now match, `onCardPress: (offer: DuffelOffer) => void`):

```tsx
            <FlightCard
              offer={topOffer}
              fareGroup={fareGroups?.[getFlightIdentityKey(topOffer)]}
              bagCount={bagCount}
              trend={trend}
              showSliceIndex={showSliceIndex}
              onPress={onCardPress}
              isCheapest={topOffer.id === cheapestId && isBundled}
              isFastest={topOffer.id === fastestId && isBundled}
              isVoyaPick={isBundled && isRoundTrip && index === 0}
              isPreferredAirline={topOffer.slices[0]?.segments.some(
                (s: { marketing_carrier: { iata_code: string } }) =>
                  preferredAirlines.includes(s.marketing_carrier.iata_code)
              )}
              preferredAirlines={preferredAirlines}
              avoidedAirports={avoidedAirports}
              index={index}
              total={offers.length}
            />
```

- [ ] **Step 3: Typecheck**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: No new errors. (`fareGroups` is optional and unused callers are unaffected.)

- [ ] **Step 4: Manual verification**

`results.tsx` doesn't pass `fareGroups` yet (that's Task 4), so this step just confirms nothing broke:

Run: `npx jest __tests__/components/FlightCard.test.tsx`
Expected: Same pass/fail counts as the end of Task 2 (22 passed / 4 failed) — `CardDeckView` changes don't affect `FlightCard`'s own tests.

- [ ] **Step 5: Commit**

```bash
git add components/results/CardDeckView.tsx
git commit -m "feat: pass fare groups through CardDeckView to FlightCard"
```

---

### Task 4: `results.tsx` grouping wiring

**Files:**
- Modify: `app/search/results.tsx`

**Interfaces:**
- Consumes: `groupOffersByFlight`, `getFlightIdentityKey`, `FareGroup` from `@/engine/fare-groups` (Task 1); `CardDeckView`'s `fareGroups?: Record<string, DuffelOffer[]>` prop (Task 3); `FlightCard`'s `fareGroup?: DuffelOffer[]` prop and `onPress?: (offer: DuffelOffer) => void` (Task 2).

No test file exists for `results.tsx`; this task is verified by typecheck plus the manual smoke test in Step 5.

- [ ] **Step 1: Add the import**

In `app/search/results.tsx`, add after the existing `total-cost` import (around line 16):

```ts
import { calculateCost }   from '@/engine/total-cost';
import { groupOffersByFlight, getFlightIdentityKey } from '@/engine/fare-groups';
```

- [ ] **Step 2: Compute fare groups and the bundled-mode display list**

After the `filteredOffers` `useMemo` block (ends around line 205, right before `const displayOffers: DuffelOffer[] = ...` at line 207), insert:

```ts
  // Group same-flight offers that differ only by fare brand. Used for
  // bundled-mode rendering only; stepwise mode ignores this.
  const fareGroups = useMemo(
    () => groupOffersByFlight(filteredOffers),
    [filteredOffers],
  );

  const fareGroupByKey = useMemo(() => {
    const map = new Map<string, DuffelOffer[]>();
    for (const g of fareGroups) map.set(g.key, g.offers);
    return map;
  }, [fareGroups]);

  const fareGroupsRecord = useMemo(() => {
    const rec: Record<string, DuffelOffer[]> = {};
    for (const g of fareGroups) rec[g.key] = g.offers;
    return rec;
  }, [fareGroups]);

  // One representative (cheapest) offer per group, in group order.
  const bundledDisplayOffers = useMemo(
    () => fareGroups.map(g => g.offers[0]),
    [fareGroups],
  );
```

- [ ] **Step 3: Use the grouped list for `displayOffers` and wire `renderItem`**

Replace the existing `displayOffers` definition (line 207-209):

```ts
  const displayOffers: DuffelOffer[] = isRoundTrip && mode === 'stepwise'
    ? (step === 1 ? stepwiseOutbounds : stepwiseReturns)
    : filteredOffers;
```

with:

```ts
  const displayOffers: DuffelOffer[] = isRoundTrip && mode === 'stepwise'
    ? (step === 1 ? stepwiseOutbounds : stepwiseReturns)
    : bundledDisplayOffers;
```

Replace the `FlatList`'s `renderItem` (around line 670-688):

```tsx
          renderItem={({ item, index }) => {
            const group = mode === 'bundled' ? fareGroupByKey.get(getFlightIdentityKey(item)) : undefined;
            return (
              <FlightCard
                offer={item}
                fareGroup={group}
                bagCount={bagCount}
                trend={trend}
                showSliceIndex={showSliceIndex}
                onPress={handleCardPress}
                isCheapest={item.id === cheapestOffer?.id && mode === 'bundled'}
                isFastest={item.id === fastestOffer?.id && mode === 'bundled'}
                isVoyaPick={mode === 'bundled' && isRoundTrip && index === 0}
                isPreferredAirline={item.slices[0]?.segments.some(
                  (s: { marketing_carrier: { iata_code: string } }) => preferredAirlines.includes(s.marketing_carrier.iata_code),
                )}
                preferredAirlines={preferredAirlines}
                avoidedAirports={avoidedAirports}
                index={index}
                total={displayOffers.length}
              />
            );
          }}
```

- [ ] **Step 4: Pass `fareGroups` to `CardDeckView` and bump the estimated row height**

Update the `getItemLayout` block (around line 548-552):

```tsx
          getItemLayout={(_data, index) => {
            // Estimated collapsed card height: round-trip bundled shows 2 slices (taller).
            // Bundled-mode cards (and one-way, which is always bundled-rendered) may also
            // show a fare-brand chip row — add 34px for that when applicable.
            const hasChipRow = mode === 'bundled' || !isRoundTrip;
            const base = isRoundTrip && mode === 'bundled' ? 292 : 202;
            const h = hasChipRow ? base + 34 : base;
            return { length: h, offset: 8 + h * index, index };
          }}
```

Update the `<CardDeckView ... />` invocation (around line 524-539) to pass `fareGroups`:

```tsx
          <CardDeckView
            offers={displayOffers}
            index={Math.min(stackIndex, displayOffers.length - 1)}
            onIndexChange={setStackIndex}
            onSwitchToList={() => setViewMode('list')}
            bagCount={bagCount}
            trend={trend}
            showSliceIndex={showSliceIndex}
            onCardPress={handleCardPress}
            cheapestId={cheapestOffer?.id}
            fastestId={fastestOffer?.id}
            isBundled={mode === 'bundled'}
            isRoundTrip={isRoundTrip}
            preferredAirlines={preferredAirlines}
            avoidedAirports={avoidedAirports}
            fareGroups={mode === 'bundled' ? fareGroupsRecord : undefined}
          />
```

- [ ] **Step 5: Typecheck**

Run: `node node_modules/typescript/lib/tsc.js --noEmit`
Expected: No new errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx jest`
Expected: Same pass/fail counts as before this plan, plus the 7 new `fare-groups` tests and 5 new `FlightCard` chip-row tests passing. No previously-passing test should now fail.

- [ ] **Step 7: Manual verification**

Run the app on the connected device per `CLAUDE.md`: `npx expo run:ios --device "Yodaphone"`.

1. Search a one-way route (e.g. JFK → DEL, economy). Confirm the results list still renders, prices still show, and existing badges (Cheapest/Fastest/Your airline) still appear correctly.
2. If any two results happen to be the same flight/time with different prices (same carrier + flight number + departure time), confirm they now appear as a single card with a chip row, and tapping a chip updates the price and the fare-conditions icon without navigating away.
3. Tap a card (not a chip) and confirm it navigates to `/flight/[offerId]` for the currently-selected chip's offer.
4. Search a round trip and switch to **stepwise** mode (Step 1/2 outbound/return picker). Confirm no chip row appears anywhere in stepwise mode and the flow behaves exactly as before this change.
5. Switch to stack view (swipeable cards) for a bundled one-way or round-trip search and confirm chip rows behave the same as in list view.

If no live search results happen to share a flight identity (Duffel sandbox data may not include multiple fare brands for the same flight), items 1 and 4 are still valid confirmations that nothing regressed; item 2 can be confirmed indirectly by the automated `FlightCard` and `fare-groups` tests from Tasks 1–2.

- [ ] **Step 8: Commit**

```bash
git add app/search/results.tsx
git commit -m "feat: group same-flight offers by fare brand in results list"
```
