---
title: QuantAI Master Roadmap
subtitle: Commerce Intelligence OS — Current State → World-Class Platform
date: May 2026
classification: Internal — Strategy & Architecture
version: 1.0
source_of_truth: QUANTAI_FULL_ARCHITECTURE_AUDIT.md
---

# QuantAI Master Roadmap

**Classification:** Internal — Strategy & Architecture  
**Date:** May 2026  
**Source of truth:** [QUANTAI_FULL_ARCHITECTURE_AUDIT.md](./QUANTAI_FULL_ARCHITECTURE_AUDIT.md)  
**Current baseline:** P6.9 complete — 32 mutating stages, 20 controlled apply layers (P5.0–P6.9), all **production-OFF by default**

---

## 0. Strategic Frame

QuantAI is **not a marketplace**. QuantAI is becoming a **Commerce Intelligence Operating System (CIOS)** — deterministic ranking middleware with bounded mutation, replay-safe rollback, multi-phase telemetry, and production kill switches. Smartbuy is the first deployment surface; the OS is the product.

**Audit verdict:** Research-grade and CI-mature; production-invisible today. Ranking users see is dominated by cached `enrichProductsWithIntelligence` + pre-stack layers (persona, semantic rerank, commerce quality), not P6 cognition/governance/simulation.

**Roadmap objective:** Transform QuantAI from a **shadow intelligence infrastructure** (wired, validated, OFF) into the **world’s strongest AI commerce intelligence operating system** — measured by search superiority, trust superiority, buying-decision superiority, and architecture scalability.

**What this roadmap is NOT:** Random features, UI redesigns, marketplace expansion, embedding-first RAG, autonomous shopping agents, or another P6.x meta-layer clone without foundations.

---

## 1. Layer Taxonomy (Explicit Separation)

All future work must declare which layer class it belongs to. Mixing classes without boundaries is an anti-pattern.

| Layer class | Role in CIOS | Current state (audit) | Roadmap posture |
|-------------|--------------|----------------------|-----------------|
| **Infrastructure layers** | Fetch, cache, pipeline orchestration, CI/replay harness, observability partitions, latency budgets | SerpAPI + ~120s cache; `buildLatencyBudgetReport` imported but unused; no full-stack CI command | **Stabilize first** — meta lifecycle, lazy eval, full-stack test |
| **Intelligence layers** | Signal extraction: merchant confidence, style, regret risk, discovery profiles, intent sidecars | Strong in `enrichProductsWithIntelligence`; meta-only for controlled stack | **Normalize inputs** → propagate to ranking |
| **Ranking layers** | Product order mutation: pre-stack + controlled apply chain | Pre-stack active; P5–P6.9 OFF in prod | **Deterministic superiority** via normalization + bounded activation |
| **Cognition layers** | Reasoning, decision, strategy, behavioral, intent cognition (P5.5–P6.0) | Wired; telemetry-only in prod | **Activate after stabilization**; no bypass of CHECK lanes |
| **Governance layers** | Rollback, drift, replay integrity, contradiction arbitration, prod/canary gates (P4.8, P6.8) | Per-phase duplicated governors (~12 clones); P6.8 capstone | **Consolidate to kernel**; cross-stack coordinator |
| **Simulation layers** | Economic world simulation, counterfactual ranking (P6.9) | Lab-grade; OFF in prod | **Prod telemetry-only first**; simulation informs activation decisions |
| **UX layers** | Surfaces that expose buying intelligence to users/partners | Meta JSON only; no shopper-visible intelligence | **Reasoning visibility via decision signals** — not “show AI thinking” UI redesign |

### Current stack map (audit-confirmed)

```
Infrastructure → Cached enrichProducts → Pre-stack ranking (always on)
  → Meta builders (partially stale) → Controlled P5.0–P6.9 (OFF in prod)
  → Final products + meta
```

**Shadow orchestration (audit §2.5):** Pre-stack + cached enrichment **override** controlled stack in production because P5–P6.9 are OFF. Controlled layers are infrastructure until activated.

---

## 2. Priority Stack (Audit-Ordered)

Roadmap phases map 1:1 to audit priorities. No phase may skip its predecessor’s exit criteria.

| Priority | Theme | Roadmap phase |
|:--------:|-------|---------------|
| 1 | Architecture stabilization | **Phase 0 — Pre-P7 Hardening** |
| 2 | Product normalization | **Phase 1 — Canonical Commerce Identity** |
| 3 | Full-stack intelligence propagation | **Phase 2 — Meta-Ranking Coherence** |
| 4 | Deterministic ranking superiority | **Phase 3 — Ranking Kernel Authority** |
| 5 | Query understanding kernel | **Phase 4 — Query Intent → Scoring Bridge** |
| 6 | Retailer/merchant trust intelligence | **Phase 5 — Trust Graph & Offer Provenance** |
| 7 | Commerce reasoning visibility | **Phase 6 — Decision Signal Exposure** |
| 8 | Controlled production activation | **Phase 7 — Layer Activation Program** |
| 9 | Commerce memory architecture | **Phase 8 — Memory Policy & Architecture** |
| 10 | Autonomous commerce cognition (future) | **Phase 9 — Autonomous Cognition (Future)** |

