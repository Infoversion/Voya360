-- Stripe payment intent reference on bookings.
-- Used by stripe-webhook for idempotency and by the client for polling.
alter table public.bookings
  add column stripe_payment_intent_id text unique;

-- Temporary store for bookings awaiting Stripe webhook confirmation.
-- Passenger data (including passports) is held here server-side rather than
-- in Stripe PI metadata, keeping PII off Stripe's platform.
-- Rows are deleted by the webhook on success; any remnants expire naturally.
create table public.pending_bookings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete cascade not null,
  offer_id        text not null,
  bag_count       int not null default 2,
  stripe_intent   text unique not null,
  passengers_json jsonb not null,
  currency        text not null default 'usd',
  created_at      timestamptz default now()
);

-- RLS enabled; no client policies — only the service role (Edge Functions) may read or write.
alter table public.pending_bookings enable row level security;

create index idx_pending_bookings_intent
  on public.pending_bookings(stripe_intent);
