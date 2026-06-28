create extension if not exists "pgcrypto";

create table public.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  full_name          text,
  phone              text,
  home_origin        text,
  home_destination   text,
  preferred_airlines text[] default '{}',
  avoided_airports   text[] default '{}',
  default_bag_count  int default 2,
  dietary_preference text check (dietary_preference in ('vegetarian','halal','kosher','vegan','none')),
  dietary_confirmed  bool default false,
  created_at         timestamptz default now()
);

create table public.saved_travelers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.users(id) on delete cascade not null,
  full_name         text not null,
  date_of_birth     date,
  passport_number   text,
  passport_expiry   date,
  passport_country  text,
  dietary_preference text check (dietary_preference in ('vegetarian','halal','kosher','vegan','none')),
  seat_preference   text check (seat_preference in ('window','aisle','none')),
  is_primary        bool default false,
  created_at        timestamptz default now()
);

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete restrict not null,
  duffel_order_id  text unique not null,
  pnr              text,
  status           text check (status in ('confirmed','cancelled','refunded')) default 'confirmed',
  origin           text,
  destination      text,
  departure_at     timestamptz,
  arrival_at       timestamptz,
  airline          text,
  cabin_class      text,
  passenger_count  int,
  base_fare_usd    numeric(10,2),
  service_fee_usd  numeric(10,2) default 9.99,
  baggage_fee_usd  numeric(10,2) default 0,
  total_usd        numeric(10,2),
  e_ticket_url     text,
  created_at       timestamptz default now()
);

create table public.booking_passengers (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete cascade not null,
  saved_traveler_id   uuid references public.saved_travelers(id) on delete set null,
  full_name           text not null,
  dietary_preference  text check (dietary_preference in ('vegetarian','halal','kosher','vegan','none')),
  seat_number         text
);

create table public.price_history (
  id             uuid primary key default gen_random_uuid(),
  origin         text not null,
  destination    text not null,
  cabin_class    text not null,
  departure_date date not null,
  airline        text,
  price_usd      numeric(10,2),
  bags_included  bool,
  snapshot_at    timestamptz default now()
);

create table public.price_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete cascade not null,
  origin           text not null,
  destination      text not null,
  target_price_usd numeric(10,2) not null,
  cabin_class      text default 'economy',
  is_active        bool default true,
  triggered_at     timestamptz,
  created_at       timestamptz default now()
);

-- Index for price trend calculations (Phase 2)
create index idx_price_history_corridor
  on public.price_history(origin, destination, cabin_class, snapshot_at desc);

-- Index for price alert checker Edge Function (Phase 4)
create index idx_price_alerts_active
  on public.price_alerts(is_active) where is_active = true;
