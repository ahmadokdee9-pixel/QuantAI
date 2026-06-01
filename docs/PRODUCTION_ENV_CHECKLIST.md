# Production environment checklist — invite-only beta

**Purpose:** Audit QuantAI **Vercel Production** before controlled invite-only beta.  
**Policy:** Shadow-only intelligence · **No APPLY** · Phases **11–18 OFF**.  
**Source of truth in code:** `lib/env/quantaiEnv.ts`, `scripts/lib/betaProductionManifest.mjs`.

**Related:** `docs/PRODUCTION_ENV_MANIFEST.md` (copy-paste block) · `docs/BETA_LAUNCH_CHECKLIST.md` · `docs/COST_MONITORING.md` · `docs/ENVIRONMENT.md`

---

## How to verify (do not use bare `vercel env pull`)

| Step | Command / action |
|------|------------------|
| Local manifest | `npm run test:beta-prod-env` |
| Core keys (local) | `npm run env:check` |
| Safe sync from Vercel | `npm run env:pull` or `npm run env:sync` (never bare `vercel env pull`) |
| Production health | `GET https://YOUR_DOMAIN/api/health` |
| Remote P0 pack | `SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:public-beta-p0:remote` |

---

## 1. Clerk (auth)

| Variable | Required | Where used |
|----------|----------|------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | Auth UI, middleware, `/api/health` |
| `CLERK_SECRET_KEY` | **Yes** | Server auth, protected routes, search tier |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | No | Defaults `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | No | Defaults `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | No | Defaults `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | No | Defaults `/dashboard` |

### Clerk sign-off

- [ ] Production app uses **live** keys (`pk_live_` / `sk_live_`), not test keys
- [ ] Allowed origins include production domain + Vercel preview if used
- [ ] Webhook endpoints (if configured) point to production URL
- [ ] `/api/health` → `clerk: true`

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing either key | Sign-in broken, health `clerk: false` | Paste both from Clerk → API Keys |
| `CLERK_SECRET_KEY` prefixed `NEXT_PUBLIC_` | Secret exposed to browser | Remove `NEXT_PUBLIC_` prefix |
| Test keys on Production | Auth works in dev only / wrong tenant | Rotate to live keys |
| Empty value `""` in Vercel | Silent auth failure | Re-enter value; use `npm run env:pull` |

---

## 2. Supabase (persistence)

| Variable | Required | Where used |
|----------|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | `lib/supabaseAdmin.ts`, saved/watchlist/history/compare APIs |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server-only writes (never `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | **Unused** by current API routes — omit unless adding client reads |

### Supabase sign-off

- [ ] Migrations applied per `docs/SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`
- [ ] `npm run test:beta-supabase-migrations` passes against project
- [ ] RLS policies match `supabase/migrations/`
- [ ] `/api/health` → `supabase: true`

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| Anon key in `SUPABASE_SERVICE_ROLE_KEY` | Permission errors on server writes | Use **service_role** key from Settings → API |
| Wrong project URL | Random 401/404 from Supabase | Match URL to same project as service role |
| Migrations not applied | Save/watchlist/history 500 | Run `supabase db push` or SQL editor |

---

## 3. OpenAI

| Variable | Required | Where used |
|----------|----------|------------|
| `OPENAI_API_KEY` | **Yes** | Compare verdict, copilot, commerce AI batch, **production build** |
| `QUANTAI_COMMERCE_AI_MODEL` | No | Default `gpt-4.1-mini` (`lib/intelligence/commerceAi/openaiCommerceBatch.ts`) |
| `QUANTAI_COMMERCE_AI_TIMEOUT_MS` | No | Default `3500` (capped 8000) |
| `QUANTAI_COPILOT_MODEL` | No | Copilot (`lib/copilot/openaiCopilot.ts`) |

### OpenAI sign-off

