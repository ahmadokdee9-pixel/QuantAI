# QuantAI — Live vs Dormant Capability Map

**Purpose:** Remove due-diligence ambiguity about what runs in production by default.  
**Rule:** Classification reflects **default production / beta stabilization posture** as of Acquisition Sprint 2, based on source flags and wiring — not marketing names.

| Class | Meaning |
|-------|---------|
| **LIVE** | On the default buyer-visible path; required for core demo |
| **LIVE SUPPORTING** | Runs or is available in production path; may be optional env |
| **DORMANT** | Code present; flags default OFF; skipped when shadow stack disabled |
| **EXPERIMENTAL** | Shadow/canary/meta-only; not product authority |
| **DEPRECATED** | Abandoned or superseded; do not enable |

---

## LIVE

| Subsystem | Evidence |
|-----------|----------|
| Search API orchestration | `app/api/search/route.ts` |
| SerpAPI shopping fetch | `app/api/search/lib/fetchShopping.ts`, `SERPAPI_KEY` |
| Live commerce discovery (timeout-bounded) | `lib/intelligence/liveCommerceDiscovery.ts` + stabilization defaults |
| Product enrichment | `lib/intelligence/enrichProducts.ts` |
| Deal clusters / search intelligence DTO | `lib/deals`, `lib/intelligence/searchDecisionEngine.ts` |
| Phase A canonical ranking | `lib/truth/canonicalSearchRank.ts` |
| Ranking decision records / truth foundation for rank | `lib/truth/rankingDecisionRecord.ts`, truth loaders |
| Decision calibration (BUY/COMPARE/AVOID/BEST VALUE) | `lib/ui/canonicalDecisionCalibration.ts` |
| Phase 45 production readiness activation | `lib/ui/phase45ProductionReadinessActivation.ts` |
| Results surface / cards / compare UI | `components/search/*` |
| Merchant diversity safeguard | `lib/search/merchantDiversityRerank.ts` |
| Discount authenticity engines (used when evidence exists) | e.g. `realDiscountProofEngine`, `discountConfidenceEngine` via intel blobs |
| Production stabilization (cache, stale-prefer, timeouts) | `lib/search/productionStabilizationEnv.ts`, wired in search route |
| Clerk auth | `@clerk/nextjs`, layout + APIs |
| Supabase persistence APIs | `/api/intelligence/*`, `lib/supabaseAdmin.ts` |
| Stripe billing routes | `/api/stripe/*` |

---

## LIVE SUPPORTING

| Subsystem | Evidence |
|-----------|----------|
| Heuristic commerce AI (beta default) | `QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI`, `attachCommerceAiLayer` |
| OpenAI commerce/compare/copilot | Requires `OPENAI_API_KEY`; compare-verdict / ai-chat |
| Phase 92 tray integrity / Phase 93 trust-discount / Phase 95 memory meta | Applied on search path |
| Controlled ranking execution helpers | `lib/ranking/*` (feeds meta; Phase A still final order authority) |
| Query / buyer-model meta builders | Built on search path for meta; do not override Phase A |
| Rate limiting | `lib/rate-limit.ts` — Upstash if configured, else memory |
| Guest stale tray / circuit breaker | `lib/search/searchReliabilityGuardrails.ts` |
| Cron listing refresh | `/api/cron/refresh-listings` + `CRON_SECRET` |
| Analytics event API | `/api/analytics/event` (+ optional sink) |
| Intent/taste meta when flags off | Stub/disabled metas still attached for telemetry shape |

---

## DORMANT (flags default OFF)

Evidence: `lib/**/flags.ts` use `parseBool(..., false)`; `isProductionShadowStackDisabled()` skips chain when all off (`lib/search/productionStabilizationEnv.ts`).

| Subsystem | Flag / evidence |
|-----------|-----------------|
| Identity foundation (apply stack) | `QUANTAI_IDENTITY_FOUNDATION_ENABLED` |
| Trust engine (flagged module) | `QUANTAI_TRUST_ENGINE_ENABLED` |
| Commerce memory foundation | `QUANTAI_COMMERCE_MEMORY_ENABLED` |
| Recommendation cognition | `QUANTAI_RECOMMENDATION_COGNITION_ENABLED` |
| Autonomous commerce OS | `QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED` |
| Controlled activation (apply) | `QUANTAI_CONTROLLED_ACTIVATION_ENABLED` |
| Commerce evolution | `QUANTAI_COMMERCE_EVOLUTION_ENABLED` |
| Commerce brain | `QUANTAI_COMMERCE_BRAIN_ENABLED` |
| Live adaptive commerce signals | `QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED` |
| Autonomous commerce identity | `QUANTAI_AUTONOMOUS_COMMERCE_IDENTITY_ENABLED` |
| Predictive commerce intent | `QUANTAI_PREDICTIVE_COMMERCE_INTENT_ENABLED` |
| Autonomous commerce strategy | `QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED` |
| Universal commerce intelligence (flagged) | `QUANTAI_UNIVERSAL_COMMERCE_INTELLIGENCE_ENABLED` |
| Emotional commerce intelligence | `QUANTAI_EMOTIONAL_COMMERCE_INTELLIGENCE_ENABLED` |
| Autonomous commerce evolution | `QUANTAI_AUTONOMOUS_COMMERCE_EVOLUTION_ENABLED` |
| Normalization APPLY | `QUANTAI_NORMALIZATION_ENABLED` / `QUANTAI_NORMALIZATION_APPLY` (off; production confirm required) |
| Many intent APPLY / runtime / orchestration prod flags | Documented OFF in `.env.example` / beta env tests |

---

## EXPERIMENTAL

| Subsystem | Evidence |
|-----------|----------|
| Normalization shadow telemetry | Shadow stages without APPLY |
| Taste / intent canary & observability metas | Built for telemetry; not ranking authority |
| Unified controlled stack layers when individually enabled | Governance kernel; fast-path when registry empty |
| Architecture-audit stage1-shadow docs | `docs/architecture-audit/stage1-shadow/` |

---

## DEPRECATED / NOT FOR BUYER PITCH

| Item | Evidence |
|------|----------|
| Cosmic UI experiments | Removed from `components/`; stale mentions may remain under `docs/design-audit/` |
| Orphan theme CSS iterations | Historical; active CSS imports are limited in `app/globals.css` |
| Stock create-next-app README | Replaced in Sprint 2 |

---

## Diligence statement

A buyer should evaluate QuantAI on the **LIVE** core (search → Phase A → calibration → decision surface).  
Dormant modules are **engineering inventory**, not live differentiators, until explicitly enabled, tested, and disclosed.
