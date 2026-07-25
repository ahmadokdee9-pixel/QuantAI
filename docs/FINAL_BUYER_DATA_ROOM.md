# QuantAI — Buyer Data Room

**Single buyer entry point for technical due diligence.**  
**Sale candidate:** `quantai-sale-candidate-v1` · Brand: **QuantAI** · Package: `smartbuy`  
**Rule:** Claims below are repository-evidenced. Dormant layers are inventory, not live product.

Related indexes (supporting, not primary): [`FINAL_DATA_ROOM_INDEX.md`](./FINAL_DATA_ROOM_INDEX.md) · [`BUYER_DATA_ROOM.md`](./BUYER_DATA_ROOM.md)

---

## 1. Executive Summary

QuantAI is an AI-assisted **commerce decision platform** that:

- discovers products from **external** commerce sources (SerpAPI → shopping feeds)
- preserves **merchant diversity** across offers
- compares alternatives
- evaluates product relevance and trust/value signals
- detects and presents **verified** discount evidence when credible
- generates calibrated shopper decisions, including: **BUY**, **STRONG BUY**, **COMPARE**, **BEST VALUE**, **AVOID**

It is **not** a proprietary product catalog and does **not** own retailer inventory. Differentiation is the **decision layer**: Phase A canonical ranking, post-rank calibration, discount authenticity gating, merchant-diversity safeguards, and a shopper-facing results surface.

---

## 2. What the Buyer Acquires

### Proprietary Product Assets

| Asset | Notes |
|-------|--------|
| Search orchestration | `POST /api/search` pipeline |
| Commerce decision pipeline | Enrich → rank prep → Phase A → calibration → UI |
| Phase A canonical ranking | `lib/truth/canonicalSearchRank.ts` |
| Product / truth foundation | `lib/truth/*`, observation / SKU migrations |
| Decision / recommendation calibration | `lib/ui/canonicalDecisionCalibration.ts` |
| Discount / value evaluation | Intelligence engines + calibration chip gating |
| Merchant-diversity safeguards | `lib/search/merchantDiversityRerank.ts` + ingest guards |
| Decision UI | `components/search/*` |
| Comparison system | Compare tray + `/api/search/compare-verdict` |
| Saved-product flows | `/api/intelligence/*` + Supabase tables |
| Documentation / test corpus | Acquisition data room + offline gates |

### Third-Party Dependencies / Services

| Service | Role |
|---------|------|
| Next.js / React | Application framework |
| Vercel | Typical hosting target |
| Clerk | Authentication |
| Supabase | Postgres persistence |
| Stripe | Billing (checkout / portal / webhooks) |
| SerpAPI | Product discovery upstream (**critical**) |
| OpenAI | Compare / copilot / optional AI surfaces |
| Upstash | Optional distributed rate limits |

**Transfer note:** Third-party services, accounts, quotas, and licenses are **not** automatically transferred with the repository unless specifically agreed in the purchase documents. Buyer typically provisions own accounts and rotates credentials.

---

## 3. Architecture Overview

