# CLAUDE.md — Voya360

This file is the definitive reference for anyone (human or AI) working in this codebase. Read it before touching anything.

---

## What This Is

**Voya360** is a mobile-only OTA (iOS + Android) for South and Southeast Asian diaspora travelers — H1B/Green Card holders, international students, and second-gen families flying home or on vacation. It issues real tickets (not redirects), charges a transparent flat service fee of $9.99 per booking, and layers cultural and AI intelligence into every step of the booking experience.

**This is not a vanilla travel app with AI added on top. AI is the foundation every screen is built on.**

**Core promise:** A returning user goes from app open to confirmed ticket in under 5 minutes.

**Full spec:** `../Pipeline/2026-06-27-voya360-core-design.md`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo SDK 56 + TypeScript |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| UI | NativeWind v4 (Tailwind for RN) + design tokens |
| Flight booking | Duffel API (NDC-first OTA API) |
| Payments | Stripe React Native SDK |
| Database / Auth | Supabase (Postgres + Auth + RLS) |
| Server logic | Supabase Edge Functions (Deno) |
| Push notifications | Expo Notifications |
| AI advisor | Claude API — claude-sonnet-4-6 |
| Name inference | On-device JSON dictionary (~50k names) |
| Deployment | Expo EAS |

---

## Architecture

```
┌─────────────────────────────────────────┐
│             React Native App            │
│   Expo Router / Zustand / NativeWind    │
│   Z@r@ session state (ephemeral)        │
└──────────┬───────────────┬──────────────┘
           │               │
   ┌───────▼──────┐ ┌──────▼───────────────┐
   │  Duffel API  │ │      Supabase         │
   │  (flights,   │ │  Postgres + Auth + RLS│
   │   orders,    │ │  price_history        │
   │   seats,     │ │  price_alerts         │
   │   refunds)   │ │  bookings             │
   └───────┬──────┘ └──────┬───────────────┘
           │               │
   ┌───────▼───────────────▼───────────────┐
   │       Supabase Edge Functions         │
   │  • duffel-proxy (all Duffel calls)    │
   │  • price-snapshot (every 6 hours)     │
   │  • zara-init (Claude API)             │
   │  • price-alert-checker (every 6h)    │
   └───────────────┬───────────────────────┘
                   │
           ┌───────▼──────┐
           │  Claude API  │
           │ Sonnet 4.6   │
           └──────────────┘
```

---

## Non-Negotiable Architecture Rules

These decisions are locked. Do not work around them.

**1. Duffel API key never touches the client.**
All Duffel calls go through the `duffel-proxy` Edge Function. The client calls Supabase Edge Functions only. This protects the API key and logs every search/booking server-side for Z@r@ analytics.

**2. Z@r@ observations are ephemeral.**
Z@r@'s Claude-generated observations live in Zustand only. They are never written to Supabase. They are discarded when the app closes. No conversation history is stored anywhere. Privacy-first — always.

**3. Passport numbers are encrypted via Supabase Vault.**
They are never logged, never included in Edge Function logs, never sent to Claude. If you are writing code that touches passport numbers, verify Vault encryption is in the chain.

**4. Price snapshots drive all intelligence — never live prices.**
The `price-snapshot` Edge Function runs every 6 hours and writes to `price_history`. Z@r@, trend arrows, and price alerts all read from this table. This keeps Claude API costs fixed and predictable. Do not bypass this by making live price calls for trend calculations.

**5. RLS on every user table.**
`users`, `saved_travelers`, `bookings`, `booking_passengers`, `price_alerts` — all gated to `auth.uid() = user_id`. Never disable or bypass RLS for convenience. `price_history` is read-only for authenticated users, write-only for Edge Function service role.

**6. Service fee is always exactly $9.99.**
It is a constant. It is never computed. It is never a percentage. It appears as a separate line item on the review and confirm screens — never bundled into the base fare.

---

## Product Design Principles

### The Three Priorities (in order)

Users making a booking decision care about exactly three things, in this order. Every design decision must respect this hierarchy.

**1. Final price including baggage — "Total You Pay"**
Base fares are misleading. The default sort is **Total You Pay** = base fare + $9.99 service fee + baggage fees for the user's bag count (default: 2 checked bags, configurable in profile). Never sort by base fare as default. Never show a price that excludes bags as the primary price on a card.

**2. Shortest total travel time**
Total gate-to-gate duration including all layovers, shown bold on every result card. Not just flight time — total time door to door. Z@r@ flags when a cheaper option adds more than 3 hours vs the next option.

