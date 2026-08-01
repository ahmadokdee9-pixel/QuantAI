-- Forward migration: make Decision Memory domain-independent (safe / idempotent).

alter table public.decision_memory
  add column if not exists domain text not null default 'product';
  add column if not exists memory_identity text,
  add column if not exists contextual_verb text,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists source_freshness_at timestamptz,
  add column if not exists outcome jsonb;

-- Backfill memory_identity from product_link when missing
update public.decision_memory
set memory_identity = product_link
where memory_identity is null;

create index if not exists decision_memory_user_domain_created_idx
  on public.decision_memory (user_id, domain, created_at desc);

create index if not exists decision_memory_user_identity_created_idx
  on public.decision_memory (user_id, memory_identity, created_at desc);
