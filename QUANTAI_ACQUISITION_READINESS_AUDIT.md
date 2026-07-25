# QuantAI Acquisition Readiness — Final Value Audit

**Date:** 2026-07-25  
**Mode:** AUDIT ONLY — no code was modified for this document  
**Package name:** `smartbuy@0.1.0` (private)  
**Product name in docs/UI:** QuantAI  
**Auditor lenses:** CTO / technical due diligence / SaaS buyer / product quality  

**Overall posture (skeptical):**  
QuantAI is a **feature-dense, carefully gated commerce-search beta** with strong ranking/decision engineering and weak buyer packaging. It is **not** a clean, portable, license-clear product asset yet. Acquisition preparation is **CONDITIONAL GO** — sellable after a short pre-sale sprint, not as-is for serious diligence without fixes.

---

## 1 — Acquisition Asset Inventory

### What a buyer acquires

| Layer | What exists | Evidence |
|-------|-------------|----------|
| **Product surface** | 12 page routes: `/`, pricing, how-it-works, commerce-intelligence, legal, dashboard, saved, alerts, analytics, billing, contact | `app/**/page.tsx` |
| **API surface** | 22 route handlers: search, compare-verdict, save-product, Stripe, billing, intelligence CRUD, health, cron refresh, analytics, outbound, feedback, copilot/ai-chat | `app/api/**/route.ts` |
| **Search infrastructure** | SerpAPI shopping fetch → discovery fusion → enrichment → ranking → Phase A canonical order → client results surface | `app/api/search/route.ts` (~2,581 lines), `app/api/search/lib/fetchShopping.ts` |
| **Commerce intelligence** | ~200 `*Engine.ts` modules, ~39 activation layers, truth/SKU/price/merchant/discount/value stacks | `lib/intelligence/`, `lib/truth/`, `lib/ui/phase*` |
| **Ranking** | Deterministic ranking + controlled execution + **Phase A** `resolveCanonicalSearchRank` (authority) | `lib/ranking/`, `lib/truth/canonicalSearchRank.ts` |
| **Decision / labels** | Post-rank calibration → BUY / COMPARE / AVOID / BEST VALUE; discount chips | `lib/ui/canonicalDecisionCalibration.ts`, Phase 45 activation |
| **Comparison** | Compare tray + compare-verdict API + insights | `components/search/CompareIntelligencePanel.tsx`, `/api/search/compare-verdict` |
| **Saved / memory** | Saved products, watchlist, collections, search history, user memory | Supabase tables + `/api/intelligence/*` |
| **Auth** | Clerk | `@clerk/nextjs`, `app/layout.tsx` |
| **Database** | Supabase (service role admin) — **16 tables** across 7 migrations | `supabase/migrations/` |
| **Billing** | Stripe checkout / portal / webhook | `/api/stripe/*` |
| **Caching / abuse** | Next `unstable_cache`, guest/auth pipeline cache, Upstash ratelimit (optional), in-memory fallbacks | `lib/search/productionStabilization.ts`, `lib/rate-limit.ts` |
| **Analytics** | Event tracker + optional sink URL | `/api/analytics/event`, `QUANTAI_ANALYTICS_SINK_URL` |
| **Tests** | **~477** `test:*` npm scripts; large offline suite | `package.json`, `scripts/test-*.mjs` |
| **CI/CD** | 2 workflows: CI (subset) + production-validation (weekly/live) | `.github/workflows/` |
| **Docs** | Strong ops/env/beta docs; weak root README; heavy architecture-audit trail | `docs/` |
| **UI components** | ~68 component files | `components/` |

### Asset classification (do not exaggerate)

| Classification | Assets |
|----------------|--------|
| **PROPRIETARY (code IP — assuming seller owns copyright)** | Search orchestration, Phase A rank authority, truth/SKU/price observation models, discount authenticity / true-value logic, decision calibration, merchant diversity safeguards, tray integrity, production stabilization, UI product/decision surface, regression scripts |
| **THIRD-PARTY (commercial SaaS)** | Clerk, Supabase, Stripe, SerpAPI, OpenAI, Upstash (optional), Vercel hosting |
| **OPEN-SOURCE** | Next.js 16, React 19, Zod, Framer Motion, Geist, Lucide, ESLint, etc. (MIT/Apache-class; optional LGPL transitive via sharp/libvips) |
| **EXTERNAL SERVICE DEPENDENCY (runtime critical)** | **SerpAPI** (product discovery — no inventory without it), **OpenAI** (compare/copilot/optional commerce AI), **Clerk** (auth), **Supabase** (persistence), **Stripe** (paid plans) |

