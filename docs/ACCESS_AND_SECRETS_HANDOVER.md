# QuantAI — Access and Secrets Handover

**Purpose:** Acquisition transfer of credentials and access — **never commit real secret values**.  
**Secret-safety audit date:** 2026-07-25 (Sprint 1)  
**Related:** `.env.example`, `docs/ENVIRONMENT.md`, `docs/IP_AND_OWNERSHIP.md`

---

## Secret-safety audit result

| Check | Result |
|-------|--------|
| Tracked env files | Only `.env.example` (empty placeholders) |
| `.env.local` gitignored | Yes (`.gitignore`: `.env*`, `!.env.example`) |
| Hardcoded live API keys in source | **Not found** in Sprint 1 scan |
| CI placeholders | Use fake placeholders only (`.github/workflows/ci.yml`) |

**STOP rule:** If a real production secret is discovered in git history or a tracked file, **do not print it**. Rotate immediately in the provider dashboard, purge from history with counsel/ops guidance, and update Vercel + local env.

**No STOP condition triggered in Sprint 1 scan.**

---

## Handover inventory

### 1. Git repository

| Field | Detail |
|-------|--------|
| **Purpose** | Source of truth for QuantAI (`smartbuy` package) |
| **Required/Optional** | Required |
| **Env vars** | N/A |
| **Where configured** | GitHub/Git host org |
| **Transfer method** | Transfer repo ownership or grant admin + export |
| **Rotation** | Rotate deploy keys / PATs at closing |
| **Buyer action** | Accept transfer; verify branch protection |
| **Seller action** | Initiate transfer; remove personal deploy keys post-close |

### 2. Domain / DNS

| Field | Detail |
|-------|--------|
| **Purpose** | Public hostname for app + Stripe redirects |
| **Required/Optional** | Required for production demo |
| **Env vars** | `NEXT_PUBLIC_APP_URL` |
| **Where configured** | DNS registrar + Vercel Domains |
| **Transfer method** | Registrar transfer or update nameservers |
| **Rotation** | N/A (DNS) |
| **Buyer action** | Control DNS; set `NEXT_PUBLIC_APP_URL` |
| **Seller action** | Unlock domain; provide registrar login or transfer auth code |

### 3. Vercel

| Field | Detail |
|-------|--------|
| **Purpose** | Hosting, preview, env vars, `unstable_cache` pipeline cache |
| **Required/Optional** | Required (current architecture) |
| **Env vars** | All production secrets (see below); `VERCEL_URL` auto |
| **Where configured** | Vercel project (docs reference **quant-ai**) |
| **Transfer method** | Transfer project/team or redeploy from Git |
| **Rotation** | Re-enter all secrets after transfer |
| **Buyer action** | Own project; Production + Preview env complete |
| **Seller action** | Transfer project or provide export + env list (values via secure channel) |

### 4. Clerk

| Field | Detail |
|-------|--------|
| **Purpose** | Auth UI, sessions, protected routes, search tier resolution |
| **Required/Optional** | Required for signed-in product; guest search may work without user |
| **Env vars** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| **Where configured** | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys; Vercel + `.env.local` |
| **Transfer method** | Transfer Clerk organization / application |
| **Rotation** | **Required at closing** — issue new keys |
| **Buyer action** | Update keys; set production redirect URLs |
| **Seller action** | Transfer app; revoke old keys after buyer confirms |

### 5. Supabase

