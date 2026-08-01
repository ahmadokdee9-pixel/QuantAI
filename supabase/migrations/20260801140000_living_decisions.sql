-- Living Decisions: permanent decision_id + snapshot fields (safe / idempotent).

alter table public.decision_memory
  add column if not exists decision_id uuid,
  add column if not exists rating numeric,
  add column if not exists provider text,
  add column if not exists stock_state text;

-- Backfill decision_id: one stable id per (user_id, coalesce(memory_identity, product_link))
with threads as (
  select
    user_id,
    coalesce(nullif(memory_identity, ''), product_link) as thread_key,
    (array_agg(id order by created_at asc))[1] as first_id,
    gen_random_uuid() as living_id
  from public.decision_memory
  where decision_id is null
  group by user_id, coalesce(nullif(memory_identity, ''), product_link)
)
update public.decision_memory dm
set decision_id = threads.living_id
from threads
where dm.user_id = threads.user_id
  and coalesce(nullif(dm.memory_identity, ''), dm.product_link) = threads.thread_key
  and dm.decision_id is null;

create index if not exists decision_memory_user_decision_id_created_idx
  on public.decision_memory (user_id, decision_id, created_at desc);

create index if not exists decision_memory_decision_id_idx
  on public.decision_memory (decision_id)
  where decision_id is not null;