### What is *not* owned

- Product catalog / merchant inventory (sourced via SerpAPI)
- Merchant websites / affiliate networks (outbound links only)
- Training data corpus for a foundation model
- Exclusive retailer partnerships (not evidenced in repo)
- A portable multi-cloud deployment story (Vercel-centric)

---

## 2 — Buyer Due-Diligence Audit

| Topic | Rating | Finding |
|-------|--------|---------|
| Code ownership / copyright grant | **RED** | No root `LICENSE`; `package.json` has `"private": true` and **no `license` field**. Buyer cannot assume transfer terms from the repo alone. |
| Dependency licenses | **YELLOW** | Direct deps look commercially safe. Optional transitive `LGPL-3.0-or-later` via `@img/sharp-libvips-*` in lockfile — disclose, usually acceptable for SaaS. |
| Secrets in git | **GREEN** | `.env*` gitignored except `.env.example`; no hardcoded `sk_live` / API key literals found in source. CI uses placeholders. |
| API key exposure | **GREEN** (repo) / **YELLOW** (ops) | Repo clean. Production vault hygiene must be proven at handover (rotate keys). |
| Security | **YELLOW** | Service-role Supabase usage is powerful; rate limits degrade to per-instance memory without Upstash; circuit breaker is in-process. |
| Environment configuration | **GREEN** | `docs/ENVIRONMENT.md`, `env:check` / `env:pull` safety, production env manifests. |
| Vendor lock-in | **RED** | Clerk + Supabase service role + Vercel `unstable_cache` + SerpAPI as discovery source. Migration is weeks, not days. |
| Database portability | **YELLOW** | SQL migrations exist (good). App assumes Supabase client + service role patterns. |
| Vercel portability | **YELLOW→RED** | Deploy/docs assume Vercel project **quant-ai**; pipeline cache uses Next `unstable_cache`. |
| Supabase portability | **YELLOW** | Schema portable; auth is Clerk (not Supabase Auth). |
| External API dependencies | **RED** for search quality | Without SerpAPI, product is empty. OpenAI affects compare/AI surfaces. |
| Operating costs | **YELLOW** | Variable SerpAPI + OpenAI; docs give beta math, not fixed COGS. |
| Scalability | **YELLOW** | Serverless + in-memory stale/circuit/rate fallbacks; Upstash recommended but optional. |
| Undocumented dependencies | **YELLOW** | Naming mismatch `smartbuy` vs QuantAI; SerpAPI not an npm package (env-only). |
| Abandoned code | **YELLOW** | Large **dormant** intelligence estate (flags OFF); stale cosmic/design docs; `docs/.../.pdf-gen/node_modules` noise. |
| Technical debt | **RED** | ~2.5k-line search route; ~200 engines; phase sprawl. Workable but diligence-visible. |
| Test coverage | **YELLOW→RED** | Huge script inventory; CI runs **~27** of ~477 `test:*` scripts — do not claim “fully gated.” |
| Production reliability | **YELLOW** | Stabilization, timeouts, stale prefer, guest recovery exist; cold search latency still demo-critical. |

---

## 3 — Product Demo Audit (5-minute buyer test)

Assume a buyer opens production (or a polished staging) and tries one search.

### What can impress (if staging is warm and env is complete)

- Coherent product UI: hero search, results grid, decision labels, compare, saved
- BUY / COMPARE / AVOID (and BEST VALUE) with confidence — not a raw shopping dump
- Merchant diversity safeguards and discount chip path (when evidence exists)
- Decision Brief / compare lane alignment with Phase A order
- Pricing / billing / Clerk sign-in present

### What can kill the demo in five minutes