Supporting long-horizon capability (audit §7.1): **Retrieval/query kernel** is scoped as **Phase 10 — Retrieval Kernel** (post-normalization, post-activation), not as a P6.x clone.

---

## 3. Master Phase Roadmap

Each phase includes: strategic goal, architectural objective, production objective, measurable success criteria, what must NOT be built yet, technical dependencies, activation strategy, commercialization impact.

---

### Phase 0 — Pre-P7 Architecture Stabilization

**Timeline:** Sprints 1–6 (immediate)  
**Layer focus:** Infrastructure, Governance (consolidation RFC), Ranking (meta fix)

#### Strategic goal
Eliminate known integration debt so the CIOS can safely activate intelligence without corrupting telemetry, optimization loops, or production latency.

#### Architectural objective
- Fix stale meta: recompute `dealClusters`, `searchIntelligence`, and related artifacts **after** the P5–P6.9 controlled stack completes (`route.ts` ~687 vs ~838–1212 mismatch).
- Wire `buildLatencyBudgetReport` into response meta (currently imported, never called).
- Implement lazy-eval / telemetry-lite fast path when layers are OFF (audit §10.2 — 20 sequential engine runs per request).
- Add `npm run test:intent-full-stack` covering P4.8→P6.9 in one CI pass (audit gap §4.1).
- Complete route.ts upstream meta propagation for P6.3–P6.5 (audit §2.2).
- Publish governance kernel RFC: consolidate ~12 duplicated governor/rollback/replay modules vs continue cloning.

#### Production objective
Zero regression in current ranking (layers remain OFF); measurable p95 latency improvement from lazy-eval; CI-enforced meta/product ID consistency on every search response.

#### Measurable success criteria
- [ ] Zero stale meta relative to final `products` order — CI guard enforced
- [ ] `test:intent-full-stack` green in CI
- [ ] p95 search latency regression **< 5%** vs baseline after lazy-eval
- [ ] `latencyBudget` populated in meta on 100% of search responses
- [ ] Governance kernel RFC approved (consolidate vs clone decision recorded)
- [ ] Stale-meta CI guard wired to `test:intent-prod-ci-guard`

#### What must NOT be built yet
- Phase 7+ new intelligence layer clones
- Enabling all 20 layers simultaneously
- UI surfaces for “AI thinking”
- Embeddings/autonomous agent retrieval
- Personalization memory expansion

#### Technical dependencies
- `app/api/search/route.ts` (main pipeline)
- `scripts/intent-prod-ci-guard.mjs`
- `scripts/lib/intentEvaluationRunner.mjs`
- Per-phase audit scripts (consolidation target)

#### Activation strategy
**No ranking layer activation in Phase 0.** Infrastructure-only deployment. Canary infrastructure (latency budget dashboards, meta consistency alerts) before any layer enablement.

#### Commercialization impact
**Low direct UX impact; high platform credibility.** Partners and internal teams gain trustworthy telemetry — prerequisite for any “QuantAI-powered” commercial claim. Production readiness score moves from **C+ (57.5%)** toward **B+** foundation.

---

### Phase 1 — Canonical Commerce Identity (Product Normalization)

**Timeline:** Sprints 3–8 (overlaps Phase 0 exit)  
**Layer focus:** Intelligence, Ranking (pre-stack), Infrastructure

#### Strategic goal
Establish canonical listing identity so ranking moves meaningfully between equivalent listings — the **single highest ROI search-quality intervention** identified in the audit (§8, §10.8).

#### Architectural objective
- RFC: canonical product identity spec (variant collapse, dedup keys, offer equivalence classes).
- MVP wired into `enrichProductsWithIntelligence` at tray build time.
- Semantic rerank consumes normalized IDs, not raw listing fingerprints.
- Dedup before top-N presentation — eliminate near-duplicate occupation of top slots.

#### Production objective
Users see diverse, canonical-best offers in top-3 for multi-listing queries; duplicate collapse rate measurable in production.

#### Measurable success criteria
- [ ] Normalization MVP deployed in cached pipeline
- [ ] Top-3 duplicate listing rate **↓ ≥ 40%** on eval query set (multi-retailer queries)
- [ ] Semantic rerank integration test green on normalized IDs
- [ ] No regression in p95 latency beyond Phase 0 budget
- [ ] Normalization telemetry in meta (`canonicalId`, `dedupGroup`, `collapseReason`)

#### What must NOT be built yet
- Full SKU graph / marketplace catalog
- Embedding-based dedup (normalization must be deterministic first)
- New P6.x meta layers for “normalization intelligence”
- Cross-retailer inventory sync

#### Technical dependencies
- Phase 0 meta consistency (normalization changes must reflect in final meta)
- `lib/intelligence/enrichProducts.ts`
- `semanticRerankSearchResults`
- Eval harness query partitions