**3. Preferred airline and transit hub**
Users set preferred airlines and avoid-list airports in profile. Preferred-airline results get a highlight border. Avoid-list results show a warning badge (never hidden). Filter bar respects these preferences per search.

### The Baggage Rule

For South Asian diaspora travelers, 2–3 checked bags is the norm (gift culture, long stays, generous family). A flight $50 more expensive that includes an extra bag is often the cheaper option in total.

**Baggage flip logic:** When two results are within $80 of each other and the more expensive one includes a checked bag the cheaper one charges for, the default sort flips and Z@r@ surfaces a comparison card.

### The 5-Minute Promise

Every screen has a time budget:
- Search: 60 seconds
- Select: 90 seconds
- Review: 90 seconds
- Confirm: 60 seconds

Saved traveler profiles, inferred dietary preferences, and one-tap payment are what enforce this — not cutting features.

---

## Z@r@ — The Background AI Thinker

Z@r@ is the app's defining differentiator. She is not a chatbot. She does not have a text input. She runs silently from the moment the app opens and surfaces insights as dismissible cards at the right screen.

### How She Works

1. On app open, a single Claude API call goes to the `zara-init` Edge Function with the user's context: home corridor, travel history, active price alerts, saved traveler count, latest price snapshots.
2. Claude returns a JSON array of up to 7 ranked observations.
3. Observations are stored in Zustand (`zara.store.ts`), never in Supabase.
4. Each screen consumes the observation most relevant to it. No observation repeats in a session.
5. Cards are swipe-dismissible. Dismissed observations do not reappear.
6. Z@r@ never blocks the flow. She is always additive.

### Observation Types → Screen Mapping

| Type | Screen |
|---|---|
| `corridor_opportunity` | Home |
| `day_of_week_saving` | Search results |
| `baggage_comparison` | Flight review |
| `seasonal_demand` | Search results |
| `hidden_passenger_saving` | Passenger details |
| `fastest_route` | Search results |
| `booking_validation` | Confirm |
| `post_booking_tip` | Post-booking |

### Cost

~$0.005–0.010 per session (single Sonnet 4.6 call, ~1,500 input tokens + ~400 output tokens). At 10k MAU booking twice/month: ~$100–200/month.

---

## Booking Flow (current implementation)

```
Home (search form)
  → search/results.tsx          Step 1 — pick a flight
  → flight/[offerId].tsx        Step 2 — review itinerary, select seats, add bags
  → booking/passengers.tsx      Step 3 — fill passenger details
  → booking/confirm.tsx         Step 4 — confirm & pay
  → booking/[bookingId].tsx     Post-booking / itinerary / manage
```

**Seat selection placement note:** Seat selection is currently on the review screen (Step 2), before passengers are filled in. The right place is after passengers (between Step 3 and 4). This is a pending UX fix — decision needed: a dedicated `/booking/seats` screen or at the top of the confirm screen.

---

## File Structure