| Issue | Why it hurts |
|-------|----------------|
| **Cold first search 5–15s** | Looks unfinished / unreliable vs Google Shopping |
| **Empty tray / SerpAPI fail** | Looks like a broken product |
| **Institutional / dense jargon** | “Intelligence OS” language can read as vaporware to non-technical buyers |
| **Homepage marketing vs delivery lag** | Strong claims + slow results = trust destruction |
| **Inconsistent labels if meta incomplete** | Calibration depends on ranking records; degraded trays must still look intentional |
| **Broken/outdated images or outbound links** | Classic shopping UX failure |
| **Auth wall mid-demo** | Saved/billing paths require Clerk; guest search must work |
| **Stock README if buyer clones repo** | Signals amateur packaging |

### Surfaces specifically audited (by code/docs evidence)

| Surface | Assessment |
|---------|------------|
| Homepage | Feature-rich; risk of overclaim relative to SerpAPI latency |
| Onboarding | Clerk-based; no dedicated product tour evidenced |
| Search | Functional; **latency is the #1 demo risk** |
| Cards / labels / confidence | Mature calibration path; freeze |
| Merchant diversity / discounts | Engineered; must be shown with multi-merchant queries |
| Decision Brief / Compare | Wired; demo script should use 2–3 fixed queries |
| Saved Products | Requires auth + Supabase |
| Mobile | Responsive intent present; not independently proven in this audit |
| Empty / loading / errors | Institutional empty/degraded states exist — tone may confuse buyers |

**Demo verdict:** Product can look **premium** on a warm, curated staging walkthrough — or **experimental** on a cold first search. Demo quality is **environment-dependent**, not guaranteed by code alone.

---

## 4 — Value-Destroying Issues

| ID | Severity | Issue | Why it reduces sale value |
|----|----------|-------|---------------------------|
| V1 | **P0** | No LICENSE / IP grant package | Diligence stall; lawyers cannot clear ownership |
| V2 | **P0** | Cold search latency / SerpAPI outage → empty or slow tray | Demo fails → deal stalls |
| V3 | **P0** | Incomplete production env / missing Upstash / APP_URL | Looks non-production |
| V4 | **P1** | Root README is create-next-app boilerplate | Buyer clones repo → instant credibility hit |
| V5 | **P1** | Naming mismatch (`smartbuy` vs QuantAI) | Confusion in diligence data room |
| V6 | **P1** | ~2.5k search route + dormant “Phases 11–18” estate | Buyer fears unmaintainable / overclaimed AI |
| V7 | **P1** | CI does not run majority of tests | “Hundreds of tests” claim is unverifiable |
| V8 | **P1** | Vendor lock-in (Clerk/Supabase/Vercel/SerpAPI) | Lowers strategic value for platform buyers |
| V9 | **P2** | Stale design docs (cosmic) + vendored `docs/.../node_modules` | Looks messy |
| V10 | **P2** | In-memory rate limit / circuit on serverless | Reliability caveat in diligence |
| V11 | **P3** | Soft label-distribution targets (e.g. MacBook) | Not deal-blocking |
| V12 | **P3** | Further intelligence layers | **Negative ROI** for acquisition |

---

## 5 — Highest-ROI Final Improvements (max 10)

