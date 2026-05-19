# QuantAI environment

How environment variables are organized, recovered, and protected.

## Quick recovery (lost `.env.local`)

**Diagnosis:** Variable *names* may still exist in Vercel while **values are empty** (`""`). `vercel env pull` cannot restore wiped secrets — you must re-enter values in each provider dashboard, then paste into Vercel and `.env.local`.

### 1. Re-enter secrets (provider dashboards)

| Variable | Where to get a new value |
|----------|--------------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → your app → **API Keys** |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Supabase Dashboard](https://supabase.com/dashboard) → Project → **Settings → API** |
| `SERPAPI_KEY` | [SerpApi Dashboard](https://serpapi.com/manage-api-key) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `STRIPE_*` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |

### 2. Sync to Vercel + local

1. Vercel → **quant-ai** → **Settings → Environment Variables** → edit each key (Production + Preview).
2. Copy the same values into `.env.local` (start from `.env.example`).
3. Run `npm run env:check` — must pass before `npm run dev` / `npm run build`.

```bash
cp .env.example .env.local   # then paste values
npm run env:check
npm run dev
```

Optional merge from Vercel (only imports **non-empty** values, never overwrites good local values):

```bash
npm run env:sync
```

---

## System dependency map

| Key | Systems | Required locally |
|-----|---------|------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth UI, session | **Yes** |
| `CLERK_SECRET_KEY` | Auth API routes, search tier | **Yes** |
| `NEXT_PUBLIC_SUPABASE_URL` | Saved products, watchlist, history, compare | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Server persistence (never expose to client) | **Yes** |
| `SERPAPI_KEY` | Google Shopping search, live discovery | **Yes** |
| `OPENAI_API_KEY` | Compare verdict, AI chat, commerce AI batch, **production build** | **Yes** |
| `NEXT_PUBLIC_APP_URL` | Stripe return URLs, metadata | Recommended (`http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Future client reads only | Optional |
| `STRIPE_*` | Checkout, portal, webhooks | Optional for billing smoke tests |
| `UPSTASH_REDIS_*` | Per-user rate limits | Optional (in-memory fallback) |
| `QUANTAI_ANALYTICS_SINK_URL` | Server analytics forward | Optional |

### Search

- **`SERPAPI_KEY`** — without it, `POST /api/search` returns 503 JSON (`Search is temporarily unavailable`).
- Optional tuning: `SERPAPI_SHOPPING_GL`, `SERPAPI_SHOPPING_NUM`, `DISCOVERY_*`, `QUANTAI_LIVE_DISCOVERY*`.

### Auth (Clerk)

- **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** + **`CLERK_SECRET_KEY`** — both required for sign-in and protected routes.
- Never prefix `CLERK_SECRET_KEY` with `NEXT_PUBLIC_`.

### Supabase

- **`NEXT_PUBLIC_SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** — saved products, watchlist, search history, compare sessions.
- Apply migrations in `supabase/migrations/`.

### AI

- **`OPENAI_API_KEY`** — compare verdict, copilot, batched commerce analysis.
- OpenAI client modules initialize at import time; missing key breaks `next build` even if runtime would fallback.

---

## Protection (never lose env again)

1. **`.env.example`** — committed template (no secrets). Copy to `.env.local`.
2. **`npm run env:pull`** — safe Vercel → local sync:
   - Backs up `.env.local` before any change
   - **Never** overwrites non-empty local values with empty `""` from CLI
   - **Never** writes to Vercel (read-only)
3. **`npm run env:check`** — runs before `dev` and `build`; fails fast with missing key names.
4. **`instrumentation.ts`** — server boot logs missing keys in development.
5. **`.gitignore`** — `.env.local` never committed; `.env.example` is tracked.

### If `vercel env pull` shows `KEY=""`

Vercel often stores secrets as **Sensitive** or empty CLI placeholders. Production deployments may still run with build-time env while `env pull` cannot decrypt values locally. **Do not run raw `vercel env pull` without the safe script** — it can wipe local values. Use:

```bash
npm run env:pull
```

If checks still fail, open Vercel → **quant-ai** → **Settings → Environment Variables**, edit each key (Production + Preview), paste the value from the provider dashboard, save, then run `npm run env:pull` again.

---

## Security

- Do not commit `.env.local`, `.env.production`, or Vercel pull artifacts.
- Rotate keys if leaked; update Vercel and re-run `npm run env:sync`.
- Server-only: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SERPAPI_KEY`.

See also: `PRODUCTION_CHECKLIST.md`, `.env.example`.