- [ ] Key valid (build succeeds on Vercel)
- [ ] Monthly **budget cap** + email alerts configured — see `docs/COST_MONITORING.md`
- [ ] Beta: heuristic commerce AI on (`QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI=true`) to limit batch spend
- [ ] `/api/health` → `openai: true`

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing key | `next build` fails; compare/copilot 503 | Add key in Vercel Production |
| Revoked / wrong org key | 401 from OpenAI in logs | Regenerate at platform.openai.com |
| Empty `""` | Intermittent 503 | Re-enter non-empty value |

---

## 4. SerpAPI (search discovery)

| Variable | Required | Where used |
|----------|----------|------------|
| `SERPAPI_KEY` | **Yes** | `POST /api/search`, live discovery, health |
| `SERPAPI_SHOPPING_GL` | No | Shopping locale |
| `SERPAPI_SHOPPING_NUM` | No | Result count cap |
| `SEARCH_SERPAPI_TIMEOUT_MS` | No | Default `12000` (beta stabilization) |
| `SEARCH_SERPAPI_RETRIES` | No | Default `1` in beta |
| `DISCOVERY_*` / `QUANTAI_LIVE_DISCOVERY*` | No | Live market refresh tuning |
| `QUANTAI_LIVE_DISCOVERY` | No | Set `off` to disable live discovery path |

### SerpAPI sign-off

- [ ] Plan supports projected daily searches (see cost section in `docs/COST_MONITORING.md`)
- [ ] Quota alerts at 70% / 90% enabled on SerpAPI dashboard
- [ ] Guest abuse caps set (defaults or explicit): `GUEST_SEARCH_*`, `AUTH_SEARCH_BURST_*`
- [ ] `/api/health` → `serpapi: true`

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing key | Search 503, `Search is temporarily unavailable` | Add `SERPAPI_KEY` |
| Quota exceeded | Empty trays, `upstream_fail` in logs | Upgrade plan or emergency throttle (cost doc) |
| Timeout too low | Cold searches fail | Keep `SEARCH_SERPAPI_TIMEOUT_MS` ≥ 10000 for beta |

---

## 5. Upstash (distributed rate limits)

| Variable | Required | Where used |
|----------|----------|------------|
| `UPSTASH_REDIS_REST_URL` | **Strongly recommended** | `lib/rate-limit.ts`, guest/auth search limits |
| `UPSTASH_REDIS_REST_TOKEN` | **Strongly recommended** | Pair with URL — both required for Redis client |

### Upstash sign-off

- [ ] Both URL and token set on **Production** (not Preview-only)
- [ ] `REQUIRE_UPSTASH=true SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:beta-upstash`
- [ ] `/api/health` → `redis: true` (no `rate_limit_fallback` warning in prod)

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| Only one of URL/token set | In-memory fallback per instance | Set both |
| Missing on Production | Abuse bypass across serverless instances | Create Upstash DB; add to Vercel |
| Preview keys on Production | Rate limits don’t match prod DB | Use production Upstash instance |

**Note:** Without Upstash, limits still apply via in-memory + abuse maps, but **not shared across Vercel instances** — unacceptable for public beta at scale.

---

## 6. Stripe (billing — optional for invite-only)

| Variable | Required | Where used |
|----------|----------|------------|
| `STRIPE_SECRET_KEY` | No* | Checkout, portal, webhooks |
| `STRIPE_WEBHOOK_SECRET` | No* | `app/api/stripe/webhook` |
| `STRIPE_PRICE_ID_PRO` | No* | Pro plan checkout |
| `STRIPE_PRICE_ID_PREMIUM` | No* | Premium plan checkout |
| `STRIPE_CUSTOMER_ID_PLACEHOLDER` | No | Local portal smoke only — **do not set in Production** |

\*Required only if beta cohort can upgrade via Stripe. App runs in placeholder billing mode when Stripe unset.

### Stripe sign-off (if billing enabled)