| # | CHANGE | WHY BUYER CARES | FILES (indicative) | Complexity | Time | Risk | Acquisition impact |
|---|--------|-----------------|-------------------|------------|------|------|--------------------|
| 1 | Add **LICENSE** + IP assignment statement + contributor clarity | Clears ownership | new `LICENSE`, short `docs/IP_AND_OWNERSHIP.md` | Low | 0.5–1d | Low | Unblocks diligence |
| 2 | Rewrite **README** as product/ops handover (architecture map, env, demo script, freeze list) | First 5 minutes of repo review | `README.md` | Low | 1d | Low | High credibility |
| 3 | **Demo staging** + fixed query pack (warm cache, multi-merchant, discount examples) | Guarantees 5-min demo | ops + `docs/DEMO_SCRIPT.md` | Low | 1–2d | Low | Highest demo ROI |
| 4 | Prove **P95 search** on staging (document numbers; keep stale-prefer) | Removes “slow AI toy” objection | probe scripts already exist | Low | 0.5–1d | Low | Valuation defense |
| 5 | **Buyer data room pack**: env checklist, cost model, architecture 1-pager, known limitations | Speeds LOI | `docs/ACQUISITION_HANDOVER.md` | Low–Med | 1–2d | Low | Transferability |
| 6 | Align naming (`smartbuy` → QuantAI or document alias) | Avoids diligence friction | `package.json` name **or** README clarity | Low | 0.5d | Low | Polish |
| 7 | Publish **“Production surface vs dormant layers”** map (flags OFF = not sold as live) | Prevents overclaim liability | short doc | Low | 0.5–1d | Low | Trust |
| 8 | CI **acquisition gate**: run P0 suite only (rank authority, calibration, phase4, merchant diversity, build) | Credible quality signal | `.github/workflows/ci.yml` | Low–Med | 1d | Med | Engineering trust |
| 9 | Remove/ignore **docs noise** (`.pdf-gen/node_modules`, stale cosmic docs) | Cleaner artifact | docs hygiene | Low | 0.5d | Low | Polish |
| 10 | **Key rotation + access inventory** (Clerk/Supabase/SerpAPI/OpenAI/Stripe/Vercel) | Security diligence | ops | Low | 1d | Low | Security score |

**Explicitly rejected as pre-sale work:** new intelligence layers, UI redesign, ranking architecture changes, dashboards, multi-cloud rewrite.

---

## 6 — What Not to Touch (freeze)

| System | Freeze? | Reason |
|--------|---------|--------|
| **Phase A canonical ranking** | **FREEZE** | Authority already tested (11/11); changes destroy trust |
| **Decision calibration / labels** | **FREEZE** | 17/17 calibration; buyer demos depend on stable labels |
| **Search pipeline stage order** | **FREEZE** (except latency/ops knobs) | Monolith is risky to rewrite pre-sale |
| **Card layout / results UI** | **FREEZE** | Visual churn reads unfinished |
| **Commerce intelligence architecture** | **FREEZE** | Dormant layers must stay OFF; do not expand |
| **Comparison architecture** | **FREEZE** | Wired; polish demo only |
| **Merchant diversity / discount chip paths** | **FREEZE** | Already acquisition-positive |

**Further development that creates more risk than value:** enabling shadow stacks, normalization APPLY, “Phases 11–18,” redesigns, category hacks, new pages.

---

## 7 — Transferability & Buyer Handover Checklist

### Can a buyer acquire and operate?

**Yes, if** they accept Vercel + Clerk + Supabase + SerpAPI + Stripe + OpenAI and receive credentials + runbooks.  
**No, if** they expect a self-hosted, license-clear, vendor-independent product tomorrow.

### Must transfer / recreate

| Asset | Transfer |
|-------|----------|
| Git repository | Grant access / transfer ownership |
| Domain + DNS | Registrar + Vercel domains |
| Vercel project | Transfer or redeploy + env |
| Supabase project | Transfer or migrate SQL + data |
| Clerk application | Transfer org or recreate; migrate users |
| Stripe account | Transfer or new account + price IDs |
| SerpAPI account | Transfer or new key (quota critical) |
| OpenAI project | New key + budget caps |
| Upstash (if used) | Transfer Redis |
| Analytics sink | Optional URL |
| Env var set | Full production + preview |
| Cron (`/api/cron/refresh-listings`) | Auth secret / schedule |
| GitHub Actions secrets | `SEARCH_BASE_URL`, etc. |

### BUYER HANDOVER CHECKLIST

- [ ] Signed IP assignment / LICENSE grant  
- [ ] Repo access + deploy rights  
- [ ] Domain DNS documented  
- [ ] Vercel project transfer or clone  
- [ ] All production env vars listed and rotated  
- [ ] Supabase migrations applied; RLS reviewed  
- [ ] Clerk production instance + redirect URLs  
- [ ] Stripe live keys + webhook endpoint  
- [ ] SerpAPI plan + quota alerts  
- [ ] OpenAI budget cap  
- [ ] Upstash (recommended)  
- [ ] Demo staging URL + 10 golden queries  
- [ ] Incident runbook (`docs/BETA_INCIDENT_RESPONSE_CHECKLIST.md`)  
- [ ] Cost monitoring (`docs/COST_MONITORING.md`)  
- [ ] “Dormant features = OFF” disclosure  
- [ ] Known limitations (latency, SerpAPI dependency, serverless memory limits)  

