# 7. Technology Stack

---

## Application stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, component library under `components/` |
| Language | TypeScript |
| Validation | Zod (representative) |
| Motion / icons | Framer Motion, Lucide (representative) |

Package name in repo: `smartbuy` (private). Product brand: **QuantAI**.

---

## Platform & services

| Service | Role | Criticality |
|---------|------|-------------|
| Vercel | Typical hosting / deploy target | High (current ops) |
| Clerk | Authentication / sessions | High for full product |
| Supabase | Postgres persistence, migrations | High for continuity features |
| Stripe | Subscriptions / checkout / portal / webhooks | Medium (monetization) |
| SerpAPI | Product discovery upstream | **Critical for search** |
| OpenAI | Compare / copilot / optional AI | High for AI surfaces |
| Upstash Redis | Distributed rate limits (optional) | Recommended for multi-instance |

---

## Data

- SQL migrations under `supabase/migrations/`  
- Approximate footprint: **16 tables** across **7 migrations** (search history, saved products, memory, watchlist, observations/SKU-related structures, etc.)  
- Auth is **Clerk**, not Supabase Auth  

---

## Engineering & quality tooling

| Area | Notes |
|------|-------|
| Scripts | Large `test:*` inventory in `package.json` |
| Acquisition gates | Phase A, calibration, Phase 4, merchant diversity, P0, build/tsc |
| CI | Present; runs a **subset** of the full script inventory — do not equate CI with full corpus |
| Env safety | `npm run env:pull` safe merge; `.env.example` template; secrets gitignored |

---

## What is proprietary vs commodity

| Proprietary (product IP) | Commodity |
|--------------------------|-----------|
| Search orchestration & decision pipeline | Next.js / React |
| Phase A + calibration + diversity + discount gating | Clerk / Supabase / Stripe |
| Truth / RDR models & product surface wiring | SerpAPI / OpenAI / Upstash / Vercel |

---

## Lock-in realism

Migration off any single vendor is possible but **not trivial**. Diligence should budget weeks (not days) for meaningful platform moves, especially away from SerpAPI discovery semantics.