#### Activation strategy
**Always-on in cached pipeline** (not a controlled apply layer). Roll out via cache TTL refresh; shadow-compare normalized vs legacy order in meta for 2 weeks before full cutover.

#### Commercialization impact
**First visible search superiority.** “QuantAI finds the best offer, not the same product twelve times.” Foundation for trust and buying-decision claims. This is the **primary moat seed** — normalization at OS level, not app level.

---

### Phase 2 — Full-Stack Intelligence Propagation

**Timeline:** Sprints 6–10  
**Layer focus:** Infrastructure, Intelligence, Ranking, Governance

#### Strategic goal
Ensure every intelligence signal — pre-stack, enrichment, and controlled layers — propagates to **final ranking state and final meta** with no shadow drift.

#### Architectural objective
- Meta field lifecycle documented and enforced (`META_LIFECYCLE.md`).
- Complete route arg wiring: mid-stack layers (P6.3 adaptive strategic ranking, etc.) receive full upstream meta chain (audit §2.2 — reasoning/decision/strategy/market/behavioral/cognition metas currently omitted).
- Single **meta-ranking coherence pass** after controlled stack: clusters, searchIntelligence, bundleSuggestions, marketAwareness rebuilt from final order.
- Cross-layer confidence calibration pass (audit §10.7 — independent confidence inflation).

#### Production objective
`data.meta` accurately reflects final product order and layer contributions; optimization loops and partner APIs consume consistent intelligence.

#### Measurable success criteria
- [ ] 100% meta product ID order match with final `products` (automated per-request assertion in staging)
- [ ] Upstream meta args complete for P6.3–P6.5 in route.ts (CI guard)
- [ ] Cross-layer confidence calibration reduces aggregate confidence inflation **≥ 30%** in eval without reducing replay integrity scores
- [ ] No duplicate meta keys (`buyingDecision`, `dealStrength` mirrors resolved)

#### What must NOT be built yet
- New intelligence layers
- Forcing mutation by bypassing CHECK lanes
- Partner-facing API expansion before coherence proven

#### Technical dependencies
- Phase 0 stale-meta fix (hard dependency)
- Phase 1 normalization IDs in meta
- P6.8 cognitive governance (calibration anchor)

#### Activation strategy
Deploy coherence pass in **telemetry-only mode** first. Validate meta-ranking match across live partitions before any controlled layer mutation enablement.

#### Commercialization impact
**Enables B2B intelligence APIs.** Partners can trust QuantAI meta as ground truth for ranking decisions — required for licensing the OS beyond Smartbuy.

---

### Phase 3 — Deterministic Ranking Superiority

**Timeline:** Sprints 8–12  
**Layer focus:** Ranking, Intelligence, Cognition (readiness)

#### Strategic goal
Make QuantAI’s ranking authority **deterministic, explainable, and superior** to single-function AI rerankers — without violating bounded mutation contracts.

#### Architectural objective
- Declare **ranking authority hierarchy** (audit shadow orchestration resolution):
  1. Cached enrichment (score foundation)
  2. Pre-stack identity/semantic/quality (always-on guardrails)
  3. Controlled apply chain (bounded mutation when enabled)
- Query-intent scoring weight **injection points** defined in ranking kernel (bridge to Phase 4).
- Consolidate pre-stack scoring into documented precedence rules (persona vs quality vs semantic — audit §2.2 policy tension prep).
- Eval harness: **top-3 lift** as primary ranking metric (not meta richness).

#### Production objective
Measurable ranking lift on eval partitions before any new layer code; ranking decisions traceable to deterministic signal paths.

#### Measurable success criteria
- [ ] Ranking authority hierarchy documented and CI-enforced (no shadow override without explicit flag)
- [ ] Eval top-3 relevance score **↑ ≥ 8%** vs pre-Phase-3 baseline (normalization + propagation included)
- [ ] 100% of ranking mutations traceable to signal ID + layer + lane in meta
- [ ] Replay integrity ≥ 70 maintained across all active partitions

#### What must NOT be built yet
- Probabilistic / LLM-only reranking
- Unbounded score adjustments
- Multi-layer simultaneous prod activation

#### Technical dependencies
- Phase 1 normalization
- Phase 2 meta-ranking coherence
- Existing pre-stack layers + enrichProducts

#### Activation strategy
Ranking kernel changes deploy in production **without** enabling P5–P6.9 controlled mutation. Controlled layers remain OFF; pre-stack + enrichment improvements carry visible lift.

#### Commercialization impact
**Search superiority narrative becomes defensible.** “Deterministic commerce ranking with full replay audit trail” — differentiated from black-box AI shopping apps.

---

### Phase 4 — Query Understanding Kernel

**Timeline:** Sprints 10–14  
**Layer focus:** Intelligence, Ranking (coupling), Infrastructure