---

## 8 — Operating Cost Profile

Evidence-based; **no invented dollar prices**.

| SERVICE | PURPOSE | REQUIRED / OPTIONAL | KNOWN COST MODEL (from docs) | TRANSFER |
|---------|---------|---------------------|------------------------------|----------|
| **SerpAPI** | Shopping results / discovery | **Required** for search | Quota plans; beta math ~100 users × 10 searches/day ≈ 1,000 searches/day; 70%/90% alerts | New or transferred API account |
| **OpenAI** | Compare / copilot / optional commerce AI | **Required** for some AI surfaces; heuristic AI can reduce search path | Monthly budget caps suggested **$50–100** (100 invitees) in docs | New project + key |
| **Clerk** | Auth | **Required** for signed-in features | Clerk pricing (not quantified in repo) | Org transfer |
| **Supabase** | DB / persistence | **Required** for saved/history/truth observations | Supabase plan (not quantified) | Project transfer |
| **Vercel** | Hosting / edge | **Required** (current) | Vercel plan (not quantified) | Project transfer |
| **Stripe** | Subscriptions | Required if monetizing | Stripe fees (standard) | Account / price IDs |
| **Upstash Redis** | Rate limit / shared cache | **Optional but recommended** | Upstash plan (not quantified) | Transfer Redis |
| **Analytics sink** | Event drain | Optional | Depends on sink | Optional |

---

## 9 — Technical Moat

### REAL TECHNICAL MOAT (hard / time-consuming to reproduce)

- End-to-end **commerce decision stack**: truth foundation → ranking decision records → Phase A canonical authority → post-rank shopper labels with regression locks  
- **Discount authenticity / value** gating (verified-only display path)  
- **Merchant-preserving** ingest + diversity safeguards (cross-merchant offers)  
- Large **offline regression corpus** for ranking/decision (valuable if CI-gated)  
- Production **stabilization** patterns (stale prefer, circuit, guest recovery, env-safe pull)

### USEFUL ENGINEERING (valuable, not unique)

- Intent/taste/buyer-model meta layers (many dormant)  
- Tray integrity / explainability / compare insights  
- Ops checklists and phase architecture docs  

### STANDARD INFRASTRUCTURE

- Next.js app, Clerk auth, Supabase CRUD, Stripe billing, Vercel deploy  

### MARKETING CLAIMS WE SHOULD NOT MAKE

- “Owns global product inventory” (SerpAPI-dependent)  
- “All 200 engines are live production AI” (most flags OFF)  
- “Fully CI-proven with 477 tests” (CI runs a subset)  
- “Cloud-portable / no vendor lock-in”  
- Guaranteed sub-second search  

---

## 10 — Acquisition Readiness Scores

| Dimension | Score | Rationale |
|-----------|------:|-----------|
| Product maturity | **72** | Beta-complete UX; not GA-hardened |
| Engineering quality | **68** | Deep logic; monolith & sprawl visible |
| Production readiness | **70** | Stabilization present; latency/env gaps |
| Demo readiness | **58** | Highly dependent on warm staging / SerpAPI |
| Transferability | **55** | Heavy vendor coupling; no LICENSE |
| Documentation | **62** | Excellent ops docs; terrible root README |
| Security | **74** | Repo secrets hygiene good; ops/transfer TBD |
| Technical differentiation | **71** | Real ranking/decision moat; discovery not owned |
| Commerce/search quality | **66** | Strong when APIs healthy; cold path weak |

### OVERALL ACQUISITION READINESS: **66 / 100**

Honest interpretation: **credible technical product, incomplete acquisition package**.

---

## 11 — Final Pre-Sale Execution Plan (3 sprints)

### Sprint 1 — Critical acquisition blockers (do first)

