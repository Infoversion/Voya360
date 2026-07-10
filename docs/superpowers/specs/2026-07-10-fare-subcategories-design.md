# Fare Subcategories (Fare Brands) in Search Results

**Date:** 2026-07-10
**Status:** Approved

## Problem

Search results show one card per Duffel offer. When an airline sells the same
flight under multiple fare brands (e.g. "Economy Basic", "Economy Standard",
"Economy Flex"), each brand comes back from Duffel as a separate offer with
its own id and price. Today these render as separate, unlabeled `FlightCard`s
with no indication of which fare family they belong to — the user can't tell
why the "same" flight appears twice at different prices, and has no way to
compare fare brands side by side.

## Goal

1. Surface the airline's actual fare-brand name on each offer.
2. Group same-flight offers that differ only by fare brand into a single
   card with a brand picker, instead of duplicate cards.

## Data Layer

Duffel returns the airline's marketed fare/cabin name per offer at
`offer.passengers[].cabin_class_marketing_name` (e.g. "Economy Basic",
"Economy Flex"). This field already flows through `duffel-proxy` untouched
(the proxy passes raw Duffel fields through without transformation), and is
already read once today for `price-snapshot` cabin-class logging — but it is
not typed or used anywhere in the app UI.

**Change:** add to `types/duffel.ts`:

```ts
export interface DuffelOfferPassenger {
  id:   string;
  type: 'adult' | 'child' | 'infant_without_seat';
  cabin_class_marketing_name?: string | null;
}
```

No `duffel-proxy` changes needed.

## Engine: `engine/fare-groups.ts` (new, pure TS, no React — matches existing `engine/` convention)

```ts
export interface FareGroup {
  key:    string;
  offers: DuffelOffer[]; // sorted cheapest-first
}

// Same physical flight(s) regardless of fare brand: chains every segment's
// marketing_carrier.iata_code + marketing_carrier_flight_number + departing_at
// across all slices, in order.
export function getFlightIdentityKey(offer: DuffelOffer): string;

// Groups offers sharing a flight identity key. Preserves the input list's
// order: a group's position in the output = the position of the first offer
// in that group as it appeared in the input. Offers within a group are
// sorted by total_amount ascending.
export function groupOffersByFlight(offers: DuffelOffer[]): FareGroup[];

// Airline's marketed brand name if Duffel provides one, else the cabin
// class capitalized ("Economy", "Premium Economy", "Business", "First").
export function getFareBrandLabel(offer: DuffelOffer): string;
```

`groupOffersByFlight` must be a stable pass over an already-sorted/filtered
list — it must not re-sort or re-rank groups relative to each other, only
consolidate members. This is what lets it slot into `results.tsx` after
existing filtering without disturbing sort order (cheapest-total, shortest-
duration, or departure-time).

## Scope

Grouping and the fare-brand picker apply to **bundled mode only** (both list
and stack/`CardDeckView` views) — this is the default and most-used mode.

**Round-trip stepwise mode** (pick outbound, then return, via
`outboundKey`/`returnKey` deduping in `results.tsx`) is explicitly **out of
scope** for this change. It keeps its current behavior: one card per unique
flight, already implicitly showing the cheapest brand first because
`sortedOffers` is cheapest-first and the existing dedup takes the first
match. Adding a fare-brand picker to stepwise mode requires reworking the
outbound/return pairing logic (`chosenOutboundKey`, exact-match lookup in
`handleCardPress`) and is a separate follow-up.

## `FlightCard` Changes

New optional props:

```ts
fareGroup?: DuffelOffer[]; // siblings including the offer itself, cheapest-first
onPress?:   (offer: DuffelOffer) => void; // was: () => void
```

Behavior:

- If `fareGroup` is absent or has length 1, the card renders exactly as
  today — no chip row, no behavior change. This keeps stepwise mode and any
  other caller unaffected without extra flags.
- If `fareGroup.length > 1`, render a new horizontally-scrollable chip row
  above the price row. One chip per offer in the group: brand label (via
  `getFareBrandLabel`) + that offer's `calculateCost(...).total`.
- Local state holds the selected offer id, defaulting to
  `fareGroup[0].id` (cheapest, per the grouping contract).
- All currently offer-derived values on the card — `calculateCost`,
  `getFareType`, the fare-conditions icon, and the `FareTypeSheet` detail
  sheet — switch from the `offer` prop to the currently-selected offer
  (`activeOffer`). This means changing brand updates price, the flex/
  refundable icon, and the detail sheet contents together.
- Chip taps call `e.stopPropagation()` so they don't trigger card
  navigation.
- `onPress` is invoked with `activeOffer` (not the original `offer` prop) so
  navigation/booking always targets the currently-selected brand's offer id.
- The existing "Cheapest" / "Fastest" / "Voya pick" / "Your airline" badges
  continue to compare against the original `offer` prop (the group's
  cheapest/representative member), not the currently-selected brand — a
  card stays marked "Cheapest" even if the user taps a pricier brand chip,
  since the badge describes the flight's standing among other flights, not
  the currently-viewed price.

## Results Screen Wiring

**`results.tsx`:**

- After existing stop/airline/time filters produce `filteredOffers`
  (unchanged), when `mode === 'bundled'`, compute:
  ```ts
  const fareGroups = groupOffersByFlight(filteredOffers);
  ```
- `displayOffers` for bundled mode becomes the groups' representative
  (cheapest) offers, in group order — this is what drives `cheapestOffer`,
  `fastestOffer`, and the baggage-flip comparison, all unchanged in logic
  since they already operate on individual offers and the representative
  offer of each group is that flight's cheapest brand.
- `FlatList`'s `keyExtractor` switches to the group key for bundled mode
  (falls back to today's `${item.id}-${showSliceIndex}` for stepwise mode).
- `renderItem` passes `fareGroup={group.offers}` alongside the existing
  props, looking up the group by the representative offer's flight identity
  key.
- `getItemLayout`'s estimated row height gets a modest bump for bundled
  mode to account for the chip row (exact height doesn't need to be exact —
  existing estimation is already approximate).
- `index`/`total` counters passed to `FlightCard` reflect group position/
  group count in bundled mode, not raw offer counts.

**`CardDeckView.tsx`:**

- Keeps its existing `offers: DuffelOffer[]` prop as the representative
  (cheapest) offer per group — no restructuring of the swipe/index logic.
- New optional prop `fareGroups?: Record<string, DuffelOffer[]>` (keyed by
  flight identity key), passed through unchanged to each `FlightCard`
  instance (top card and the 3 behind-cards) as `fareGroup`.

## Testing

- New `__tests__/engine/fare-groups.test.ts`:
  - `getFlightIdentityKey` distinguishes different flights and matches
    same flight/different fare brand.
  - `groupOffersByFlight` preserves input order at the group level and
    sorts within-group by price.
  - `getFareBrandLabel` prefers `cabin_class_marketing_name`, falls back to
    capitalized cabin class when absent.
- Update `__tests__/components/FlightCard.test.tsx`:
  - No `fareGroup` prop (or length 1) → no chip row, existing behavior
    unchanged.
  - `fareGroup` with multiple offers → chip row renders, tapping a chip
    updates price/fare icon, `onPress` fires with the selected offer.

## Out of Scope

- Stepwise round-trip mode fare-brand picker (see Scope section).
- Any change to `duffel-proxy` — the raw field already passes through.
- Filter bar changes (e.g. filtering by fare brand) — not requested.