#### Strategic goal
Build a **deterministic query understanding kernel** that feeds ranking — not meta-only sidecars (audit §5.3, §7.4 gap: `canonicalQuery` + intents exist but weak ranking coupling).

#### Architectural objective
- Structured intent taxonomy → scoring weight matrix (price-sensitive, trust-sensitive, compare-mode, spec-sensitive, urgency, gift, replacement).
- Kernel sits **between** query normalization and enrichment/ranking — not inside another P6.x clone.
- Deterministic intent resolution; embeddings explicitly excluded per phase contracts (audit §7.2).
- Intent signals wired into: enrichProducts weights, semantic rerank, commerce quality, buying decision layer.

#### Production objective
Same query with different implicit intents produces measurably different ranking emphasis — visible in top-3 composition shifts on eval set.

#### Measurable success criteria
- [ ] Intent → weight mapping covered by **≥ 200** golden query tests
- [ ] Intent-driven ranking divergence **≥ 15%** top-3 swap rate between intent classes on eval set
- [ ] Zero increase in routing lane untested combinations (lane inventory test matrix green)
- [ ] Intent kernel latency **< 5ms** p95 (deterministic path)

#### What must NOT be built yet
- Embedding-first retrieval (Phase 10)
- LLM query rewriting in production path
- Autonomous query expansion agents
- New meta-only intent sidecars without ranking wire

#### Technical dependencies
- Phase 3 ranking kernel authority
- Existing `canonicalQuery` + intent infrastructure in `lib/intelligence/`
- Phase 1 normalized product IDs

#### Activation strategy
**Gradual intent class rollout:** enable weight injection per intent class with feature flags; canary 5% traffic per class; rollback on replay integrity drop.

#### Commercialization impact
**Buying-decision superiority.** QuantAI understands *why* the user is searching and ranks accordingly — core OS capability for any commerce surface (Smartbuy, partner integrations, API licensing).

---

### Phase 5 — Retailer & Merchant Trust Intelligence

**Timeline:** Sprints 12–18  
**Layer focus:** Intelligence, Infrastructure, Governance

#### Strategic goal
Extend per-listing `merchantIntelligence` heuristics into a **persistent retailer/merchant trust graph** with offer provenance (audit §5.3, §7.4 — trust graph missing).

#### Architectural objective
- Merchant trust graph: nodes (retailer, merchant, offer source), edges (fulfillment history, dispute rate, policy adherence, price integrity signals).
- Offer provenance chain: SerpAPI listing → normalized offer → trust score → ranking weight.
- Trust signals feed enrichment and query kernel (trust-sensitive intent class).
- Governance: P6.8 cognitive governance validates trust signal contradictions; no trust score without provenance metadata.

#### Production objective
Trust-sensitive queries rank high-integrity merchants higher; low-trust offers demoted or flagged in meta (not hidden — transparent decision signals).

#### Measurable success criteria
- [ ] Trust graph covers **≥ 80%** of top-100 retailers by query volume
- [ ] Trust-sensitive query eval: trusted merchant presence in top-3 **↑ ≥ 25%**
- [ ] Offer provenance present on 100% of trust-weighted ranking mutations
- [ ] False positive trust demotion rate **< 2%** on golden eval set

#### What must NOT be built yet
- Marketplace merchant onboarding portal
- User-generated merchant reviews UI
- Real-time inventory verification infrastructure (limited today — audit §7.4)
- Trust scores without provenance chain

#### Technical dependencies
- Phase 1 normalization (canonical offer identity)
- Phase 4 query kernel (trust-sensitive intent)
- `merchantIntelligence` in enrichProducts
- Phase 2 meta coherence

#### Activation strategy
Trust weights deploy in enrichment (always-on) before controlled layer trust mutation. Graph updates on cache TTL cadence; critical trust flag changes propagate via cache bust.

#### Commercialization impact
**Trust superiority — primary long-term moat.** QuantAI as the trust layer for AI commerce — licensable to any shopping surface. Regulator-friendly provenance chain.

---

### Phase 6 — Commerce Reasoning Visibility

**Timeline:** Sprints 14–18  
**Layer focus:** UX (decision signals only), Cognition, Governance, Simulation

#### Strategic goal
Make commerce reasoning **visible through decision signals** — not UI redesign (audit §6.1: intelligence lives in invisible meta JSON).

#### Architectural objective
- Structured **buying decision record** in meta: ranked factors, tradeoffs, confidence, governance verdict, rollback status.
- P6.6 commerce decision + P6.7 reasoning graph outputs exposed as **machine-readable decision API** (partner/integrator surface).
- P6.9 economic simulation outputs as counterfactual signals (telemetry-only in prod initially).
- No shopper-facing “AI thinking” animation — expose **decision primitives**: why this offer, why not that offer, what would change under different intent.

#### Production objective
Partners and power users can consume decision records; internal teams debug ranking without stale meta; A/B tests attribute lift to specific signals.