- [ ] **Live** keys on Production (`sk_live_`), matching price IDs
- [ ] Webhook endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`
- [ ] `NEXT_PUBLIC_APP_URL` matches checkout return URLs
- [ ] Test checkout + portal once before invites

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| Test keys + live price IDs | Checkout fails | Align mode (all test or all live) |
| Webhook secret mismatch | Subscriptions not updating | Re-copy signing secret from Stripe |
| Missing `NEXT_PUBLIC_APP_URL` | Wrong redirect after pay | Set canonical HTTPS URL |

---

## 7. Site URL & platform

| Variable | Required | Where used |
|----------|----------|------------|
| `NEXT_PUBLIC_APP_URL` | **Strongly recommended** | Stripe redirects, `metadataBase`, sitemap, robots, legal links |
| `VERCEL_URL` | Auto (Vercel) | Fallback in `lib/stripe/config.ts` `appUrl()` |
| `VERCEL_ENV` | Auto | Health warnings (`production` vs preview) |
| `NODE_ENV` | Auto | Stabilization defaults, logging |

### Site URL sign-off

- [ ] `NEXT_PUBLIC_APP_URL=https://your-production-domain` (no trailing slash)
- [ ] Matches Clerk allowed origins and Stripe redirect URLs
- [ ] `app/sitemap.ts` and `app/robots.ts` emit correct absolute URLs

### Common invalid / missing

| Issue | Symptom | Fix |
|-------|---------|-----|
| `http://` on Production | Mixed content / wrong canonical | Use `https://` |
| Localhost on Production | Stripe/legal links broken | Set production domain |
| Unset (relying on `VERCEL_URL`) | Works on `*.vercel.app` but wrong on custom domain | Set explicit `NEXT_PUBLIC_APP_URL` |

---

## 8. Beta stabilization & cost guardrails (recommended Production)

| Variable | Recommended value | Purpose |
|----------|-------------------|---------|
| `QUANTAI_BETA_STABILIZATION` | `true` (default on in prod) | Skip heavy shadow stack |
| `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI` | `true` | Reduce OpenAI batch on search path |
| `SEARCH_GUEST_CACHE_SECONDS` | `300` | Guest SerpAPI cache |
| `SEARCH_AUTH_CACHE_SECONDS` | `120` | Auth cache |
| `GUEST_SEARCH_HOURLY_MAX` | `12` | Guest SerpAPI cap |
| `GUEST_SEARCH_DAILY_MAX` | `20` | Guest daily cap |
| `GUEST_SEARCH_BURST_PER_MIN` | `4` | Guest burst |
| `AUTH_SEARCH_BURST_PER_MIN` | `18` | Auth burst |
| `SEARCH_QUERY_MAX_LENGTH` | `220` | Query length guard |

Optional shadow (safe):

| Variable | Value |
|----------|-------|
| `QUANTAI_NORMALIZATION_ENABLED` | `true` |
| `QUANTAI_NORMALIZATION_MODE` | `shadow` |
| `QUANTAI_NORMALIZATION_APPLY` | `false` |
| `QUANTAI_NORMALIZATION_SHADOW_TELEMETRY` | `true` |
| `QUANTAI_SEARCH_META_LITE` | `true` |

Optional analytics:

