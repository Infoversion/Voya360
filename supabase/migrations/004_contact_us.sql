-- Contact Us feature: user-facing support queries, admin inbox, and the
-- configurable notification-email setting.

alter table public.users add column is_admin boolean default false;

create table public.app_settings (
  key   text primary key,
  value text
);
insert into public.app_settings (key, value)
values ('contact_notification_email', 'support@infoversion.com');

create table public.contact_queries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade not null,
  -- Denormalized at submission time (mirrors booking_passengers.full_name):
  -- admins can't join to other users' rows under the users table's own-row-only
  -- RLS, so the submitter's name/email are captured here instead of joined.
  submitter_name  text,
  submitter_email text not null,
  subject    text not null,
  message    text not null,
  status     text check (status in ('new','in_progress','resolved')) default 'new',
  created_at timestamptz default now()
);

-- Separate table rather than an array column, so a query can carry 0–3 files cleanly.
create table public.contact_query_attachments (
  id           uuid primary key default gen_random_uuid(),
  query_id     uuid references public.contact_queries(id) on delete cascade not null,
  storage_path text not null,
  file_name    text not null,
  content_type text,
  created_at   timestamptz default now()
);

-- A table rather than a single reply field — support conversations are
-- rarely one-and-done; each row insert triggers one outbound email.
create table public.contact_query_replies (
  id            uuid primary key default gen_random_uuid(),
  query_id      uuid references public.contact_queries(id) on delete cascade not null,
  admin_user_id uuid references public.users(id) on delete set null,
  message       text not null,
  created_at    timestamptz default now()
);

create index idx_contact_queries_user            on public.contact_queries(user_id);
create index idx_contact_queries_status           on public.contact_queries(status);
create index idx_contact_query_attachments_query  on public.contact_query_attachments(query_id);
create index idx_contact_query_replies_query      on public.contact_query_replies(query_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.app_settings              enable row level security;
alter table public.contact_queries           enable row level security;
alter table public.contact_query_attachments enable row level security;
alter table public.contact_query_replies     enable row level security;

-- app_settings: admin-only, both directions
create policy "app_settings_admin_select" on public.app_settings
  for select to authenticated using (
    exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true)
  );
create policy "app_settings_admin_update" on public.app_settings
  for update to authenticated
  using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true))
  with check (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true));

-- contact_queries: own rows for regular users; every row for admins
create policy "contact_queries_select" on public.contact_queries
  for select to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true)
  );
create policy "contact_queries_insert" on public.contact_queries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contact_queries_admin_update" on public.contact_queries
  for update to authenticated
  using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true))
  with check (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true));

-- contact_query_attachments: visible wherever the parent query is visible
create policy "contact_query_attachments_select" on public.contact_query_attachments
  for select to authenticated using (
    exists (
      select 1 from public.contact_queries q
      where q.id = query_id
        and (
          q.user_id = (select auth.uid())
          or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true)
        )
    )
  );
create policy "contact_query_attachments_insert" on public.contact_query_attachments
  for insert to authenticated with check (
    exists (
      select 1 from public.contact_queries q
      where q.id = query_id and q.user_id = (select auth.uid())
    )
  );

-- contact_query_replies: owning user can read; only admins can write
create policy "contact_query_replies_select" on public.contact_query_replies
  for select to authenticated using (
    exists (
      select 1 from public.contact_queries q
      where q.id = query_id
        and (
          q.user_id = (select auth.uid())
          or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true)
        )
    )
  );
create policy "contact_query_replies_admin_insert" on public.contact_query_replies
  for insert to authenticated with check (
    exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true)
  );

-- ── Storage: private bucket, accessed only via signed URLs ────────────────

insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;

create policy "contact_attachments_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contact-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "contact_attachments_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contact-attachments'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin = true)
    )
  );

create policy "contact_attachments_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contact-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