#### Measurable success criteria
- [ ] Decision record present on **100%** of search responses (may be minimal when layers OFF)
- [ ] Decision record product IDs match final ranking (Phase 2 dependency)
- [ ] Partner decision API schema versioned + documented
- [ ] Internal ranking debug time **↓ ≥ 50%** (operator metric)

#### What must NOT be built yet
- Consumer UI redesign / “AI chat” shopping interface
- Exposing raw governor internals to shoppers
- Marketing “AI-powered” badges before ranking lift proven (Phase 7)

#### Technical dependencies
- Phase 2 meta-ranking coherence
- Phase 7 layer activation (richer records require active layers)
- P6.6, P6.7, P6.8, P6.9 meta outputs

#### Activation strategy
Decision records deploy in **minimal form** with layers OFF (pre-stack signals only). Richness increases as layers activate in Phase 7 — schema backward-compatible.

#### Commercialization impact
**B2B differentiation.** QuantAI sells **explainable commerce intelligence**, not black-box rankings. Enables API licensing, partner integrations, compliance narratives.

---

### Phase 7 — Controlled Production Activation Program

**Timeline:** Sprints 8–20 (continuous program; starts after Phase 0 exit)  
**Layer focus:** Ranking, Cognition, Governance, Simulation

#### Strategic goal
Convert shadow infrastructure into **measurable production ranking impact** through disciplined single-layer activation (audit §8, §11 Phase F — recommend P6.2 multi-objective or P6.5 market reality first).

#### Architectural objective
- Layer activation playbook: one layer at a time, prod/canary opt-in, emergency shutdown tested, rollback runbook.
- Activation sequence (audit-aligned):
  1. **P6.2 multi-objective** OR **P6.5 market reality** (closest to commerce quality signals)
  2. P6.3 strategic ranking
  3. P6.6 commerce decision
  4. P6.7 reasoning graph (requires lower layers stable)
  5. P6.8 cognitive governance (always telemetry; mutation last)
  6. P6.9 economic simulation (telemetry-only prod; simulation informs ops)
- Never enable all 20 layers simultaneously (audit §7.3).
- CHECK lanes remain authoritative — no bypass to force mutation.

#### Production objective
Documented top-3 ranking lift from **≥ 1** controlled layer in production canary; zero replay integrity regressions; emergency shutdown exercised.

#### Measurable success criteria
- [ ] First layer prod-canaried: top-3 lift **≥ 5%** on target query partition over 2 weeks
- [ ] Emergency shutdown tested quarterly; recovery **< 60 seconds**
- [ ] Per-layer activation dashboard: mutation rate, lane distribution, confidence, rollback events
- [ ] Second layer activation only after first layer stable **≥ 4 weeks**
- [ ] Production readiness score **≥ B+** after first activation

#### What must NOT be built yet
- Simultaneous multi-layer prod enablement
- Bypassing CHECK lanes for demo purposes
- New layers during activation program
- “Full stack ON” marketing push

#### Technical dependencies
- Phase 0 complete (hard gate)
- Phase 1 normalization (hard gate)
- Phase 2 meta coherence (hard gate)
- Phase 3 ranking kernel
- Lazy-eval deployed (latency headroom for enabled layers)

#### Activation strategy
```
Telemetry-only (2 weeks) → Canary mutation 1% → 5% → 25% → Prod opt-in
Each gate requires: replay integrity ≥ 70, drift rollback clean, top-3 lift neutral or positive
Emergency shutdown env flag tested at each gate
```

#### Commercialization impact
**Proof of intelligence differentiation.** First defensible claim: “QuantAI controlled ranking improves commerce outcomes.” Unlocks premium tier, partner proof points, and investor narrative grounded in metrics — not meta complexity.

---

### Phase 8 — Commerce Memory Architecture

**Timeline:** Sprints 16–22  
**Layer focus:** Infrastructure, Cognition, Governance, Ranking

#### Strategic goal
Resolve the **policy tension** between pre-stack persona/session memory and P6.4+ memoryless governance (audit §10.5, §7.4) with an explicit commerce memory architecture.

#### Architectural objective
- Memory policy spec: what may persist (session intent, category affinity, explicit user prefs) vs what must remain memoryless (P6.4–P6.9 ranking mutation inputs).
- Unified policy coordinator: precedence rules when persona ranking conflicts with P6.8 cognitive governance.
- Session memory scoped to **opt-in personalization tier** — default path remains memoryless for controlled stack.
- Memory writes audited; memory reads visible in decision record (Phase 6).

#### Production objective
Predictable ranking behavior when layers activate; no silent personalization drift; regulatory explainability for memory use.

#### Measurable success criteria
- [ ] Policy precedence documented and CI-tested **≥ 50** conflict scenarios
- [ ] Memoryless invariant: P6.4–P6.9 engines receive zero session memory fields (automated guard)
- [ ] Opt-in personalization tier: explicit user consent flag wired
- [ ] Zero ranking regressions on memoryless default path in full-stack CI

#### What must NOT be built yet
- Expanded personalization memory without policy spec
- Cross-session profiling for ads
- Memory writes inside controlled apply layers
- Autonomous memory formation (Phase 9)