1. Create LICENSE + IP ownership statement for counsel  
2. Rotate and inventory all production secrets; document access  
3. Stand up **demo staging** with complete env (SerpAPI, Clerk, Supabase, APP_URL; Upstash recommended)  
4. Run remote smoke + latency probe; fix only **demo-blocking** failures  
5. Write 10 golden demo queries (multi-merchant + discount + clear BUY/COMPARE)

### Sprint 2 — High-value demo / product polish

1. Rewrite README as QuantAI product + handover  
2. Document dormant vs live surfaces (honesty pack)  
3. Fix naming clarity (`smartbuy` ↔ QuantAI)  
4. CI P0 acquisition gate (rank authority, calibration, phase4, merchant diversity, build)  
5. Optional: remove docs noise (`.pdf-gen/node_modules`, stale cosmic docs)

### Sprint 3 — Documentation + handover + diligence

1. `docs/ACQUISITION_HANDOVER.md` (checklist §7)  
2. Cost/ops one-pager from existing COST_MONITORING docs  
3. Known limitations list (SerpAPI, latency, serverless memory limits)  
4. Architecture 1-pager (freeze list §6)  
5. Data room folder: env manifests, migration list, demo recording, test evidence screenshots  

**Do not:** rewrite search route, redesign UI, enable shadow stacks, add features.

---

# FINAL SECTION (required)

## A. What QuantAI actually owns

A Next.js commerce-search application (`smartbuy`) with proprietary **ranking, truth, discount authenticity, decision calibration, and merchant-diversity orchestration**; UI for search/compare/save/billing; Supabase schema; large offline test/script estate; ops documentation. It does **not** own product inventory (SerpAPI), users (Clerk), or payments (Stripe).

## B. What makes it valuable

A buyer acquires **years of specialized shopping-decision engineering** that is hard to rebuild quickly: Phase A rank authority, calibrated BUY/COMPARE/AVOID, verified-discount surfacing, multi-merchant preservation, and production stabilization — plus a working monetization skeleton.

## C. What could reduce the sale price

No LICENSE; cold/slow search demos; SerpAPI dependency; vendor lock-in; 2.5k-line search monolith; overclaimable dormant “AI phases”; CI/test gap; stock README; incomplete staging env.

## D. What must be fixed before listing

1. IP/LICENSE package  
2. Demo-ready staging + proven latency narrative  
3. Buyer-facing README + handover pack  
4. Secret rotation / access inventory  
5. Honest “live vs dormant” disclosure  

## E. What should NOT be developed anymore

New intelligence layers, UI redesigns, Phase A/ranking/calibration changes, enabling shadow APPLY stacks, multi-cloud rewrites, speculative features.

## F. Top 10 final high-ROI improvements

1. LICENSE / IP clarity  
2. README handover rewrite  
3. Demo staging + golden queries  
4. Documented P95/latency proof  
5. Acquisition handover doc / data room  
6. Naming alignment  
7. Live-vs-dormant map  
8. CI P0 gate  
9. Docs hygiene  
10. Key rotation inventory  

## G. Buyer handover requirements

Git + domain + Vercel + Supabase + Clerk + Stripe + SerpAPI + OpenAI (+ Upstash) + full env + cron + demo URL + runbooks + limitations disclosure (see §7 checklist).

## H. Acquisition readiness score

**66 / 100**

## I. Exact 3-sprint pre-sale roadmap

- **Sprint 1:** LICENSE/IP, secrets, staging, latency/smoke, golden demo queries  
- **Sprint 2:** README, naming, dormant-surface honesty, CI P0, docs cleanup  
- **Sprint 3:** Handover doc, cost one-pager, limitations, architecture freeze brief, data room  

## J. GO / CONDITIONAL GO / NO-GO

### **CONDITIONAL GO** for beginning acquisition preparation

Proceed to **pre-sale packaging and demo hardening** now.  
Do **not** list for serious acquisition until Sprint 1 blockers (IP, staging demo, secrets) are complete.  
Do **not** keep building product features — that destroys value relative to packaging.

---

*End of audit. No code was modified to produce this document.*