| Variable | Purpose |
|----------|---------|
| `QUANTAI_ANALYTICS_SINK_URL` | Server event forward |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` | Default `trust@quantai.app` |
| `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` | Default `trust@quantai.app` |

---

## 9. MUST be false or unset (Production beta)

### APPLY flags (invalid if `true`)

Verified by `npm run test:beta-prod-env`:

`QUANTAI_NORMALIZATION_APPLY`, `QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED`, `QUANTAI_NORMALIZATION_APPLY_CANARY`, `QUANTAI_NORMALIZATION_CANARY_CONFIRMED`, `TASTE_UNIFIED_APPLY_ENABLED`, `INTENT_INTELLIGENCE_APPLY_ENABLED`, `INTENT_INTELLIGENCE_PROD_APPLY`, `INTENT_INTELLIGENCE_CANARY_APPLY`, `INTENT_RUNTIME_PROD_APPLY`, `INTENT_RUNTIME_CANARY_APPLY`, `INTENT_ORCHESTRATION_PROD_APPLY`, `INTENT_ORCHESTRATION_CANARY_APPLY`

### Phases 11–18 (invalid if `true`)

`QUANTAI_COMMERCE_BRAIN_ENABLED`, `QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED`, `QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED`, `QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED`, `QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED`, `QUANTAI_UNIVERSAL_COMMERCE_INTELLIGENCE_ENABLED`, `QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED`, `QUANTAI_AUTONOMOUS_COMMERCE_EVOLUTION_ENABLED`

### Recommended OFF (warn if `true` — latency)

`QUANTAI_COMMERCE_EVOLUTION_ENABLED`, `QUANTAI_CONTROLLED_ACTIVATION_ENABLED`, `QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED`, `QUANTAI_RECOMMENDATION_COGNITION_ENABLED`, `QUANTAI_COMMERCE_MEMORY_ENABLED`, `QUANTAI_TRUST_ENGINE_ENABLED`, `QUANTAI_IDENTITY_FOUNDATION_ENABLED`

---

## 10. Audit summary — missing / invalid / unused

### Missing (blocks beta)

| Variable | Impact |
|----------|--------|
| Any of 6 required secrets below | Auth, search, persistence, or build broken |

**Required secrets (non-empty):**

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SERPAPI_KEY`, `OPENAI_API_KEY`

### Missing (degraded — fix before scale)

| Variable | Impact |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Wrong Stripe/legal/metadata URLs |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Weak distributed rate limits |
| `QUANTAI_ANALYTICS_SINK_URL` | No server analytics forward |

### Invalid (explicitly wrong for beta)

| Condition | Detection |
|-----------|-----------|
| Any APPLY flag `true` | `npm run test:beta-prod-env` **FAIL** |
| Any Phase 11–18 flag `true` | `npm run test:beta-prod-env` **FAIL** |
| Empty string values | `npm run env:check` / manual Vercel review |
| Server secret as `NEXT_PUBLIC_*` | Security review |
| Test Clerk/Stripe keys on Production | Dashboard + smoke tests |

### Unused in current app (safe to omit from Production)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Documented optional; no client Supabase reads in API routes today |
| `STRIPE_CUSTOMER_ID_PLACEHOLDER` | Dev portal smoke only |
| Intent/taste/ranking phase flags (when `false`/unset) | Only read when enabled; hundreds in `.env.example` for future phases |
| `ENABLE_UNIFIED_CANARY`, `INTENT_CANARY_*` | Canary rollout — keep off for invite-only beta |
| Emergency shutdown flags (e.g. `INTENT_COGNITION_EMERGENCY_SHUTDOWN`) | Only affect layers when those layers are enabled |

### Documented but not in `QUANTAI_ENV_SPECS`

These are used in runtime but validated only via manifest/scripts or manual review:

- All `GUEST_SEARCH_*` / `AUTH_SEARCH_*` — `lib/search/searchAbuseProtection.ts`
- `QUANTAI_BETA_STABILIZATION` and stabilization tunables — `lib/search/productionStabilizationEnv.ts`
- Phase flags across `lib/intelligence/**/flags.ts` — off by default

---

## 11. Production sign-off table

| Provider | Keys set | Format valid | Dashboard alerts | Signatory | Date |
|----------|----------|--------------|------------------|-----------|------|
| Clerk | ☐ | ☐ | ☐ | | |
| Supabase | ☐ | ☐ | ☐ | | |
| OpenAI | ☐ | ☐ | ☐ | | |
| SerpAPI | ☐ | ☐ | ☐ | | |
| Upstash | ☐ | ☐ | ☐ | | |
| Stripe | ☐ N/A | ☐ | ☐ | | |
| Site URL | ☐ | ☐ | — | | |
| APPLY / Phase 11–18 OFF | ☐ | ☐ | — | | |

**Automated gate:** `npm run test:public-beta-p0` (local) + `npm run test:public-beta-p0:remote` (production URL).
