-- Phase 1D — Historical price observations (canonical SKU price truth trail).

create table if not exists public.historical_price_observations (
  id uuid primary key default gen_random_uuid(),
  canonical_sku_id text not null,
  merchant_key text not null,
  listing_url text,
  observed_price numeric not null check (observed_price > 0),
  currency text not null default 'EUR',
  observed_at timestamptz not null default now(),
  availability_status text,
  source text not null default 'cron_refresh',
  created_at timestamptz not null default now()
);

create index if not exists historical_price_obs_sku_observed_idx
  on public.historical_price_observations (canonical_sku_id, observed_at desc);

create index if not exists historical_price_obs_sku_merchant_observed_idx
  on public.historical_price_observations (canonical_sku_id, merchant_key, observed_at desc);

create index if not exists historical_price_obs_listing_observed_idx
  on public.historical_price_observations (listing_url, observed_at desc)
  where listing_url is not null;

alter table public.historical_price_observations enable row level security;

-- Service role only (same pattern as availability_observations / sku_identity_registry).
