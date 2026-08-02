-- QuantAI Decision Agent — Missions (safe / idempotent).

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  goal text,
  budget numeric,
  deadline date,
  priority text not null default 'important',
  status text not null default 'active',
  template_id text,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missions_user_updated_idx
  on public.missions (user_id, updated_at desc);

create index if not exists missions_user_status_idx
  on public.missions (user_id, status, updated_at desc);

create table if not exists public.mission_decisions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id text not null,
  group_key text not null,
  group_label text not null,
  title text not null,
  domain text not null default 'product',
  status text not null default 'pending',
  priority text not null default 'important',
  search_query text,
  product_link text,
  decision_id text,
  memory_identity text,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mission_decisions_mission_sort_idx
  on public.mission_decisions (mission_id, sort_order asc, created_at asc);

create index if not exists mission_decisions_user_idx
  on public.mission_decisions (user_id, updated_at desc);

create index if not exists mission_decisions_decision_id_idx
  on public.mission_decisions (decision_id)
  where decision_id is not null;

alter table public.missions enable row level security;
alter table public.mission_decisions enable row level security;

drop policy if exists "missions_own" on public.missions;
create policy "missions_own"
  on public.missions
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "mission_decisions_own" on public.mission_decisions;
create policy "mission_decisions_own"
  on public.mission_decisions
  for all
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);
