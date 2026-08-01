# 03 — Features

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).  
Classification aligns with `docs/LIVE_CAPABILITY_MAP.md`.

Features listed are **implemented in source**. Runtime depends on env credentials and flags.

---

## A. LIVE core

| Feature | Evidence |
|---------|----------|
| Multi-merchant search | `GET`/`POST` `/api/search`; SerpAPI fetch under `app/api/search/lib/` |
| Bounded live discovery | `lib/intelligence/liveCommerceDiscovery.ts` |
| Product enrichment | `lib/intelligence/enrichProducts.ts` |
| Phase A canonical ranking | `lib/truth/canonicalSearchRank.ts` |
| Decision calibration | `lib/ui/canonicalDecisionCalibration.ts` — labels `BUY` / `STRONG BUY` / `BEST VALUE` / `COMPARE` / `AVOID` |
| Merchant diversity | `lib/search/merchantDiversityRerank.ts` |
| Results / compare UI | `components/search/*` (17 `.tsx` files) |
| Stabilization helpers | `lib/search/productionStabilization*.ts`, reliability guardrails |
| Auth | Clerk — `ClerkProvider`, `proxy.ts` |
| Persistence APIs | `/api/intelligence/*` + `lib/supabaseAdmin.ts` |
| Stripe subscriptions | `/api/stripe/checkout`, `portal`, `webhook` |
| Health | `GET /api/health` → `{ ok, ts, services{clerk,supabase,serpapi,openai,stripe,upstash}, warnings }` |

---

## B. LIVE supporting

| Feature | Evidence / caveat |
|---------|-------------------|
| Heuristic commerce AI | Env-gated; see LIVE map |
| OpenAI compare / AI chat / copilot | `/api/search/compare-verdict`, `/api/ai-chat`, `/api/copilot/chat`; needs `OPENAI_API_KEY` |
| Rate limiting | `lib/rate-limit.ts` — Upstash if configured, else in-memory |
| Cron refresh | `/api/cron/refresh-listings` + `CRON_SECRET`; schedule in `vercel.json` |
| Analytics **events** API | `POST /api/analytics/event` (optional sink) — distinct from `/analytics` page |
| Outbound | `GET /api/outbound` |
| Feedback API | `POST /api/feedback` — inserts `quantai_feedback` **if** table exists; otherwise acknowledges with `stored: false` (table **not** in migrations) |

---

## C. Auth continuity features

| Feature | Surface |
|---------|---------|
| Saved products | `/saved`, `/api/intelligence/saved-products`, `/api/search/save-product` |
| Watchlist / alerts UI | `/api/intelligence/watchlist`, `/alerts` |
| Collections | `/api/intelligence/collections` (+ items) |
| Search / compare history | `/api/intelligence/search-history`, `compare-history` |
| User memory | `/api/intelligence/user-memory` |
| Compare verdict | `/api/search/compare-verdict` |

---

## D. Subscription matrix (coded)

Source: `lib/subscription/plans.ts` (`QUANT_PLANS`).

| Tier id | Display name | € / month | Searches / day | AI turns / day | Watchlist max | Saved max | Compare max |
|---------|--------------|----------:|---------------:|---------------:|--------------:|----------:|------------:|
| `free` | Free | 0 | 20 | 12 | 8 | 15 | 3 |
| `pro` | Pro | 19 | 120 | 80 | 60 | unlimited (`null`) | 3 |
| `premium` | Power Buyer | 49 | 400 | 250 | unlimited (`null`) | unlimited (`null`) | 3 |

Soft caps depend on instrumentation (e.g. `search_history`) as noted in plan comments.

---

## E. DORMANT (default OFF)

Flag-gated modules (examples): identity foundation, trust engine, commerce memory foundation, recommendation cognition, autonomous commerce OS / evolution / brain / strategy, emotional / universal intelligence, normalization APPLY, controlled activation.  

**Inventory ≠ live product.**

---

## F. Shadow experiment (default OFF)

`QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE` — `lib/search/canonicalResponseCache.ts` (Upstash / file / memory). Not part of default product claims.

---

## Explicit non-features / incomplete UI

| Item | Reality |
|------|---------|
| `/analytics` page | Placeholder messaging only — not portfolio analytics |
| `quantai_feedback` table | Referenced by API; **absent** from SQL migrations |
