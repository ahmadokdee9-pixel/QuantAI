-- QuantAI Decision Memory — persist decision episodes, watch flags, and visit markers.

create table if not exists public.decision_memory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  search_query text,
  product_id text,
  product_link text not null,
  product_title text,
  merchant text,
  image text,
  decision text not null,
  confidence numeric,
  price numeric,
  score numeric,
  reasons jsonb not null default '[]'::jsonb,
  availability text,
  watched boolean not null default false,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists decision_memory_user_created_idx
  on public.decision_memory (user_id, created_at desc);

create index if not exists decision_memory_user_link_created_idx
  on public.decision_memory (user_id, product_link, created_at desc);

create index if not exists decision_memory_user_watched_idx
  on public.decision_memory (user_id, watched, created_at desc)
  where watched = true;

create table if not exists public.decision_visit_state (
  user_id text primary key,
  last_visit_at timestamptz,
  last_updates_seen_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.decision_memory enable row level security;
alter table public.decision_visit_state enable row level security;

drop policy if exists "decision_memory_own" on public.decision_memory;
create policy "decision_memory_own"
  on public.decision_memory
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "decision_visit_state_own" on public.decision_visit_state;
create policy "decision_visit_state_own"
  on public.decision_visit_state
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);
