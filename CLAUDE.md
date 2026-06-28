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
  status text,                   -- confirmed | cancelled | refunded
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

## File Structure

```
voya360/
├── app/
│   ├── _layout.tsx                   # Root layout, auth gate, ZaraProvider
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Home — corridor widget + search form
│   │   ├── bookings.tsx              # Booking history
│   │   └── profile.tsx               # Profile, saved travelers, preferences
│   ├── search/results.tsx            # Search results (step 2)
│   ├── flight/[offerId].tsx          # Review screen (step 3)
│   ├── booking/confirm.tsx           # Confirm & pay (step 4)
│   └── booking/[bookingId].tsx       # Post-booking / itinerary
├── components/
│   ├── search/
│   │   ├── SearchForm.tsx
│   │   ├── AirportInput.tsx
│   │   ├── DatePicker.tsx
│   │   └── PassengerStepper.tsx
│   ├── results/
│   │   ├── FlightCard.tsx            # Shows Total You Pay, total time, bags
│   │   ├── BaggageBadge.tsx
│   │   ├── SmartBadge.tsx
│   │   ├── FilterBar.tsx
│   │   └── TrendArrow.tsx
│   ├── booking/
│   │   ├── PassengerForm.tsx
│   │   ├── DietaryRow.tsx            # Shows Z@r@'s dietary inference nudge
│   │   ├── BaggageAddons.tsx
│   │   └── PriceSummary.tsx          # Sticky footer: base + fee + bags = total
│   ├── zara/
│   │   ├── ZaraCard.tsx              # Dismissible insight card
│   │   └── ZaraProvider.tsx          # Initialises Z@r@ on app open
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
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
│   ├── booking.store.ts
│   └── zara.store.ts                 # Ephemeral Z@r@ observations
├── hooks/
│   ├── useFlightSearch.ts
│   ├── useBookingFlow.ts
│   ├── useSavedTravelers.ts
│   ├── usePriceHistory.ts
│   ├── usePriceAlerts.ts
│   └── useZara.ts
├── types/
│   ├── duffel.ts
│   ├── booking.ts
│   └── zara.ts
├── constants/
│   ├── corridors.ts                  # Top 50 diaspora corridors list
│   ├── design.ts                     # Design tokens (colours, font sizes, spacing)
│   └── seasonal-events.ts            # Eid, Diwali, Christmas windows by corridor
├── assets/
│   └── names-dictionary.json         # ~50k names tagged by cultural + dietary
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   └── 002_rls.sql
│   └── functions/
│       ├── duffel-proxy/index.ts
│       ├── price-snapshot/index.ts
│       ├── zara-init/index.ts
│       └── price-alert-checker/index.ts
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