#### Technical dependencies
- Phase 7 at least one layer activated (conflict surfaces under mutation)
- P6.4 memoryless learning, P6.8 cognitive governance
- Pre-stack `applyPersonaRanking` + `commerceSessionMemory`

#### Activation strategy
Deploy policy coordinator in **shadow mode** (logs conflicts, no ranking change) → enforce precedence in canary → prod.

#### Commercialization impact
**Trust + compliance moat.** Explicit memory architecture enables enterprise deployment — retailers and regulators require explainable personalization boundaries.

---

### Phase 9 — Autonomous Commerce Cognition (Future)

**Timeline:** Sprints 22+ (gated on Phases 0–8 exit)  
**Layer focus:** Cognition, Simulation, Governance

#### Strategic goal
Enable **autonomous commerce cognition** — P6.7 reasoning graph and P6.9 economic simulation driving bounded, governed ranking adaptation — without autonomous agents or unbounded mutation.

#### Architectural objective
- P6.7 reasoning graph prod activation with circular influence detection (validated in P6.7 CI).
- P6.9 economic simulation: counterfactual ranking scenarios inform activation decisions (not direct mutation without governance pass).
- Autonomous = **self-adjusting bounded parameters within governance envelope** — not shopper-facing agents.
- Full P5.0–P6.9 stack activation in staged sequence (Phase 7 program extended).

#### Production objective
QuantAI adapts ranking strategy to market conditions within deterministic bounds; economic simulation predicts ranking impact before activation.

#### Measurable success criteria
- [ ] Reasoning graph active in prod with mutation **≤ 10%** of requests (CHECK lane gated)
- [ ] Economic simulation counterfactual accuracy **≥ 80%** directionally on eval (predicted lift vs actual)
- [ ] Zero autonomous mutation outside governance envelope (CI + runtime guard)
- [ ] Full-stack CI green with **≥ 8** layers prod-active

#### What must NOT be built yet
- Autonomous shopping agents
- Unbounded self-modifying ranking
- LLM-driven purchase execution
- Embedding RAG retrieval (Phase 10)

#### Technical dependencies
- Phases 0–8 complete
- Phase 7 activation program **≥ 4 layers** stable
- Governance kernel consolidated (Phase 0 RFC)
- Trust graph operational (Phase 5)

#### Activation strategy
Reasoning graph telemetry-only → simulation-informed parameter tuning → bounded autonomous mutation under P6.8 governance with P6.9 counterfactual pre-check.

#### Commercialization impact
**Category-defining capability.** “Autonomous commerce cognition with deterministic governance” — no competitor has P6.7–P6.9 depth with replay CI. Premium OS tier for enterprise commerce platforms.

---

### Phase 10 — Retrieval & Query Kernel (Long-Horizon)

**Timeline:** Post Phase 9 gate  
**Layer focus:** Infrastructure, Intelligence, Ranking

#### Strategic goal
Implement the **retrieval/query kernel** the audit scoped as true “Phase 7” — not another meta-layer clone (audit §8, §636 recommendation).

#### Architectural objective
- Deterministic retrieval over **normalized product graph** (Phase 1) — embeddings permitted only after normalization foundation proven.
- Query kernel (Phase 4) + retrieval kernel unified: intent → retrieve → rank → govern.
- SerpAPI remains acquisition layer; retrieval kernel is OS-internal candidate generation + reranking authority.
- No violation of P6 phase contracts: retrieval serves ranking kernel, not parallel shadow stack.

#### Production objective
Search quality surpasses heuristic + SerpAPI-only pipelines on long-tail and cross-retailer queries.

#### Measurable success criteria
- [ ] Long-tail query top-3 relevance **↑ ≥ 15%** vs Phase 3 baseline
- [ ] Retrieval latency **< 50ms** p95 incremental
- [ ] Normalized graph coverage **≥ 90%** of query volume
- [ ] Full replay integrity maintained

#### What must NOT be built yet
- Embedding-first retrieval before normalization (audit §7.3 — garbage-in reranking)
- Parallel retrieval stack bypassing governance
- Marketplace catalog ingestion

#### Technical dependencies
- Phase 1 normalization at scale
- Phase 4 query kernel
- Phase 5 trust graph
- Phase 7–9 activation maturity

#### Activation strategy
Retrieval kernel shadow mode (retrieve but don’t rank) → blend with existing pipeline → full authority transfer with rollback.

#### Commercialization impact
**Search superiority at scale.** QuantAI becomes the retrieval + ranking OS for AI-native commerce — the long-term dominance play.

---

## 4. End-to-End Timeline

```
2026 H1          2026 H2              2027 H1              2027 H2+
|---- Phase 0 ----|
     |---- Phase 1 ----|
          |---- Phase 2 ----|
               |---- Phase 3 ----|
                    |---- Phase 4 ----|
                         |---- Phase 5 ------------|
                              |-- Phase 6 --|
                         |---- Phase 7 (continuous activation) ---------->
                                              |-- Phase 8 --|
                                                   |-- Phase 9 --|
                                                        |-- Phase 10 --|
```

