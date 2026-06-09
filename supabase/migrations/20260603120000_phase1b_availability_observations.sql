-- Phase 1B.1 — Availability observations (append-only listing truth time-series).
-- Writes are service-role only (Next.js API / cron). RLS enabled with no client policies.

create table if not exists public.availability_observations (
  id uuid primary key default gen_random_uuid(),
  listing_url text not null,
  sku_id text,
  observed_at timestamptz not null default now(),
  availability text not null,
  availability_text text,
  current_price numeric,
  shipping_price numeric,
  source text not null,
  freshness_score integer not null default 100,
  created_at timestamptz not null default now(),
  constraint availability_observations_availability_check check (
    availability in (
      'in_stock',
      'out_of_stock',
      'limited',
      'unknown',
      'removed',
      'seller_unavailable'
    )
  ),
  constraint availability_observations_freshness_score_check check (
    freshness_score >= 0 and freshness_score <= 100
  )
);

create index if not exists availability_observations_listing_url_idx
  on public.availability_observations (listing_url);

create index if not exists availability_observations_sku_id_idx
  on public.availability_observations (sku_id)
  where sku_id is not null;

create index if not exists availability_observations_observed_at_idx
  on public.availability_observations (observed_at desc);

create index if not exists availability_observations_source_idx
  on public.availability_observations (source);

create index if not exists availability_observations_listing_observed_idx
  on public.availability_observations (listing_url, observed_at desc);

alter table public.availability_observations enable row level security;

-- No policies for anon or authenticated: client writes blocked.
-- Supabase service role (supabaseAdmin) bypasses RLS for server-side inserts and reads.