```
voya360/
├── app/
│   ├── _layout.tsx                   # Root layout, auth gate, VoyaProvider
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Home — corridor widget + search form
│   │   ├── bookings.tsx              # Booking history
│   │   └── profile.tsx               # Profile, saved travelers, preferences
│   ├── search/results.tsx            # Search results
│   ├── flight/[offerId].tsx          # Review screen — itinerary, seats, bags, price
│   ├── booking/
│   │   ├── passengers.tsx            # Passenger details form
│   │   ├── confirm.tsx               # Confirm & pay
│   │   └── [bookingId].tsx           # Post-booking itinerary / manage booking
├── components/
│   ├── search/
│   │   ├── SearchForm.tsx
│   │   ├── AirportInput.tsx
│   │   ├── DatePicker.tsx
│   │   └── PassengerStepper.tsx
│   ├── results/
│   │   ├── FlightCard.tsx            # Total You Pay, trend arrow, fare type, stop detail with terminals
│   │   ├── BaggageBadge.tsx
│   │   ├── SmartBadge.tsx
│   │   ├── FilterBar.tsx
│   │   └── TrendArrow.tsx
│   ├── booking/
│   │   ├── PassengerForm.tsx
│   │   ├── DietaryRow.tsx            # Voya dietary inference nudge
│   │   ├── BaggageAddons.tsx         # Bag count stepper (used on confirm screen)
│   │   ├── SeatMapSelector.tsx       # Interactive seat grid — per-passenger, per-segment
│   │   └── PriceSummary.tsx          # Sticky footer: base + fee + bags = total
│   ├── voya/
│   │   ├── VoyaCard.tsx              # Dismissible AI insight card
│   │   └── VoyaProvider.tsx          # Initialises Voya on app open
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── AirlineLogo.tsx
│       ├── PageLogo.tsx
│       └── StepIndicator.tsx
├── engine/                           # Pure TypeScript — zero React dependencies
│   ├── dietary-inference.ts          # Name → dietary preference (on-device)
│   ├── price-trends.ts               # Trend calculation from price_history
│   ├── seasonal-events.ts            # Hardcoded event calendar
│   └── total-cost.ts                 # Total You Pay calculation + baggage flip
├── lib/
│   ├── supabase.ts                   # Supabase client
│   ├── duffel.ts                     # Callers for duffel-proxy Edge Function
│   ├── stripe.ts                     # Stripe RN SDK setup
│   └── notifications.ts              # Expo push setup
├── store/
│   ├── auth.store.ts
│   ├── search.store.ts
│   ├── booking.store.ts              # selectedSeats + selectedServices live here
│   └── zara.store.ts                 # Ephemeral Voya observations
├── hooks/
│   ├── useFlightSearch.ts
│   ├── useBookingFlow.ts             # Merges seats + services, drives Stripe/sandbox
│   ├── useSavedTravelers.ts
│   ├── usePriceHistory.ts
│   ├── usePriceAlerts.ts
│   └── useVoya.ts
├── types/
│   ├── duffel.ts
│   ├── booking.ts
│   └── zara.ts
├── constants/
│   ├── corridors.ts                  # Top 50 diaspora corridors list
│   ├── airports.ts                   # Local airport search (~50k entries, instant)
│   ├── design.ts                     # Design tokens (colours, font sizes, spacing)
│   └── seasonal-events.ts            # Eid, Diwali, Christmas windows by corridor
├── assets/
│   ├── logo.png                      # Transparent navy badge — used everywhere
│   ├── logo-alt.png                  # 4-option concept sheet — stored, not used in UI
│   └── names-dictionary.json         # ~50k names tagged by cultural + dietary
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   └── 002_rls.sql
│   └── functions/
│       ├── duffel-proxy/index.ts     # All Duffel API calls — see actions list below
│       ├── price-snapshot/index.ts   # Cron every 6h — writes to price_history
│       ├── zara-init/index.ts        # Claude API — returns Voya observations JSON
│       └── price-alert-checker/index.ts  # Cron every 6h — triggers push notifications
└── __tests__/
    ├── engine/
    │   ├── dietary-inference.test.ts
    │   ├── price-trends.test.ts
    │   ├── seasonal-events.test.ts
    │   └── total-cost.test.ts
    └── components/
        ├── FlightCard.test.tsx
        └── ZaraCard.test.tsx
```

---

## duffel-proxy Action Reference

All Duffel calls go through `supabase/functions/duffel-proxy/index.ts`. The client never calls Duffel directly. Actions:

| Action | Duffel endpoint | Notes |
|---|---|---|
| `offer_requests_create` | `POST /air/offer_requests` | Flight search |
| `offer_get` | `GET /air/offers/{id}` | Full offer detail |
| `seat_map_get` | `GET /air/seat_maps?offer_id={id}` | Returns `SeatMap[]` |
| `available_services_get` | `GET /air/offers/{id}/available_services` | Returns baggage services only (filtered to `type=baggage`) |
| `booking_initiate` | Stripe intent + `POST /air/orders` | Sandbox: creates order directly; Stripe: creates intent, webhook creates order |
| `order_get` | `GET /air/orders/{id}` | Post-booking detail including `documents[]` (e-ticket numbers) |
| `order_change_preview` | Duffel order changes API | Preview change cost |
| `order_change_confirm` | Duffel order changes API | Confirm change |
| `order_cancel_preview` | Duffel cancellations API | Preview refund |
| `order_cancel_confirm` | Duffel cancellations API | Confirm cancellation |
| `delete_account` | Internal | Deletes user and all data |

`booking_initiate` accepts an optional `services` array — `Array<{ id: string; quantity: number }>` — which is passed directly to the Duffel order. This covers both seat selections and extra baggage.

---

## Duffel API Field Names (gotchas)

The duffel-proxy passes raw API responses through without field transformation. Field names must match the Duffel API exactly.

**Correct field names on offer segments:**
- `marketing_carrier_flight_number` — NOT `flight_number` (that field does not exist on offer segments)
- `origin_terminal` / `destination_terminal` — nullable strings, present on segments
- `aircraft` — `{ iata_code: string; name: string } | null`
- `available_services` on seat elements — per-passenger, keyed by `passenger_id`

