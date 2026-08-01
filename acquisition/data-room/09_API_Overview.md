# 09 — API Overview

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).  
**21** handlers: `app/api/**/route.ts`.

---

## Catalog

### Search & decisions

| Methods | Path | Auth |
|---------|------|------|
| GET, POST | `/api/search` | Public (optional Clerk) |
| POST | `/api/search/save-product` | Required |
| POST | `/api/search/compare-verdict` | Required |

### Intelligence / continuity

| Methods | Path | Auth |
|---------|------|------|
| GET | `/api/intelligence/search-history` | Required |
| GET | `/api/intelligence/compare-history` | Required |
| GET, PUT | `/api/intelligence/user-memory` | Required |
| GET, DELETE | `/api/intelligence/saved-products` | Required |
| GET, POST, PATCH, DELETE | `/api/intelligence/watchlist` | Required |
| GET, POST | `/api/intelligence/collections` | Required |
| POST | `/api/intelligence/collections/[id]/items` | Required |

### Billing

| Methods | Path | Auth |
|---------|------|------|
| POST | `/api/stripe/checkout` | Required |
| POST | `/api/stripe/portal` | Required |
| POST | `/api/stripe/webhook` | Stripe signature |
| GET | `/api/billing/subscription` | Required |

### AI

| Methods | Path | Auth |
|---------|------|------|
| POST | `/api/ai-chat` | Required |
| POST | `/api/copilot/chat` | Guest allowed (rate-limited) |

### Platform

| Methods | Path | Auth |
|---------|------|------|
| GET | `/api/health` | Public |
| POST | `/api/feedback` | Optional auth; persistence best-effort |
| POST | `/api/analytics/event` | Tolerates missing auth |
| GET | `/api/outbound` | Outbound redirect/tracking |
| GET | `/api/cron/refresh-listings` | `Authorization: Bearer ${CRON_SECRET}` |

---

## Patterns

- JSON helpers under `lib/api/`  
- Clerk `auth()` / `currentUser()`  
- Supabase admin for writes  
- Heaviest endpoint: `/api/search`

---

## Health payload shape (evidenced)

`GET /api/health` returns `ok`, `ts`, `services.{clerk,supabase,serpapi,openai,stripe,upstash}`, and `warnings` (e.g. missing Upstash in production).

---

## Scale drivers

| Class | Driver |
|-------|--------|
| `/api/search` | SerpAPI + enrichment/rank CPU |
| Intelligence CRUD | Postgres |
| Stripe webhook | Sync to `user_billing_state` |
| Cron | Daily refresh worker |
