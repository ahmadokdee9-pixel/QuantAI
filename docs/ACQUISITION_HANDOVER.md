# QuantAI — Acquisition Handover (Master)

**Audience:** Technical buyer / diligence lead  
**Product brand:** QuantAI · **npm/repo package:** `smartbuy`  
**Cross-refs (do not duplicate):**  
[`IP_AND_OWNERSHIP.md`](./IP_AND_OWNERSHIP.md) · [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md) · [`ENVIRONMENT.md`](./ENVIRONMENT.md) · [`BUYER_DATA_ROOM.md`](./BUYER_DATA_ROOM.md) · [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md)

---

## 1. Asset inventory

| Asset | What buyer receives |
|-------|---------------------|
| Source repository | Next.js app + `lib/` intelligence + `scripts/` regression suite |
| Product UI | Search home, results, compare, saved, billing, marketing pages |
| Schema | 7 Supabase migrations / ~16 tables |
| Ops docs | Env, beta, cost, incident, acquisition pack |
| IP package | `LICENSE` + IP ownership statement (counsel to finalize) |

**Not included as owned inventory:** SerpAPI/Google Shopping catalog, merchant sites, foundation models, Clerk/Supabase/Stripe platforms.

---

## 2. Repository structure (buyer map)

| Path | Role |
|------|------|
| `app/` | Routes + API (`/api/search` is the primary pipeline) |
| `components/` | UI (search cards, compare, landing) |
| `lib/search/` | Cache, stabilization, diversity, reliability |
| `lib/truth/` | Phase A rank, SKU/price truth, ranking records |
| `lib/intelligence/` | Enrichment, discounts, engines (many dormant) |
| `lib/ui/` | Decision calibration, Phase 45 activation |
| `lib/ranking/` | Deterministic / controlled ranking helpers |
| `supabase/migrations/` | Database |
| `scripts/` | Offline tests / probes |
| `docs/` | Ops + acquisition documentation |
| `.github/workflows/` | CI + production-validation |

---

## 3. Production architecture

See [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md).

**Default buyer-visible order:** Phase A canonical rank on the API response; client default sort `"value"` preserves that order; labels via post-rank calibration.

---

## 4. External services

| Service | Required for demo? | Notes |
|---------|-------------------|--------|
| SerpAPI | **Yes** | Empty/503 without key |
| Clerk | Yes (app shell / auth) | Guest search possible; saved needs auth |
| Supabase | Yes for persistence / truth tables | Apply migrations |
| OpenAI | Yes for build + compare/AI surfaces | Heuristic commerce AI can reduce search AI cost |
| Vercel | Current host | `unstable_cache` used for pipeline cache |
| Stripe | Optional for guest demo | Required for monetization |
| Upstash | Optional | Recommended for distributed rate limits |

Full credential matrix: [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md).

---

## 5. Environment requirements

Buyer-classed: **CORE DEMO / FULL PRODUCT / OPTIONAL / DEV** in [`ENVIRONMENT.md`](./ENVIRONMENT.md).  
Safe sync: `npm run env:pull` only (never bare `vercel env pull`).

---

## 6. Deployment procedure (high level)

1. Own Git repo + Vercel project (or redeploy).  
2. Set CORE DEMO env on Production + Preview.  
3. Apply `supabase/migrations/`.  
4. Configure Clerk production URLs + Stripe webhook → `/api/stripe/webhook`.  
5. `npm run build` / deploy.  
6. Smoke: `SEARCH_BASE_URL=https://… npm run test:beta-prod-smoke` (when available).  
7. Warm golden queries: [`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md).

Exact vendor dashboards: ENVIRONMENT + ACCESS docs.

---

## 7. Database overview

Postgres via Supabase. Tables include: `search_history`, `saved_products`, `shopping_watchlist`, `compare_sessions`, `user_shopping_memory`, collections, `price_snapshots`, `outbound_clicks`, `user_billing_state`, `availability_observations`, `sku_identity_*`, `historical_price_observations`.  
Checklist: [`SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md`](./SUPABASE_PRODUCTION_MIGRATION_CHECKLIST.md).

---

## 8. Authentication

Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`). Protects saved/billing/intelligence routes; search supports guest with rate limits.

---

## 9. Billing

Stripe checkout / portal / webhook; plan entitlements in `lib/subscription/`. Price IDs via env. Optional for acquisition demo of search alone.

---

## 10. Search provider dependency

**SerpAPI is mission-critical.** QuantAI ranks and decides on top of SerpAPI listings. Cost/quota: [`SERPAPI_OPENAI_COST_ALERTS.md`](./SERPAPI_OPENAI_COST_ALERTS.md), [`COST_MONITORING.md`](./COST_MONITORING.md).

---

## 11. Operational dependencies

- Production stabilization / stale-prefer: [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md)  
- Incident: [`BETA_INCIDENT_RESPONSE_CHECKLIST.md`](./BETA_INCIDENT_RESPONSE_CHECKLIST.md)  
- Cron: `/api/cron/refresh-listings` + `CRON_SECRET`  
- CI: subset of tests in `.github/workflows/ci.yml` — not the full `test:*` inventory  

---

## 12. Known limitations

- Cold SerpAPI latency can be multi-second; warm/stale improves demos.  
- Dormant intelligence layers must not be sold as live.  
- Vendor lock-in (Vercel/Clerk/Supabase).  
- In-memory circuit/stale/rate-limit fallbacks are weaker without Upstash / multi-instance.  
- Root package name remains `smartbuy` (see [`NAMING_NOTE.md`](./NAMING_NOTE.md)).

---

## 13. Transfer checklist

Use [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md) closing checklist + IP counsel sign-off on `LICENSE` / [`IP_AND_OWNERSHIP.md`](./IP_AND_OWNERSHIP.md).

---

## 14. Post-acquisition — first 24 hours

1. Rotate all secrets; confirm Vercel Production env.  
2. `npm run env:check` + production deploy.  
3. Apply migrations; verify `/api/health`.  
4. Run 3 golden queries; confirm multi-merchant + labels.  
5. Confirm SerpAPI quota alerts + OpenAI budget cap.  

## 15. Post-acquisition — first 7 days

1. Enable Upstash if not present.  
2. Run `test:public-beta-p0:remote` + latency probe; record numbers into diligence folder.  
3. Review Stripe live webhook + plans.  
4. Freeze Phase A / calibration (do not “tune” for demos).  
5. Decide policy on dormant flags (keep OFF unless intentional program).  
6. Clean data-room packaging via [`DOCUMENTATION_MANIFEST.md`](./DOCUMENTATION_MANIFEST.md).
