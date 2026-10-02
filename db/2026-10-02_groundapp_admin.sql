-- GroundApp website admin dashboard (applied to Supabase project jlgmhpdggjxxfgfauobd on 2026-10-02
-- via the Supabase MCP as migration "groundapp_admin_dashboard"). Kept here as the record.
-- All tables: RLS on, no policies, so only the service role (Pages Functions, sync worker) can read/write.

-- App Store button taps from groundapp.live (POST /api/tap)
create table if not exists public.groundapp_taps (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ct text not null,          -- campaign token, e.g. site-hero, ig-sticky
  path text                  -- page the tap happened on
);
create index if not exists groundapp_taps_created_at_idx on public.groundapp_taps (created_at);
alter table public.groundapp_taps enable row level security;

-- Daily App Store Connect analytics, one row per date + metric + dimension (written by the asc-sync worker)
create table if not exists public.groundapp_asc_daily (
  date date not null,
  metric text not null,               -- e.g. impressions, page_views, downloads, redownloads, sessions, active_devices
  dim text not null default 'total',  -- 'total', 'source:<App Store source type>', 'campaign:<ct>', 'territory:<code>'
  value numeric not null,
  report text,                        -- Apple report name it came from
  updated_at timestamptz not null default now(),
  primary key (date, metric, dim)
);
alter table public.groundapp_asc_daily enable row level security;

-- Which Apple report instances (and segments) were already imported, plus request ids
create table if not exists public.groundapp_asc_imports (
  instance_id text primary key,
  report_name text,
  granularity text,
  processing_date date,
  rows_imported integer,
  imported_at timestamptz not null default now()
);
alter table public.groundapp_asc_imports enable row level security;

create table if not exists public.groundapp_asc_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);
alter table public.groundapp_asc_state enable row level security;

-- One call for the admin page: list + taps + Apple aggregates as JSON.
create or replace function public.groundapp_admin_summary(days integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $$
  with since as (select (now() - make_interval(days => days)) as t, (current_date - days) as d)
  select jsonb_build_object(
    'list', jsonb_build_object(
      'active_total', (select count(*) from newsletter_subscribers where status = 'active'),
      'groundapp_total', (select count(*) from newsletter_subscribers where status = 'active'
                            and (source like 'groundapp_site:%' or source in ('ground_waitlist_sheet','ground_app_subscribers_sheet','iOS_App_Signup'))),
      'new_7d', (select count(*) from newsletter_subscribers where source like 'groundapp_site:%' and subscribed_at >= now() - interval '7 days'),
      'new_period', (select count(*) from newsletter_subscribers, since where source like 'groundapp_site:%' and subscribed_at >= since.t),
      'unsubscribed_period', (select count(*) from newsletter_unsubscribed, since where unsubscribed_at >= since.t),
      'by_source', coalesce((select jsonb_agg(x order by x->>'count' desc) from (
          select jsonb_build_object('source', replace(source, 'groundapp_site:', ''), 'count', count(*)) x
          from newsletter_subscribers, since where source like 'groundapp_site:%' and subscribed_at >= since.t group by source) s), '[]'::jsonb),
      'daily', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d) from (
          select subscribed_at::date d, count(*) c from newsletter_subscribers, since
          where source like 'groundapp_site:%' and subscribed_at >= since.t group by 1) s), '[]'::jsonb),
      'recent', coalesce((select jsonb_agg(r) from (
          select jsonb_build_object('email', email, 'first_name', first_name, 'source', replace(source, 'groundapp_site:', ''), 'at', subscribed_at, 'status', status) r
          from newsletter_subscribers where source like 'groundapp_site:%' order by subscribed_at desc limit 15) s), '[]'::jsonb)
    ),
    'taps', jsonb_build_object(
      'total_period', (select count(*) from groundapp_taps, since where created_at >= since.t),
      'by_ct', coalesce((select jsonb_agg(jsonb_build_object('ct', ct, 'count', c) order by c desc) from (
          select ct, count(*) c from groundapp_taps, since where created_at >= since.t group by ct) s), '[]'::jsonb),
      'daily', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d) from (
          select created_at::date d, count(*) c from groundapp_taps, since where created_at >= since.t group by 1) s), '[]'::jsonb)
    ),
    'apple', jsonb_build_object(
      'last_date', (select max(date) from groundapp_asc_daily),
      'last_import', (select max(imported_at) from groundapp_asc_imports),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('date', date, 'metric', metric, 'dim', dim, 'value', value) order by date)
          from groundapp_asc_daily, since where date >= since.d), '[]'::jsonb)
    )
  );
$$;

revoke all on function public.groundapp_admin_summary(integer) from public, anon, authenticated;
grant execute on function public.groundapp_admin_summary(integer) to service_role;