**Seat map structure:**
```
SeatMap → cabins[] → rows[] → sections[] → elements[]
```
Each `SeatElement` has `type` (`seat | empty | bassinet | lavatory | galley | closet | stairs`), `designator` (e.g. `22A`), and `available_services[]` — one entry per passenger who can book that seat. A seat with no entry for a given passenger is taken/unavailable for them.

**Seat selection key format:** `${segmentId}__${duffelPassengerId}` → Duffel service ID. Stored in `booking.store.ts` as `selectedSeats: Record<string, string>`.

---

## Booking Store (`store/booking.store.ts`)

Key state beyond the obvious:

| Field | Type | Purpose |
|---|---|---|
| `selectedSeats` | `Record<string, string>` | Key: `${segmentId}__${duffelPaxId}` → Duffel seat service ID |
| `selectedServices` | `Array<{id, quantity}>` | Extra baggage services chosen on review screen |
| `passengers` | `PassengerInput[]` | Local passenger data — aligned to `offer.passengers` order |

`duffelPassengerIds` needed by `SeatMapSelector` come from `offer.passengers[].id` (the Duffel offer passenger IDs), not from `booking.store.ts` passengers (which use local UUIDs).

`useBookingFlow.ts` reads both `selectedSeats` and `selectedServices` via `getState()` at payment time and merges them into a single `services` array for `initiateBooking`.

---

## Data Model (Supabase)

```sql
users (
  id uuid PK, email text UNIQUE, full_name text, phone text,
  home_origin text,              -- IATA city code
  home_destination text,
  preferred_airlines text[],     -- e.g. ['EK', 'QR', 'TK']
  avoided_airports text[],       -- e.g. ['CDG', 'FCO']
  default_bag_count int DEFAULT 2,
  dietary_preference text,       -- vegetarian | halal | kosher | vegan | none
  dietary_confirmed bool DEFAULT false,
  created_at timestamptz
)

saved_travelers (
  id uuid PK, user_id uuid FK,
  full_name text, date_of_birth date,
  passport_number text,          -- encrypted via Supabase Vault
  passport_expiry date, passport_country text,
  dietary_preference text,
  seat_preference text,          -- window | aisle | none
  is_primary bool DEFAULT false
)

bookings (
  id uuid PK, user_id uuid FK,
  duffel_order_id text UNIQUE, pnr text,
  status text,                   -- confirmed | cancelled | refunded | return_cancelled
  origin text, destination text,
  departure_at timestamptz, arrival_at timestamptz,
  airline text, cabin_class text, passenger_count int,
  base_fare_usd numeric(10,2),
  service_fee_usd numeric(10,2) DEFAULT 9.99,
  baggage_fee_usd numeric(10,2) DEFAULT 0,
  total_usd numeric(10,2),
  e_ticket_url text, created_at timestamptz
)

booking_passengers (
  id uuid PK, booking_id uuid FK,
  saved_traveler_id uuid FK nullable,
  full_name text, dietary_preference text, seat_number text
)

price_history (
  id uuid PK, origin text, destination text,
  cabin_class text, departure_date date, airline text,
  price_usd numeric(10,2), bags_included bool,
  snapshot_at timestamptz
)

price_alerts (
  id uuid PK, user_id uuid FK,
  origin text, destination text,
  target_price_usd numeric(10,2),
  cabin_class text DEFAULT 'economy',
  is_active bool DEFAULT true,
  triggered_at timestamptz, created_at timestamptz
)
```

---

## Pending Items (before launch)

### Hard blockers
- **Stripe production keys** — `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` not yet set in Supabase secrets. Payment flow runs in sandbox mode until these are added. Once set, the `booking_initiate` action switches to Stripe mode automatically.

### UX decisions needed
- **Seat selection placement** — currently on review screen (Step 2 of 4), before passenger names are known. Should move to after passenger details. Options: (a) dedicated `/booking/seats` screen between passengers and confirm, or (b) seat section at the top of the confirm screen. Decision pending.
- **Baggage fallback** — the `BaggageAddons` component was removed from the review screen in favour of real Duffel services. If an airline doesn't expose baggage services via Duffel's available services API, there is currently no UI for the user to indicate extra bags. Need a fallback for this case.
- **Seat summary on confirm screen** — chosen seats are stored in the booking store but not displayed on the confirm screen before payment. User should see "Seat 22A — Nasir" before tapping "Confirm & Pay".

