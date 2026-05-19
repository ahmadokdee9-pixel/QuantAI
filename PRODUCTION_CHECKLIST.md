# QuantAI production checklist

Use this before pointing a custom domain at production traffic. It covers environment variables, data stores, payments, hosting, and smoke tests. **Do not commit secrets**; configure them in Vercel (or your host) and in Clerk/Stripe/Supabase dashboards.

---

## 1. Required environment variables

Copy `.env.example` to `.env.local` locally. In Vercel: **Project → Settings → Environment Variables** (set for Production; mirror Preview if needed).

**Local recovery:** Vercel Development env may be empty — run `npm run env:sync` to pull Production keys into `.env.local`. See `docs/ENVIRONMENT.md`.

| Area | Variable | Notes |
|------|-----------|--------|
| **App URL** | `NEXT_PUBLIC_APP_URL` | Canonical HTTPS origin (e.g. `https://quantai.example`). Used for Stripe return URLs and `metadataBase`. Falls back to `https://{VERCEL_URL}` on Vercel if unset. |
| **Clerk** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Safe for the browser. |
| **Clerk** | `CLERK_SECRET_KEY` | **Server only.** Never `NEXT_PUBLIC_*`. |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` | Project URL. |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used by API routes; never expose to the client. |
| **Stripe** | `STRIPE_SECRET_KEY` | **Server only.** |
| **Stripe** | `STRIPE_WEBHOOK_SECRET` | Signing secret from Stripe webhook endpoint. |
| **Stripe** | `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PREMIUM` | Price IDs for Checkout line items. |
| **Search** | `SERPAPI_KEY` | Google Shopping via SerpApi; without it search returns a JSON error (no HTML). |
| **AI** | `OPENAI_API_KEY` | Optional; AI chat and compare verdict use fallbacks or errors as JSON when missing. |

**Optional**

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — per-user rate limits when both set.
- `QUANTAI_ANALYTICS_SINK_URL` — optional server-side forward for client analytics events.
- `STRIPE_CUSTOMER_ID_PLACEHOLDER` — local/single-user Customer Portal testing only; production should map Clerk users to Stripe customer IDs in your database.

**Security**

- Never prefix `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or `STRIPE_WEBHOOK_SECRET` with `NEXT_PUBLIC_`.
- Rotate keys if they leak; update Vercel and redeploy.

---

## 2. Supabase migration steps

1. Create a Supabase project (region close to users).
2. In **SQL Editor**, run the migrations in order (or use Supabase CLI linked to the repo):

   - `supabase/migrations/20250510120000_intelligence_foundation.sql`  
     Tables: `search_history`, `user_shopping_memory`, `shopping_watchlist`, `product_collections`, `collection_products`.
   - `supabase/migrations/20250510140000_saved_products_compare_prefs.sql`  
     Tables: `saved_products`, `compare_sessions`, `user_preferences`.
   - `supabase/migrations/20260110120000_search_history_user_memory_rls.sql`  
     Ensures `search_history` + `user_shopping_memory` exist, extra indexes, and **RLS** (JWT `sub` = `user_id` for `authenticated`; service role used by API bypasses RLS).

3. **Row Level Security**: the app uses the **service role** from the server only (bypasses RLS). The migration above adds policies so a future Supabase-authenticated client cannot read other users’ rows. Lock down remaining tables for `anon` as needed.

4. **Optional feedback table** (for `/api/feedback` persistence):

   ```sql
   create table if not exists public.quantai_feedback (
     id uuid primary key default gen_random_uuid(),
     user_id text,
     category text not null,
     message text not null,
     context text,
     created_at timestamptz not null default now()
   );
   ```

5. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`, **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

---

## 3. Stripe setup steps

1. **Products & prices** — Create subscription products in Stripe; copy Price IDs into `STRIPE_PRICE_ID_PRO` and `STRIPE_PRICE_ID_PREMIUM`.
2. **Webhook** — Dashboard → Developers → Webhooks → Add endpoint:  
   `https://<your-domain>/api/stripe/webhook`  
   Subscribe to events you will handle (e.g. `checkout.session.completed`, `customer.subscription.updated`). Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
3. **Implement webhook logic** — Current handler verifies the signature and returns JSON. Extend `app/api/stripe/webhook/route.ts` to update Clerk `publicMetadata.subscriptionTier` or your DB; keep responses as JSON.
4. **Customer Portal** — Persist Stripe `customer` id per Clerk user (or use `STRIPE_CUSTOMER_ID_PLACEHOLDER` only for demos). Without a customer id, the portal route returns a **JSON placeholder** with `redirectUrl` to `/billing` (no crash).
5. **Checkout** — With secret + price IDs missing, Checkout returns **JSON** with `mode: "placeholder"` and `redirectUrl` to `/billing?plan=…` so pricing CTAs can fall back without throwing.

---

## 4. Clerk setup steps

1. Create application in [Clerk Dashboard](https://dashboard.clerk.com).
2. Add **Allowed origins** and redirect URLs for production: `https://<your-domain>` (and Vercel preview URL if used).
3. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel.
4. **Proxy** — QuantAI uses root `proxy.ts` (Next “Proxy” middleware): `clerkMiddleware` runs on pages and `/api/*`; only `/dashboard`, `/saved`, `/billing`, `/alerts`, `/analytics` call `auth.protect()`. Public home and `/api/search` stay guest-accessible.

---

## 5. Vercel deployment steps

1. Import the Git repo → Framework Preset: **Next.js**.
2. Set all production env vars (section 1).
3. **Build**: default `npm run build` (see `package.json`).
4. **Node**: match the version you use locally (Vercel defaults are usually fine for Next 16).
5. Deploy; confirm **Clerk** and **Stripe** redirect URLs include the production domain.
6. After first deploy, run smoke tests (section 6).

---

## 6. Manual QA checklist

- [ ] Home page loads; **search** runs signed-out and signed-in; response is JSON (no “Unexpected token `<`”).
- [ ] **Sign in / sign out** works; protected routes `/dashboard`, `/saved`, `/billing`, `/alerts`, `/analytics` require auth.
- [ ] **Saved products**: load, save, remove (with Supabase configured); empty list + `configured: false` when env missing (no white screen).
- [ ] **Watchlist**: GET returns `items` + `configured`; POST returns clear error JSON when DB unavailable.
- [ ] **Search history** / **compare history**: lists or empty + optional `storageError` in JSON.
- [ ] **Pricing**: Upgrade buttons do not throw; with Stripe incomplete, JSON includes `redirectUrl` to billing.
- [ ] **Billing page**: subscription API returns JSON; portal/checkout buttons handle placeholder JSON.
- [ ] **Stripe webhook**: returns JSON for bad signature / missing header; `503` JSON when Stripe not configured (extend handler for subscription events before going live).
- [ ] **AI chat** / **compare verdict**: graceful JSON errors when `OPENAI_API_KEY` missing (where applicable).
- [ ] **Feedback** form submits; JSON success even when table missing (stored: false + note).

---

## 7. Quality gates (before tagging a release)

```bash
npm run lint
npm run build
```

Both must pass with zero errors.
