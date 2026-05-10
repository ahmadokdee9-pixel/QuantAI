-- QuantAI intelligence foundation: history, memory, watchlist, collections.
-- Apply in Supabase SQL editor or via CLI when ready.

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  query text not null,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists search_history_user_created_idx
  on public.search_history (user_id, created_at desc);

create table if not exists public.user_shopping_memory (
  user_id text primary key,
  memory jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  product jsonb not null,
  target_price numeric,
  created_at timestamptz not null default now()
);

create unique index if not exists shopping_watchlist_user_link_uidx
  on public.shopping_watchlist (user_id, ((product->>'link')));

create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.product_collections (id) on delete cascade,
  product jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists collection_products_collection_idx
  on public.collection_products (collection_id);