**Critical path:** Phase 0 → Phase 1 → Phase 2 → Phase 7 (first activation) → Phase 4 → Phase 5.  
Phases 3, 6, 8 may parallelize with constraints noted in dependencies.

---

## 5. Critical Architectural Risks (Master Register)

Consolidated from audit §10. Sustained across all phases until mitigated.

| ID | Risk | Severity | Mitigation phase | Status |
|----|------|----------|------------------|--------|
| R1 | Stale meta / downstream artifact drift | **Critical** | Phase 0 | Open |
| R2 | Sequential engine overhead (OFF layers still run) | **High** | Phase 0 | Open |
| R3 | Layer proliferation without consolidation | **High** | Phase 0 RFC → Phase 7 | Open |
| R4 | CI/prod gap (green CI ≠ prod impact) | **High** | Phase 7 | Open |
| R5 | Personalization vs memoryless policy conflict | **Medium** | Phase 8 | Open |
| R6 | Routing lane explosion (~150 lanes) | **Medium** | Phase 0 + Phase 4 | Open |
| R7 | Confidence inflation across layers | **Medium** | Phase 2 | Open |
| R8 | Missing normalization foundation | **High** | Phase 1 | Open |
| R9 | Shadow orchestration (pre-stack overrides controlled) | **High** | Phase 3 + Phase 7 | Open |
| R10 | Partial upstream meta propagation | **Medium** | Phase 2 | Open |

---

## 6. Scaling Bottlenecks

| Bottleneck | Current impact | Breakpoint | Resolution phase |
|------------|---------------|------------|------------------|
| 20 sequential engine evals per request | ms × 20 even when OFF | ~500 QPS per instance | Phase 0 lazy-eval |
| ~120s cache TTL on enrichment | Stale scores, slow trust graph updates | Real-time trust/commerce events | Phase 5 cache strategy revision |
| ~504 files / ~12 domain clones | Linear maintenance cost | Team size ~8 engineers | Phase 0 governance kernel |
| ~150 routing lanes | Combinatorial test gap | Any env var change | Phase 0 full-stack CI + Phase 4 lane matrix |
| SerpAPI single acquisition | Offer verification limited | Trust-sensitive at scale | Phase 5 + Phase 10 retrieval |
| Meta JSON assembly size | Response payload growth | Mobile clients / CDN | Phase 2 meta lifecycle pruning |
| 32 mutating stages | Latency accumulation | Sub-200ms search SLA | Phase 0 + Phase 3 kernel simplification |

---

## 7. Anti-Patterns to Avoid

| Anti-pattern | Why it destroys value | Audit reference |
|--------------|----------------------|-----------------|
| **Another P6.x 14-file clone** | Compounds duplication, latency, and invisibility | §8, §10.3 |
| **Enable all 20 layers in prod** | Compounding micro-deltas + latency; unexplainable ranking | §7.3 |
| **Bypass CHECK lanes for demos** | Destabilizes replay CI guarantees | §7.3 |
| **Embedding retrieval before normalization** | Garbage-in reranking | §7.3, §7.4 |
| **UI redesign to “show AI”** | Visibility without ranking improvement | §6.1, §7.2 |
| **Meta-only intelligence (no ranking wire)** | Perpetuates production invisibility | §6.1, §5.3 |
| **Expand persona memory under P6.4+** | Policy conflict; unpredictable ranking | §10.5 |
| **Assuming CI green = prod superiority** | False confidence | §10.4 |
| **Building marketplace features** | Scope creep; QuantAI is OS not marketplace | Strategic frame |
| **Autonomous shopping agents** | Violates phase contracts and governance model | §7.2 |

---

## 8. What Would Destroy the Architecture

These are **explicit stop conditions** — if any occur, halt forward phases and revert to Phase 0 stabilization.

1. **Stale meta shipped to production with layers active** — optimization loops learn wrong signals; partner APIs publish incorrect intelligence.
2. **CHECK lane bypass in production** — replay integrity guarantees void; rollback untrustworthy.
3. **Unbounded ranking mutation** — deterministic CIOS becomes unexplainable black box; regulatory and partner trust collapse.
4. **Continued layer cloning without governance kernel decision** — maintenance cost exceeds team capacity; subtle drift between 12 governor copies causes production incidents.
5. **All-layer simultaneous activation** — latency SLA breach + compounding micro-deltas produce ranking chaos.
6. **Embedding-first retrieval on unnormalized listings** — amplifies duplicate/wrong listings to top slots at scale.
7. **Personalization memory leaking into P6.4–P6.9 engines** — memoryless governance invariant broken; ranking non-deterministic across replays.
8. **Treating QuantAI as a marketplace product** — distracts from OS dominance; builds wrong commercial model.

---

## 9. What Would Create a True Moat

