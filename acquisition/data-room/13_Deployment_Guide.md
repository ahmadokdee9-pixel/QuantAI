# 13 — Deployment Guide

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

## Target

Repository is oriented to **Vercel** hosting of Next.js (`vercel.json` cron, `.vercel/` linkage, production-validation workflow using `SEARCH_BASE_URL`). Other Node hosts that run Next.js 16 may work; in-repo runbooks emphasize Vercel.

---

## Prerequisites

1. Node.js **20+** (CI uses 20)  
2. `npm ci`  
3. Env vars per `.env.example` / `docs/ENVIRONMENT.md`  
4. Apply all **7** Supabase migrations  
5. Clerk application  
6. `SERPAPI_KEY` for search  
7. Optional: Stripe, OpenAI, Upstash, analytics sink, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`  

---

## Commands

```bash
npm ci
npm run env:check          # when used
npm run env:pull           # Vercel-authenticated safe merge only
npm run dev
npm run build && npm run start
```

**Do not** use bare `vercel env pull .env.local` (can write empty secrets) — project rule in `AGENTS.md` / env docs.

---

## Env classes (names only — no values)

| Class | Examples |
|-------|----------|
| Core demo | `SERPAPI_KEY`, Clerk keys, Supabase URL + service role |
| AI surfaces | `OPENAI_API_KEY` |
| Billing | `STRIPE_SECRET_KEY`, webhook secret, price IDs |
| Ops | `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, Upstash URL/token |
| Flags | Most `QUANTAI_*_ENABLED` default OFF; beta stabilization ON in production when unset |

---

## Verify after deploy

| Check | How |
|-------|-----|
| Health | `GET /api/health` |
| Search | `/api/search?q=…` returns products when SerpAPI configured |
| Auth | Sign-in → `/dashboard` |
| Billing | Only with real Stripe keys |
| Cron | Vercel cron + secret |

Probe scripts exist (e.g. beta smoke/latency) taking `SEARCH_BASE_URL`.

---

## Rollback

Vercel deployment rollback / git revert. Operational recommendation during sale: freeze Phase A + calibration behavior.
