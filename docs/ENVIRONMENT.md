# QuantAI environment

Buyer-quality setup guide. **Never commit real secrets.** Template: `.env.example`.  
Related: `docs/ACCESS_AND_SECRETS_HANDOVER.md`, `docs/IP_AND_OWNERSHIP.md`, `docs/PRODUCTION_ENV_MANIFEST.md`.

Safe sync from Vercel (never wipe local secrets with empty CLI values):

```bash
npm run env:pull
# alias: npm run env:sync
```

Validate before `dev` / `build`:

```bash
npm run env:check
```

---

## Variable classes

### REQUIRED FOR CORE DEMO

Minimum to run guest search + show product cards with ranking/labels on a staging or production URL.

| Variable | Purpose |
|----------|---------|
| `SERPAPI_KEY` | Shopping listings — without it search fails/empties |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth UI / app shell |
| `CLERK_SECRET_KEY` | Server auth / search entitlements |
| `NEXT_PUBLIC_SUPABASE_URL` | Persistence client target |
| `SUPABASE_SERVICE_ROLE_KEY` | Server persistence (saved, history, observations) |
| `OPENAI_API_KEY` | Compare / AI surfaces; also needed for clean production `next build` in current wiring |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs, Stripe returns, metadata (`http://localhost:3000` locally) |

Apply SQL in `supabase/migrations/` to the Supabase project before relying on saved/history/truth tables.

### REQUIRED FOR FULL PRODUCT

Everything in **CORE DEMO**, plus:

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Checkout |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `STRIPE_PRICE_ID_PRO` | Pro plan price |
| `STRIPE_PRICE_ID_PREMIUM` | Premium plan price |
| `CRON_SECRET` | Authorize `/api/cron/refresh-listings` |

Production checklist: live Clerk/Stripe keys, webhook URL pointed at production, domain on Vercel.

### OPTIONAL (recommended for production)

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limits (else in-memory fallback) |
| `QUANTAI_ANALYTICS_SINK_URL` | Forward analytics events |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Only if client-side Supabase reads are added later |
| Search tuning | `SEARCH_*`, `DISCOVERY_*`, `QUANTAI_SEARCH_*`, `QUANTAI_BETA_STABILIZATION`, `QUANTAI_SEARCH_STALE_PREFER_MS` — see `.env.example` |

**Beta production defaults** (when `QUANTAI_BETA_STABILIZATION` is on / production): heuristic commerce AI, capped discovery, stale-tray prefer (~3.5s) if live enrichment is slow. These protect demos; they do **not** change Phase A ranking semantics.

### DEVELOPMENT ONLY

| Item | Notes |
|------|-------|
| `.env.local` | Local secrets — gitignored |
| Placeholder CI env | `.github/workflows/ci.yml` placeholders — not production |
| `STRIPE_CUSTOMER_ID_PLACEHOLDER` | Local portal smoke only |
| Feature flags `QUANTAI_*_ENABLED` / APPLY / canary | Default **OFF** — do not enable for acquisition demos |

---

## Quick recovery (lost `.env.local`)

**Diagnosis:** Variable *names* may still exist in Vercel while **values are empty** (`""`). Raw `vercel env pull` can wipe local secrets — **never** use bare pull; use `npm run env:pull` only.

### 1. Re-enter secrets (provider dashboards)

| Variable | Where to get a new value |
|----------|--------------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | [Supabase](https://supabase.com/dashboard) → Settings → API |
| `SERPAPI_KEY` | [SerpApi](https://serpapi.com/manage-api-key) |
| `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com/api-keys) |
| `STRIPE_*` | [Stripe](https://dashboard.stripe.com/apikeys) |

### 2. Sync to Vercel + local

1. Vercel → project → **Settings → Environment Variables** (Production + Preview).  
2. Copy into `.env.local` from `.env.example`.  
3. `npm run env:check` must pass.

```bash
cp .env.example .env.local   # then paste values
npm run env:check
npm run dev
```

---

## System dependency map

| Key | Systems | Core demo |
|-----|---------|-----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth UI | Yes |
| `CLERK_SECRET_KEY` | Auth API, search tier | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Persistence | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server persistence (never `NEXT_PUBLIC_`) | Yes |
| `SERPAPI_KEY` | Search / discovery | Yes |
| `OPENAI_API_KEY` | Compare / AI / build | Yes |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs | Yes (recommended) |
| `STRIPE_*` | Billing | Full product |
| `UPSTASH_REDIS_*` | Rate limits | Optional |
| `QUANTAI_ANALYTICS_SINK_URL` | Analytics | Optional |
| `CRON_SECRET` | Refresh cron | Full product |

### Search

- Without `SERPAPI_KEY`, `POST /api/search` fails or returns unavailable.  
- Optional: `SERPAPI_SHOPPING_GL`, discovery timeouts, stale-prefer — `.env.example`.

### Auth (Clerk)

- Never prefix `CLERK_SECRET_KEY` with `NEXT_PUBLIC_`.

### Supabase

- Apply `supabase/migrations/` via CLI or SQL editor.

### AI

- OpenAI modules initialize at import; missing key can break `next build` even when runtime heuristic AI is preferred for search enrichment.

---

## Protection (never lose env again)

1. **`.env.example`** — committed template (no secrets).  
2. **`npm run env:pull`** — safe Vercel → local merge (backs up; never overwrites good locals with `""`).  
3. **`npm run env:check`** — fails fast on missing required keys.  
4. **`.gitignore`** — `.env.local` never committed.

See also: `docs/PRODUCTION_ENV_CHECKLIST.md`, `docs/ACCESS_AND_SECRETS_HANDOVER.md`.

## Security

- Do not commit `.env.local`, `.env.production`, or decrypted pull artifacts.  
- Rotate keys if leaked; update Vercel and re-run `npm run env:sync`.  
- Server-only: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SERPAPI_KEY`, `CRON_SECRET`.
