-- Phase 1C — SKU identity registry (one product, many listings).

create table if not exists public.sku_identity_registry (
  canonical_sku_id text primary key,
  canonical_key text not null,
  brand_key text,
  model_key text,
  resolver_method text not null,
  identity_confidence integer not null,
  global_product_identity jsonb not null default '{}'::jsonb,
  fingerprint jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sku_identity_registry_resolver_method_check check (
    resolver_method in ('gtin', 'upc', 'ean', 'mpn', 'brand_model', 'fingerprint')
  ),
  constraint sku_identity_registry_confidence_check check (
    identity_confidence >= 0 and identity_confidence <= 100
  )
);

create index if not exists sku_identity_registry_canonical_key_idx
  on public.sku_identity_registry (canonical_key);

create index if not exists sku_identity_registry_brand_model_idx
  on public.sku_identity_registry (brand_key, model_key);

create table if not exists public.sku_identity_mappings (
  id uuid primary key default gen_random_uuid(),
  canonical_sku_id text not null references public.sku_identity_registry (canonical_sku_id) on delete cascade,
  listing_url text not null,
  merchant_key text not null,
  merchant_listing_id text,
  match_confidence integer not null default 50,
  resolver_method text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sku_identity_mappings_resolver_method_check check (
    resolver_method in ('gtin', 'upc', 'ean', 'mpn', 'brand_model', 'fingerprint')
  ),
  constraint sku_identity_mappings_match_confidence_check check (
    match_confidence >= 0 and match_confidence <= 100
  )
);

create unique index if not exists sku_identity_mappings_listing_url_uidx
  on public.sku_identity_mappings (listing_url);

create index if not exists sku_identity_mappings_canonical_sku_idx
  on public.sku_identity_mappings (canonical_sku_id);

create index if not exists sku_identity_mappings_merchant_key_idx
  on public.sku_identity_mappings (merchant_key);

alter table public.sku_identity_registry enable row level security;
alter table public.sku_identity_mappings enable row level security;

-- Service role only (same pattern as availability_observations).

comment on column public.availability_observations.sku_id is
  'Phase 1C canonical SKU id — references sku_identity_registry.canonical_sku_id';
