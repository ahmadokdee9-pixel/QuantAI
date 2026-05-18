-- QuantAI launch layer: alerts, billing state, outbound attribution, and RLS hardening.

alter table public.shopping_watchlist
  add column if not exists alert_mode text not null default 'price_drop',
  add column if not exists last_seen_price numeric,
  add column if not exists last_checked_at timestamptz,
  add column if not exists alert_state jsonb not null default '{}'::jsonb;

create table if not exists public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  product_link text not null,
  store text,
  title text,
  price numeric not null,
  currency text,
  source text not null default 'watchlist',
  captured_at timestamptz not null default now()
);

create index if not exists price_snapshots_link_captured_idx
  on public.price_snapshots (product_link, captured_at desc);

create index if not exists price_snapshots_user_captured_idx
  on public.price_snapshots (user_id, captured_at desc);

create table if not exists public.outbound_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  click_id text not null unique,
  target_url text not null,
  merchant text,
  route_kind text,
  product_title text,
  search_query text,
  decision_action text,
  created_at timestamptz not null default now()
);

create index if not exists outbound_clicks_user_created_idx
  on public.outbound_clicks (user_id, created_at desc);

create table if not exists public.user_billing_state (
  user_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_tier text not null default 'free',
  status text not null default 'free',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists user_billing_state_customer_idx
  on public.user_billing_state (stripe_customer_id);

alter table public.saved_products enable row level security;
alter table public.shopping_watchlist enable row level security;
alter table public.product_collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.outbound_clicks enable row level security;
alter table public.user_billing_state enable row level security;

drop policy if exists "saved_products_own" on public.saved_products;
create policy "saved_products_own"
  on public.saved_products
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "shopping_watchlist_own" on public.shopping_watchlist;
create policy "shopping_watchlist_own"
  on public.shopping_watchlist
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "product_collections_own" on public.product_collections;
create policy "product_collections_own"
  on public.product_collections
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "collection_products_via_collection" on public.collection_products;
create policy "collection_products_via_collection"
  on public.collection_products
  for all
  to authenticated
  using (
    exists (
      select 1 from public.product_collections c
      where c.id = collection_id
        and c.user_id = coalesce((select auth.jwt()->>'sub'), '')
    )
  )
  with check (
    exists (
      select 1 from public.product_collections c
      where c.id = collection_id
        and c.user_id = coalesce((select auth.jwt()->>'sub'), '')
    )
  );

drop policy if exists "price_snapshots_own" on public.price_snapshots;
create policy "price_snapshots_own"
  on public.price_snapshots
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "outbound_clicks_own" on public.outbound_clicks;
create policy "outbound_clicks_own"
  on public.outbound_clicks
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "user_billing_state_own" on public.user_billing_state;
create policy "user_billing_state_own"
  on public.user_billing_state
  for select
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id);
