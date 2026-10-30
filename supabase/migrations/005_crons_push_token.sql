-- Add push_token to users (needed by price-alert-checker)
alter table public.users add column if not exists push_token text;

-- pg_cron and pg_net must be enabled in Supabase Dashboard
-- (Database → Extensions) before these cron jobs will run.
create extension if not exists pg_net  schema extensions;
create extension if not exists pg_cron schema extensions;

-- Price snapshot every 6 hours
select cron.schedule(
  'price-snapshot-6h',
  '0 */6 * * *',
  $$
  select net.http_post(
    url     := 'https://lmmgxabbwpsfjpkihxbb.supabase.co/functions/v1/price-snapshot',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);

-- Price alert checker 10 minutes after each snapshot run
select cron.schedule(
  'price-alert-checker-6h',
  '10 */6 * * *',
  $$
  select net.http_post(
    url     := 'https://lmmgxabbwpsfjpkihxbb.supabase.co/functions/v1/price-alert-checker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
