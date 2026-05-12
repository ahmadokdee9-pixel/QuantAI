-- QuantAI: search_history + user_shopping_memory (idempotent) with RLS.
-- Next.js API routes use the Supabase service role key, which bypasses RLS.
-- Policies below allow direct Supabase client access when JWT `sub` matches `user_id`
-- (e.g. Clerk via Supabase Third-Party Auth). Anon remains blocked unless policies match.

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  query text not null,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists search_history_user_created_idx
  on public.search_history (user_id, created_at desc);

create index if not exists search_history_user_id_idx
  on public.search_history (user_id);

create table if not exists public.user_shopping_memory (
  user_id text primary key,
  memory jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_shopping_memory_updated_idx
  on public.user_shopping_memory (updated_at desc);

alter table public.search_history enable row level security;
alter table public.user_shopping_memory enable row level security;

drop policy if exists "search_history_select_own" on public.search_history;
drop policy if exists "search_history_insert_own" on public.search_history;
drop policy if exists "search_history_delete_own" on public.search_history;

create policy "search_history_select_own"
  on public.search_history
  for select
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id);

create policy "search_history_insert_own"
  on public.search_history
  for insert
  to authenticated
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

create policy "search_history_delete_own"
  on public.search_history
  for delete
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id);

drop policy if exists "user_memory_select_own" on public.user_shopping_memory;
drop policy if exists "user_memory_insert_own" on public.user_shopping_memory;
drop policy if exists "user_memory_update_own" on public.user_shopping_memory;

create policy "user_memory_select_own"
  on public.user_shopping_memory
  for select
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id);

create policy "user_memory_insert_own"
  on public.user_shopping_memory
  for insert
  to authenticated
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);

create policy "user_memory_update_own"
  on public.user_shopping_memory
  for update
  to authenticated
  using (coalesce((select auth.jwt()->>'sub'), '') = user_id)
  with check (coalesce((select auth.jwt()->>'sub'), '') = user_id);
