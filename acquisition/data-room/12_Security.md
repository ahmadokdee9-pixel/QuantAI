# 12 — Security

Canonical facts: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

---

## Authentication

| Control | Evidence |
|---------|----------|
| IdP | Clerk (`@clerk/nextjs`) |
| Provider wrap | `ClerkProvider` in `app/layout.tsx` |
| Page protect | `proxy.ts` — `auth.protect()` on `/dashboard`, `/saved`, `/billing`, `/alerts`, `/analytics` |
| API identity | `auth()` / `currentUser()`; 401 when required |

Public by design: marketing/legal pages and `/api/search` (plus other non-protected APIs as catalogued).

---

## Secrets

| Practice | Evidence |
|----------|----------|
| Templates only in git | `.env.example` |
| Local secrets gitignored | `.gitignore` `.env*` patterns |
| Safe Vercel→local merge | `scripts/pull-env-safe.mjs` |
| CI placeholders | `.github/workflows/ci.yml` |

Never commit production secrets; rotate at transfer ([16](./16_Transfer_Checklist.md)).

---

## Controls

| Area | Implementation |
|------|----------------|
| Stripe webhooks | Signature verification |
| Cron | Shared bearer secret |
| Search abuse | Guest/auth limits via `searchAbuseProtection` + `rate-limit` |
| Input validation | Zod schemas on multiple routes (e.g. feedback) |
| Legal pages | `/legal/[slug]` policy set |

---

## Data

- Continuity tables in Supabase; RLS asserted in migrations  
- Service role bypasses RLS — handlers must scope by Clerk `userId`  
- Billing sync writes `user_billing_state`  

---

## Caveats (honest)

1. In-memory rate-limit fallback is weak across serverless isolates without Upstash  
2. Service-role misuse impact is high if a handler forgets authz  
3. Dormant flags must stay OFF unless reviewed  
4. `/api/feedback` may not persist without a migration for `quantai_feedback`  

---

## IP file

`LICENSE` is a proprietary All Rights Reserved **draft**; public use is not granted by that file alone. Transfer via acquisition agreement. See `docs/IP_AND_OWNERSHIP.md`.
