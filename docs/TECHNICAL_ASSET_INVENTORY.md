# QuantAI — Technical Asset Inventory

**Purpose:** Buyer-relevant asset map (not every file).  
**Brand:** QuantAI · **Package:** `smartbuy`  
**Status vocabulary:** LIVE · SUPPORTING · OPTIONAL · DORMANT · EXTERNAL

---

| Asset | Purpose | Primary files | Production status | Transferability | External dependency |
|-------|---------|---------------|-------------------|-----------------|---------------------|
| Commerce search orchestration | End-to-end search API | `app/api/search/route.ts` | LIVE | High (code) | Hosting, SerpAPI |
| Product discovery | Multi-merchant listings | `app/api/search/lib/fetchShopping.ts`, `lib/intelligence/liveCommerceDiscovery.ts` | LIVE | High (code) | **SerpAPI** |
| Ranking (Phase A) | Canonical product order | `lib/truth/canonicalSearchRank.ts` | LIVE | High | — |
| Ranking decision records | Explainability / inputs to Phase A | `lib/truth/rankingDecisionRecord.ts` | LIVE | High | Truth loaders / DB |
| Truth foundation | SKU / availability / price observations | `lib/truth/*`, `supabase/migrations/*` | LIVE / SUPPORTING | High | Supabase |
| Product identity | Identity signals / registry | Truth loaders + SKU migrations | LIVE path helpers; APPLY stacks **DORMANT** | Medium–High | Supabase; flags |
| Discount intelligence | Credible discount / value evidence | `lib/intelligence/*` discount/value engines | LIVE when evidence exists | High | Upstream price fields |
| Merchant trust / diversity | Avoid single-merchant collapse | `lib/search/merchantDiversityRerank.ts`, ingest same-store guards | LIVE | High | — |
| Recommendation / decision calibration | BUY / STRONG BUY / COMPARE / BEST VALUE / AVOID | `lib/ui/canonicalDecisionCalibration.ts` | LIVE | High | — |
| Comparison | Side-by-side + verdict | `components/search/*`, `/api/search/compare-verdict` | LIVE | High | OpenAI optional |
| Saved products / memory | Persist shopper state | `/api/intelligence/*`, migrations | LIVE | High | Clerk, Supabase |
| Authentication | User identity / entitlements | Clerk integration, layout/middleware | LIVE | Medium (recreate app) | **Clerk** |
| Billing | Subscriptions / portal / webhooks | `/api/stripe/*` | LIVE if keys set; OPTIONAL for search demo | Medium | **Stripe** |
| Database | Persistence schema | `supabase/migrations/` (~7 migration files) | LIVE | High (SQL) | **Supabase** |
| Analytics | Event intake | `/api/analytics/event` | SUPPORTING / OPTIONAL | High | Optional sink |
| Reliability / stabilization | Cache, stale-prefer, timeouts, circuit breaker | `lib/search/productionStabilizationEnv.ts`, `searchReliabilityGuardrails.ts` | LIVE | High | Upstash OPTIONAL |
| Caching / rate limit | Abuse protection / shared limits | `lib/rate-limit.ts` | LIVE (memory fallback) | High | **Upstash** OPTIONAL |
| Tests / regression | Decision locks | `scripts/test-*.mjs`, package `test:*` scripts | SUPPORTING | High | Node |
| Deployment | Host Next app | Next config, Vercel-oriented | EXTERNAL | Medium | **Vercel** or equiv. |
| Documentation data room | Diligence package | `docs/FINAL_BUYER_DATA_ROOM.md` + acquisition docs | LIVE (docs) | High | — |
| Dormant intelligence stacks | Future / experimental layers | Flagged modules under `lib/**` | **DORMANT** | Code transferable; enablement separate | Flags / counsel |

---

## Notes for buyers

1. Pay for the **decision system and locks**, not for inventory QuantAI does not own.  
2. Dormant flagged modules are **engineering inventory** until enabled, tested, and disclosed.  
3. Historical `docs/architecture-audit/` and `docs/design-audit/` are engineering history — not current product claims.  
4. Root `ACQUISITION_SUMMARY.md` and this inventory support the primary entry [`FINAL_BUYER_DATA_ROOM.md`](./FINAL_BUYER_DATA_ROOM.md).
