alter table public.users              enable row level security;
alter table public.saved_travelers    enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.price_history      enable row level security;
alter table public.price_alerts       enable row level security;

-- users: own row only
create policy "users_select_own" on public.users
  for select to authenticated using ((select auth.uid()) = id);
create policy "users_insert_own" on public.users
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "users_update_own" on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- saved_travelers: own rows
create policy "saved_travelers_select" on public.saved_travelers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_travelers_insert" on public.saved_travelers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saved_travelers_update" on public.saved_travelers
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "saved_travelers_delete" on public.saved_travelers
  for delete to authenticated using ((select auth.uid()) = user_id);

-- bookings: own rows
create policy "bookings_select" on public.bookings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "bookings_insert" on public.bookings
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- booking_passengers: accessible if the booking belongs to user
create policy "booking_passengers_select" on public.booking_passengers
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = (select auth.uid())
    )
  );
create policy "booking_passengers_insert" on public.booking_passengers
  for insert to authenticated with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = (select auth.uid())
    )
  );

-- price_history: read-only for authenticated users; service role writes via Edge Functions
create policy "price_history_select" on public.price_history
  for select to authenticated using (true);

-- price_alerts: own rows
create policy "price_alerts_select" on public.price_alerts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "price_alerts_insert" on public.price_alerts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "price_alerts_update" on public.price_alerts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "price_alerts_delete" on public.price_alerts
  for delete to authenticated using ((select auth.uid()) = user_id);
