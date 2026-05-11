-- Saved products, compare history, and lightweight user preferences (QuantAI production layer).

create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  product_id numeric,
  title text,
  price numeric,
  image text,
  link text not null,
  ai_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists saved_products_user_link_uidx
  on public.saved_products (user_id, link);

create index if not exists saved_products_user_created_idx
  on public.saved_products (user_id, created_at desc);

create table if not exists public.compare_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists compare_sessions_user_created_idx
  on public.compare_sessions (user_id, created_at desc);

create table if not exists public.user_preferences (
  user_id text primary key,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