### Operational
- **Verify `price-snapshot` cron** is deployed to Supabase and firing every 6 hours. Without this, trend arrows and Z@r@ price observations have no data.
- **Verify `price-alert-checker` cron** is deployed and push notifications fire end-to-end.

---

## Build Command

```bash
npx expo run:ios --device "Yodaphone"
```

Always rebuild after code changes. Use `--no-build-cache` if native modules changed. Do not ask before rebuilding.

---

## Design Tokens

```typescript
// constants/design.ts
export const colors = {
  accent:      '#E8751A',  // saffron — primary CTA, badges, prices
  background:  '#FFFFFF',
  text:        '#1A1A1A',
  textMuted:   '#6B7280',
  success:     '#16A34A',  // green — free bag badge
  warning:     '#D97706',  // amber — bag fee badge
  border:      '#E5E7EB',
}

export const fontSize = {
  body:    16,
  label:   14,
  header:  22,
  price:   28,
  pnr:     32,
}

export const spacing = {
  touchTarget: 44,  // minimum dp for any interactive element
}
```

---

## UI Copy Rules

Write every string as if the user is reading on a phone in a hurry:

| Wrong | Right |
|---|---|
| "Gross fare including ancillaries" | "Total you pay" |
| "Demand index elevated" | "Book now — price rising" |
| "Baggage allowance: 0PC" | "No free bags — +$65 per bag" |
| "Dietary meal preference" | "Meal preference" |
| "Confirm purchase" | "Confirm & Pay" |

---

## User Segments (quick reference)

| Segment | Key need | Design implication |
|---|---|---|
| H1B / Green Card worker | Cheapest total fare, fast booking | Default sort by Total You Pay, saved profiles |
| Diaspora family (2–4 pax) | Baggage clarity, no surprises | Baggage flip logic, multi-pax pre-fill |
| International student | Cheapest fare, price alerts | Alert CTA prominent on results |
| First-generation parent | Large text, simple flow | 44dp targets, 16sp minimum, step indicator |
| Gen Z intra-Asia | Speed, direct booking | 5-min flow, no redirects |

---

## Target Corridors (top diaspora routes)

Primary: US/UK/Canada ↔ India (DEL, BOM, HYD, MAA, BLR, CCU), Pakistan (KHI, LHE, ISB), Bangladesh (DAC), Philippines (MNL), Sri Lanka (CMB), Nepal (KTM)

Secondary: US/UK ↔ UAE (DXB, AUH), Singapore (SIN), Malaysia (KUL)

Preferred transit hubs for this audience: DXB (Emirates), DOH (Qatar Airways), IST (Turkish Airlines)

Airports this audience often avoids for long layovers: CDG, FCO, MXP (unfamiliar, slow immigration)

---

## Competitive Context (why we exist)

Every major competitor added AI in 2023–2024 on top of an unchanged booking engine:
- **Expedia** → "Romie" chatbot bolted onto a 25-year-old platform
- **Kayak** → "Ask KAYAK" chat wrapper, still redirects, still shows base fares
- **Skyscanner** → AI natural language search, still redirects to third parties
- **Hopper** → price prediction AI but US-domestic focus, confusing subscription model
- **MakeMyTrip** → India-origin UX, cluttered with ads, no diaspora intelligence

Voya360's difference: AI is the foundation, not a feature. The sort order, defaults, dietary inference, Z@r@, seasonal warnings, and baggage flip logic are all AI-driven from day one — not bolted on.

---

## Success Criteria (v1)

- Returning user completes round-trip booking for 1–4 passengers in under 5 minutes
- Duffel order created, PNR returned, e-ticket stored on confirmation
- Stripe processes card, Apple Pay, and Google Pay
- $9.99 service fee shown as distinct line item
- PNR accessible offline (AsyncStorage)
- Z@r@ initialises within 3 seconds of app open
- Price trend badge on all search results
- Seasonal demand banner fires within 90 days of hardcoded events
- Dietary inference correct for ≥80% of South/Southeast Asian test names
- Price alert triggers push notification within 30 minutes of qualifying drop
- Search results appear within 4 seconds on 4G
- Cold start to home screen under 2 seconds

---

## Out of Scope (v1)

- Multi-city / open-jaw itineraries
- Hotels or car rental
- Group bookings (5+ passengers)
- Visa information
- Z@r@ chat interface
- Fare calendar
- Airline loyalty / frequent flyer numbers
- AirAsia / IndiGo / SpiceJet (audit Duffel LCC coverage before launch)
- Localisation beyond English
- B2B / travel agent portal