Moat comes from **OS-level capabilities competitors cannot replicate by adding one LLM rerank**.

| Moat pillar | QuantAI advantage | Built in phase | Defensibility |
|-------------|-------------------|----------------|---------------|
| **Deterministic replay CI across 20 layers** | Research-grade engineering rigor | Existing (P5–P6.9) | High — years to replicate |
| **Canonical commerce identity graph** | Normalization at tray build, not post-hoc | Phase 1 | High — data + spec |
| **Trust graph with offer provenance** | Regulator-friendly commerce trust layer | Phase 5 | High — graph accumulation |
| **Query understanding → ranking kernel** | Intent-driven deterministic commerce ranking | Phase 4 | Medium-high — eval corpus |
| **Governed bounded mutation** | Safe layer activation with emergency shutdown | Phase 0 + 7 | High — ops maturity |
| **Explainable decision records** | B2B API for commerce reasoning | Phase 6 | Medium — schema + data |
| **Memory policy architecture** | Enterprise-compliant personalization boundaries | Phase 8 | Medium — policy spec |
| **Autonomous cognition under governance** | P6.7–P6.9 with simulation pre-check | Phase 9 | Very high — full stack |
| **Retrieval + ranking unified OS** | AI-native commerce infrastructure | Phase 10 | Very high — network effects |

**Strongest compound moat:** Normalization (Phase 1) + Trust graph (Phase 5) + Query kernel (Phase 4) + Governed activation (Phase 7) + Decision API (Phase 6). Competitors can copy individual features; they cannot quickly replicate the **full CIOS stack with replay CI**.

---

## 10. Commercialization Model (OS, Not Marketplace)

QuantAI commercializes as **Commerce Intelligence OS**:

| Tier | Capability | Phase gate |
|------|------------|------------|
| **Core OS** | Deterministic ranking, normalization, query kernel | Phases 1, 3, 4 |
| **Trust OS** | Merchant trust graph, offer provenance | Phase 5 |
| **Governed OS** | Controlled layer activation, emergency shutdown, replay CI | Phases 0, 7 |
| **Reasoning OS** | Decision records, reasoning graph, economic simulation | Phases 6, 9 |
| **Full OS** | Retrieval kernel, autonomous cognition, memory architecture | Phases 8, 9, 10 |

**Revenue vectors (architecture-aligned, not feature-random):**
- API licensing (decision records, trust scores, ranking mutation)
- Partner integration (OS embedded in retailer/comparison platforms)
- Premium intelligence tier (activated layers with measurable lift)
- Enterprise compliance (memory policy, provenance, replay audit)

**Not in scope:** Marketplace transaction fees, merchant onboarding portals, consumer social features.

---

## 11. Success Definition — World-Class Platform

QuantAI reaches **world-class commerce intelligence platform** status when ALL of the following are true:

| # | Criterion | Target |
|---|-----------|--------|
| 1 | Production ranking impact | **≥ 3** controlled layers active with documented top-3 lift |
| 2 | Meta-ranking coherence | **100%** consistency, CI-enforced |
| 3 | Normalization coverage | **≥ 90%** query volume |
| 4 | Trust graph | **≥ 80%** top retailers covered |
| 5 | Query kernel | Intent-driven ranking on **100%** of queries |
| 6 | Latency | p95 search **< 200ms** with **≥ 8** layers telemetry-active |
| 7 | Replay integrity | **≥ 70** across all prod partitions |
| 8 | Production readiness score | **≥ A- (85%+)** |
| 9 | Decision API | Versioned, partner-integrated, **100%** response coverage |
| 10 | Full-stack CI | P4.8→P6.9 + retrieval kernel in single command |

---

## 12. Immediate Next Actions (Next 30 Days)

Aligned with audit §11 Phase A–B and Pre-P7 exit checklist:

1. **Fix stale meta** — recompute `dealClusters` / `searchIntelligence` after controlled stack; add CI guard.
2. **Wire latency budget** — call `buildLatencyBudgetReport` in route.ts.
3. **Implement lazy-eval fast path** — skip 20 engine calls when P5–P6.9 block disabled.
4. **Kick off normalization RFC** — canonical listing identity spec (Phase 1 parallel start).
5. **Governance kernel RFC** — consolidate vs clone decision within 30 days.
6. **Do not start Phase 7 layer development** — stabilization is the only approved work stream.

---

## 13. Document Control

| Field | Value |
|-------|-------|
| Document | QUANTAI_MASTER_ROADMAP.md |
| Location | `docs/architecture-audit/` |
| Source of truth | QUANTAI_FULL_ARCHITECTURE_AUDIT.md |
| Supersedes | Ad-hoc Phase 7 proposals; feature-roadmap items not audit-aligned |
| Next review | After Pre-P7 exit checklist completion |

---

*QuantAI is a Commerce Intelligence OS. This roadmap optimizes for long-term dominance through architecture stabilization, deterministic ranking superiority, trust intelligence, and governed activation — not marketplace features or UI redesign.*