```text
User Query
  → Query / search API (`app/api/search/route.ts`)
  → Product Discovery (SerpAPI / `fetchShopping` + bounded live discovery)
  → Enrichment (`lib/intelligence/enrichProducts.ts`)
  → Identity / normalization signals (live path helpers; APPLY stacks dormant)
  → Truth / trust / value signals (`lib/truth/*`, discount/value engines)
  → Canonical Phase A Ranking (`lib/truth/canonicalSearchRank.ts`)
  → Merchant Diversity (`lib/search/merchantDiversityRerank.ts`)
  → Decision Calibration (`lib/ui/canonicalDecisionCalibration.ts`)
  → Product Results UI (`components/search/*`)
  → Compare / Save / Merchant Routing
```

| Stage | Primary files |
|-------|----------------|
| Discovery | `app/api/search/lib/fetchShopping.ts`, `lib/intelligence/liveCommerceDiscovery.ts` |
| Phase A | `lib/truth/canonicalSearchRank.ts`, `lib/truth/rankingDecisionRecord.ts` |
| Calibration | `lib/ui/canonicalDecisionCalibration.ts` |
| Stabilization | `lib/search/productionStabilizationEnv.ts` |
| Diversity | `lib/search/merchantDiversityRerank.ts` |

One-pager: [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md)

---

## 4. Technical Moat

Conservative, evidence-backed only. Full memo: [`TECHNICAL_MOAT.md`](./TECHNICAL_MOAT.md)

### PROPRIETARY / HARD TO REBUILD

- Canonical ranking authority (single order across grid / brief / compare)
- Multi-signal decision calibration with mismatch discipline
- Merchant-preserving commerce search + diversity safeguards
- Verified-discount handling (chips / label influence only when credible)
- Product identity / observation / ranking-decision-record stack
- Category-agnostic decision architecture (not a single vertical scraper)
- Offline regression corpus for ranking / calibration / diversity / P0
- Resilience patterns (cache, stale-prefer, timeouts, circuit breaker)

### STANDARD INFRASTRUCTURE

Next.js, React, Vercel, Clerk, Supabase, Stripe, SerpAPI, OpenAI, Upstash — commodity platforms, **not** moat.

---

## 5. Product Capability Matrix

| Capability | Status | Evidence | Dependency | Buyer Notes |
|------------|--------|----------|------------|-------------|
| Search | **LIVE** | `/api/search` | SerpAPI, hosting | Core demo |
| Product discovery | **LIVE** | `fetchShopping`, live discovery | SerpAPI | Inventory not owned |
| Merchant diversity | **LIVE** | `merchantDiversityRerank`, ingest guards | — | Regression: `test:merchant-diversity` |
| Ranking | **LIVE** | Phase A `canonicalSearchRank` | Truth signals | Gate: 11/11 |
| Decision calibration | **LIVE** | `canonicalDecisionCalibration` | Rank tray | Gate: 17/17; labels include STRONG BUY |
| Discount validation | **LIVE** | Discount/value engines + calibration | Upstream price fields | Credible evidence only |
| Product identity | **LIVE** / **SUPPORTING** | Truth / SKU migrations + loaders | Supabase | APPLY normalization stacks **DORMANT** |
| Comparison | **LIVE** | Compare UI + compare-verdict API | OpenAI optional | |
| Saved products | **LIVE** | Intelligence APIs + migrations | Clerk, Supabase | |
| Authentication | **LIVE** | Clerk | Clerk | |
| Billing | **LIVE** / **OPTIONAL** | Stripe routes | Stripe keys | Optional for search-only demo |
| Analytics | **SUPPORTING** / **OPTIONAL** | `/api/analytics/event` | Optional sink | |
| Reliability / fallbacks | **LIVE** | Stabilization env, reliability guards | Upstash **OPTIONAL** | Memory fallback without Upstash |
| Deployment | **EXTERNAL DEPENDENCY** | Vercel-oriented Next app | Vercel or equiv. | |
| Admin / data persistence | **LIVE** | Supabase admin + tables | Supabase | Migrations required |
| Flagged “commerce brain / autonomous OS” stacks | **DORMANT** | Flags default OFF | — | Do not pitch as live |
| Owned retailer inventory | **NOT INCLUDED** | — | — | External feeds only |

---

## 6. Production vs Dormant System Map

Authoritative detail: [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md)

### LIVE PRODUCTION PATHS

Search orchestration → discovery → enrich → Phase A rank → decision calibration → results / compare / save; Clerk; Supabase persistence; Stripe routes; production stabilization.

### SUPPORTING / TELEMETRY PATHS

Heuristic commerce AI (beta default), OpenAI surfaces, Phase 92–95 hardening meta, rate limits, cron refresh, analytics events, intent/taste **meta** when apply flags off.

### DORMANT / DEFAULT-OFF INTELLIGENCE

Commerce brain, autonomous commerce OS / strategy / evolution, controlled activation APPLY, normalization APPLY, live adaptive signals, emotional / universal commerce flags, etc. — code present, **not** default production differentiators.

### EXPERIMENTAL / LEGACY PATHS

Normalization shadow telemetry, canary/observability metas, architecture-audit / design-audit historical docs, removed cosmic UI experiments.

**Do not market dormant layers as active production features.**

---

## 7. Search / Commerce Data Ownership

| Owns | Does not own |
|------|----------------|
| Application software, decision IP, schema, UI, tests, docs | Retailer product inventory |
| Ranking / calibration / diversity / discount logic | Exclusive merchant catalogs |
| User-persisted data **in buyer’s Supabase** after transfer | Google Shopping / SerpAPI raw feed ownership |

Commerce inventory is obtained through **external discovery providers** and merchant websites. Availability, pricing, images, and latency inherit third-party quotas, ToS, and network conditions.

---

## 8. Performance

Evidence: [`DEMO_LATENCY_PROOF.md`](./DEMO_LATENCY_PROOF.md) · [`PERFORMANCE_EVIDENCE.md`](./PERFORMANCE_EVIDENCE.md)

### Local / simulated measurements

- Offline stale-prefer race correctness (`scripts/benchmark-search-speed-path.mjs`)
- Phase 4 ranking kernel p50/p95 in **millisecond** bands (offline; not end-to-end search)

### Live production measurements

**Live production P50/P95 not yet independently evidenced in this repository.**

Capture with: `SEARCH_BASE_URL=… BETA_PROBE_WARM=true npm run test:beta-latency-probe`

---

## 9. Test & Validation Evidence

Acquisition-critical gates (not “all tests” — package has a large `test:*` inventory; CI runs a **subset**):

| Gate | Command | Typical verified result |
|------|---------|-------------------------|
| Build | `npm run build` | PASS |
| TypeScript | `npx tsc --noEmit` | PASS |
| Phase A | `npm run test:phase-a-rank-authority` | 11/11 |
| Calibration | `npm run test:phase-a-decision-calibration` | 17/17 |
| Phase 4 ranking | `npm run test:phase4-ranking-validation` | 23/23 |
| Merchant diversity | `npm run test:merchant-diversity` | PASS |
| P0 readiness | `npm run test:p0-production-readiness` | PASS (bundles env/migrations/stabilization/diversity) |

Do **not** claim every script in `package.json` is green unless executed.

---

## 10. Security / Secrets Transfer

- Sale-candidate repository should contain **no production secrets**
- Credentials are transferred/rotated **separately**
- Buyer needs own Clerk / Supabase / Stripe / SerpAPI / OpenAI / Vercel / Upstash credentials as applicable
- `.env.example` is **reference-only**

See [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md)

---

## 11. Infrastructure Requirements

| Requirement | Notes |
|-------------|--------|
| Node.js runtime | Local / CI / build |
| Vercel or equivalent | Host Next.js App Router |
| Supabase | Persistence + migrations |
| Clerk | Auth |
| SerpAPI (or equivalent search provider wiring) | **Required** for discovery |
| Stripe | If billing enabled |
| OpenAI | If AI-assisted compare/copilot surfaces enabled |
| Upstash | Recommended for multi-instance rate limits |
| `NEXT_PUBLIC_APP_URL` | Recommended for production polish |

This stack is **vendor-coupled**; not “fully vendor independent.”

---

## 12. Known Limitations

Full table: [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md) · Risks: [`BUYER_RISK_REGISTER.md`](./BUYER_RISK_REGISTER.md)

Material items:

- External search/API dependency (SerpAPI)
- Cold search latency risk; end-to-end latency dominated by upstream
- Live production P50/P95 not independently evidenced in-repo
- Vendor transfer requirements (Clerk, Supabase, Stripe, Vercel, OpenAI, Upstash)
- Dormant / experimental intelligence paths must not be oversold
- Naming mismatch: brand **QuantAI** vs package `smartbuy` ([`NAMING_NOTE.md`](./NAMING_NOTE.md))
- CI scope ≪ full test inventory
- Serverless in-memory rate-limit / stale fallbacks without Upstash
- No owned retailer inventory
- LICENSE / IP counsel confirmation pending
- Manual operational handover (demo warm, env complete, secrets rotation)

---

## 13. Buyer Handover Checklist

| Item | Status / action |
|------|-----------------|
| Repository transfer | GitHub access / ownership |
| Git history | Included with repo |
| Sale candidate tag | `quantai-sale-candidate-v1` |
| Domain | Human / DNS transfer |
| Vercel | Project transfer or recreate |
| Supabase | Project + migrations |
| Clerk | Application transfer or recreate |
| Stripe | Account / products / webhooks |
| SerpAPI | Buyer account + key |
| OpenAI | Buyer account + key |
| Upstash | Optional production Redis |
| Cron | Secure `CRON_SECRET` + schedule |
| Environment variables | From [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| Database migrations | Apply `supabase/migrations/` |
| Webhooks | Stripe webhook endpoint |
| Analytics | Optional sink URL |
| Billing | Plans + entitlement wiring |
| Secrets rotation | Mandatory at close |
| DNS | Apex / www / app |
| Demo URL | Human provide + warm |
| Production URL | Confirm deploy health |
| Operational runbook | [`ACQUISITION_HANDOVER.md`](./ACQUISITION_HANDOVER.md) |

---

## 14. First 30 Minutes After Acquisition

1. Clone repository at tag `quantai-sale-candidate-v1` (or `main` if equivalent)
2. `npm install`
3. Copy `.env.example` → `.env.local`; fill CORE DEMO keys ([`ENVIRONMENT.md`](./ENVIRONMENT.md))
4. Connect / create Supabase; apply migrations
5. Configure Clerk (publishable + secret)
6. Configure SerpAPI (`SERPAPI_KEY`)
7. Configure optional OpenAI
8. `npx tsc --noEmit` then `npm run build`
9. Run critical suite: Phase A, calibration, Phase 4, merchant-diversity, P0
10. Deploy staging (Vercel or equivalent); set `NEXT_PUBLIC_APP_URL`
11. Run golden demo queries ([`GOLDEN_DEMO_QUERIES.md`](./GOLDEN_DEMO_QUERIES.md) / [`BUYER_DEMO_SCRIPT.md`](./BUYER_DEMO_SCRIPT.md)); optionally attach latency probe

---

## 15. What Is NOT Being Sold

- Third-party accounts unless explicitly transferred
- Third-party licenses / quotas
- Merchant inventory ownership
- Exclusive retailer partnerships (unless separately documented legally)
- Undocumented rights beyond LICENSE / IP docs (counsel confirmation required)
- Speculative dormant intelligence as production functionality
- Verified revenue, user traction, or GMV (none asserted in this package)
- Guaranteed live search P50/P95 without attached probe artifacts

---

## Reading order (recommended)

1. This file  
2. [`ACQUISITION_EXECUTIVE_SUMMARY.md`](./ACQUISITION_EXECUTIVE_SUMMARY.md)  
3. [`../README.md`](../README.md)  
4. [`BUYER_ARCHITECTURE_ONE_PAGER.md`](./BUYER_ARCHITECTURE_ONE_PAGER.md)  
5. [`TECHNICAL_MOAT.md`](./TECHNICAL_MOAT.md)  
6. [`LIVE_CAPABILITY_MAP.md`](./LIVE_CAPABILITY_MAP.md)  
7. [`TECHNICAL_ASSET_INVENTORY.md`](./TECHNICAL_ASSET_INVENTORY.md)  
8. [`PERFORMANCE_EVIDENCE.md`](./PERFORMANCE_EVIDENCE.md)  
9. [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)  
10. [`BUYER_RISK_REGISTER.md`](./BUYER_RISK_REGISTER.md)  
11. [`ACCESS_AND_SECRETS_HANDOVER.md`](./ACCESS_AND_SECRETS_HANDOVER.md)  
12. [`ACQUISITION_HANDOVER.md`](./ACQUISITION_HANDOVER.md)
