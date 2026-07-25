# QuantAI — Technical Moat Memo

**Audience:** Sophisticated technical buyer / CTO  
**Stance:** Conservative. Repo-evidenced only.

---

## HARD-TO-REPRODUCE ASSETS

These take meaningful engineering time to recreate with comparable regression discipline:

### 1. Phase A canonical ranking authority
Single trust-driven order that is the product authority across API tray, decision brief, and compare leader — with regression locks (`test:phase-a-rank-authority` **11/11**).  
Evidence: `lib/truth/canonicalSearchRank.ts`, client preserve-default-value sort, brief alignment wiring.

### 2. Post-rank decision calibration
Shopper labels **BUY / COMPARE / AVOID / BEST VALUE** with confidence calibration, hard-mismatch discipline, tray distribution balance, and discount-chip injection from **credible** evidence only — without replacing Phase A order.  
Evidence: `lib/ui/canonicalDecisionCalibration.ts`, `test:phase-a-decision-calibration` **17/17**.

### 3. Verified discount / value gating
Multi-engine path for real discount proof / discount confidence / true value; UI chips and label influence only when evidence is credible; fake/weak promotions are not treated as automatic wins.  
Evidence: discount/value engines under `lib/intelligence/`, calibration chip merge, phase93 trust-discount hardening on path.

### 4. Merchant diversity without destroying alternatives
Ingest and tray rules oriented to keep cross-merchant offers; diversity safeguards reorder concentration rather than inventing inventory; regression for cross-merchant non-collapse.  
Evidence: `fetchShopping` same-store price dedupe guard, `merchantDiversityRerank`, `test:merchant-diversity`.

### 5. Product truth / ranking decision record stack
SKU identity, availability/historical price observation schema, ranking decision records feeding explainability and Phase A.  
Evidence: `lib/truth/*`, Supabase migrations for observations/SKU registry.

### 6. Production stabilization patterns
Beta defaults, pipeline cache, in-flight dedupe, stale-tray prefer race, circuit breaker, guest degraded serve — aimed at demo/ops resilience under slow upstream.  
Evidence: `productionStabilizationEnv.ts`, search route wiring, `DEMO_LATENCY_PROOF.md`, offline race benchmark.

### 7. Regression corpus for ranking/decision
Large offline script inventory with a **documented acquisition-critical subset** that is repeatedly green (Phase A, calibration, Phase 4 golden trays, P0).  
Caveat: CI does not run all scripts — the moat is the **corpus + gates**, not “CI proves everything.”

### 8. Decision-oriented product surface
Cards, decision brief, compare lane, institutional empty/degraded language — wired to the above authorities rather than a second ad-hoc ranker.  
Evidence: `components/search/*`, Phase 45 activation.

**Approximate character:** Multi-quarter specialized shopping-decision engineering accumulated in-repo — **not** a unique ML foundation model and **not** exclusive retailer data.

---

## STANDARD SAAS INFRASTRUCTURE (not moat)

| Component | Why it is not moat |
|-----------|-------------------|
| Next.js / React / Vercel | Commodity web stack |
| Clerk authentication | Commodity B2C/B2B auth |
| Supabase Postgres + RLS patterns | Commodity BaaS |
| Stripe subscriptions | Commodity billing |
| SerpAPI / Google Shopping feed | **Commodity upstream**; dependency, not IP |
| OpenAI API calls | Commodity model access |
| Upstash Redis | Commodity rate limiting |
| Generic CRUD saved-products APIs | Expected SaaS plumbing |

---

## What a sophisticated buyer should pay for

Pay for the **decision system and its locks** (rank authority, calibration, discount credibility, merchant preservation, truth records, stabilization, regression).  

Do **not** pay a data-marketplace premium for inventory QuantAI does not own, or an “all 200 engines live AI” premium for dormant flagged modules (`LIVE_CAPABILITY_MAP.md`).