| Field | Detail |
|-------|--------|
| **Purpose** | Persistence: saved products, watchlist, history, compare, truth observations |
| **Required/Optional** | Required for full product; core guest search can demo without some tables |
| **Env vars** | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (optional: `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| **Where configured** | Supabase project Settings → API |
| **Transfer method** | Transfer project or `supabase db` migrate + data export |
| **Rotation** | **Required** — rotate service role key |
| **Buyer action** | Apply `supabase/migrations/`; verify RLS |
| **Seller action** | Transfer or provide dump + revoke old service role |

### 6. SerpAPI

| Field | Detail |
|-------|--------|
| **Purpose** | Upstream shopping listings — **without it search returns empty/503** |
| **Required/Optional** | **Required for core demo** |
| **Env vars** | `SERPAPI_KEY` (optional: `SERPAPI_SHOPPING_GL`, `SERPAPI_SHOPPING_NUM`) |
| **Where configured** | [serpapi.com](https://serpapi.com/manage-api-key) |
| **Transfer method** | Transfer account or buyer creates new key |
| **Rotation** | **Required at closing** |
| **Buyer action** | Confirm quota + 70%/90% alerts (`docs/SERPAPI_OPENAI_COST_ALERTS.md`) |
| **Seller action** | Transfer or hand off billing; revoke old key |

### 7. OpenAI

| Field | Detail |
|-------|--------|
| **Purpose** | Compare verdict, copilot/ai-chat, optional commerce AI batch; build-time client init |
| **Required/Optional** | Required for full AI surfaces; search path can use heuristic commerce AI in beta |
| **Env vars** | `OPENAI_API_KEY` (+ optional model env vars documented in `.env.example`) |
| **Where configured** | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Transfer method** | New project/key preferred |
| **Rotation** | **Required** |
| **Buyer action** | Set monthly budget cap |
| **Seller action** | Revoke old keys after cutover |

### 8. Stripe

| Field | Detail |
|-------|--------|
| **Purpose** | Checkout, customer portal, webhooks, plan entitlements |
| **Required/Optional** | Optional for guest search demo; required for monetization |
| **Env vars** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PREMIUM` |
| **Where configured** | Stripe Dashboard + webhook endpoint on `/api/stripe/webhook` |
| **Transfer method** | Account transfer or recreate products/prices |
| **Rotation** | **Required** (live keys) |
| **Buyer action** | Point webhook to production URL; use live price IDs |
| **Seller action** | Transfer or document price ID mapping |

### 9. Upstash Redis

| Field | Detail |
|-------|--------|
| **Purpose** | Distributed rate limiting / shared cache |
| **Required/Optional** | **Optional** — in-memory fallback exists (weaker on multi-instance) |
| **Env vars** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Where configured** | Upstash console |
| **Transfer method** | Transfer database or recreate |
| **Rotation** | Rotate token if transferring |
| **Buyer action** | Strongly recommended for production |
| **Seller action** | Document whether currently enabled in production |

### 10. Analytics sink

| Field | Detail |
|-------|--------|
| **Purpose** | Forward analytics events |
| **Required/Optional** | Optional |
| **Env vars** | `QUANTAI_ANALYTICS_SINK_URL` |
| **Where configured** | Buyer’s analytics provider |
| **Transfer method** | New sink URL |
| **Rotation** | As needed |
| **Buyer action** | Wire or leave unset |
| **Seller action** | Disclose if used |

### 11. Cron / scheduled jobs

| Field | Detail |
|-------|--------|
| **Purpose** | Listing refresh worker |
| **Required/Optional** | Optional for core demo |
| **Env vars** | `CRON_SECRET` (authorizes `/api/cron/refresh-listings`) |
| **Where configured** | Vercel Cron / external scheduler + env |
| **Transfer method** | Recreate schedule; new secret |
| **Rotation** | **Required** |
| **Buyer action** | Confirm cron hits production with `Authorization` / secret as implemented |
| **Seller action** | Document schedule + secret location |

### 12. GitHub Actions (CI / production validation)

| Field | Detail |
|-------|--------|
| **Purpose** | CI build/lint/subset tests; optional live probes |
| **Required/Optional** | Optional for runtime; required for diligence credibility |
| **Env vars / secrets** | Workflow placeholders locally; live workflow may use `SEARCH_BASE_URL` secret |
| **Where configured** | `.github/workflows/*`, GitHub repo Secrets |
| **Transfer method** | Repo transfer includes workflows; re-set secrets |
| **Rotation** | Rotate any PATs |
| **Buyer action** | Set `SEARCH_BASE_URL` for production-validation workflow if used |
| **Seller action** | Remove personal tokens |

---

## Environment variable quick index (names only)

**Core demo:**  
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SERPAPI_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`

**Full product:**  
All of the above + `STRIPE_*`, `CRON_SECRET`, migrations applied

**Optional:**  
`UPSTASH_REDIS_*`, `QUANTAI_ANALYTICS_SINK_URL`, search tuning flags in `.env.example`

**Never prefix with `NEXT_PUBLIC_`:**  
`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `SERPAPI_KEY`, `CRON_SECRET`, Upstash tokens

---

## Seller closing checklist (secrets)

1. Inventory every production key in Vercel (Production + Preview).  
2. Transfer vendor accounts **or** schedule cutover with new buyer keys.  
3. Rotate all secrets after buyer confirms green deploy.  
4. Revoke seller personal access to Clerk/Supabase/Stripe/SerpAPI/OpenAI/Vercel.  
5. Confirm `.env.local` and backups are not left on shared machines.
