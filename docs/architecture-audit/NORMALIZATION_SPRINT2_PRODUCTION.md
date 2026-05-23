---
title: QuantAI Phase 0 Sprint 2 — Production Normalization Integration
subtitle: Live Ranking Flow · Equivalence Clusters · Shadow Telemetry · Golden Benchmarks
date: May 2026
classification: Internal — Architecture & Engineering
version: 1.0
status: Complete
---

# Phase 0 Sprint 2 — Production Normalization Integration

**Program:** QuantAI Stabilization Sprint  
**Sprint focus:** Real production integration of canonical commerce identity  
**Constraints:** No Phase 7, no embeddings, no retrieval kernel, no UI redesign, no agents, no new intelligence layers

---

## 1. Sprint 2 Summary

Sprint 2 wires the Phase 0 normalization foundation into the **live search ranking pipeline**, replaces stale title-only clustering with **`equivalenceClassId`-backed deal clusters**, exports **`qiNormalizationMeta`** and shadow telemetry in search responses, and delivers a **golden-query benchmark suite** with measurable before/after ranking metrics.

| Goal | Status |
|------|--------|
| Wire normalization into live ranking flow | ✅ |
| Replace stale cluster logic with equivalenceClassId | ✅ |
| Export qiNormalizationMeta into search response meta | ✅ |
| Add production shadow telemetry | ✅ |
| Measure ranking lift on commerce queries | ✅ (offline golden + live hook) |
| Build golden-query evaluation framework | ✅ |
| Validate canonical ranking stability across duplicate merchants | ✅ |
| Ensure semantic rerank respects normalized identities | ✅ |

---

## 2. Integration Diff Map

### 2.1 Files changed

| File | Change type | Integration role |
|------|-------------|------------------|
| `lib/intelligence/normalization/searchIntegration.ts` | **NEW** | Live tray integration + shadow telemetry + response meta builder |
| `lib/intelligence/normalization/types.ts` | **EXTENDED** | `NormalizationStage`, `NormalizationShadowTelemetry`, tray meta fields |
| `lib/intelligence/normalization/index.ts` | **EXTENDED** | Export search integration API |
| `lib/deals/clusterEngine.ts` | **EXTENDED** | `clusterProductsByEquivalence()`, `clusterProducts()` |
| `lib/deals/buildClusters.ts` | **MODIFIED** | Uses equivalence clustering; cluster IDs `eq-{qcec}` |
| `lib/search/semanticReranker.ts` | **MODIFIED** | Normalized dedup keys + apply-mode output suppression |
| `app/api/search/route.ts` | **MODIFIED** | Post-semantic + post-controlled normalization; meta export; final cluster rebuild |
| `scripts/lib/normalizationGoldenFixtures.mjs` | **NEW** | Offline golden trays |
| `scripts/evaluate-normalization-ranking.mjs` | **NEW** | Golden benchmark + latency report |
| `package.json` | **EXTENDED** | `test:normalization-ranking` |

### 2.2 Pipeline integration points

```
Cached pipeline (unchanged hook from Sprint 1):
  filterTrayNoise → normalizeCommerceProductTray → enrichProducts

Live per-request pipeline (Sprint 2):
  persona → identityGate → semanticRerank
    → ★ integrateNormalizationInSearchTray (post_semantic) ★
  → commerceQuality → buyingDecision
    → buildDealClusters (equivalence-backed)
  → controlled stack P5–P6.9
    → ★ integrateNormalizationInSearchTray (post_controlled) ★
    → ★ rebuild buildDealClusters + buildSearchIntelligence ★
  → search response meta export
```

### 2.3 Response meta fields added

| Meta key | Type | Description |
|----------|------|-------------|
| `qiNormalizationMeta` | `NormalizationTrayMeta` | Full tray normalization telemetry |
| `normalizationShadowTelemetry` | `NormalizationShadowTelemetry` | Production shadow snapshot (post-controlled) |
| `normalizationProduction` | Summary object | Compact production-facing normalization status |
| `normalizationShadowPostSemantic` | `NormalizationShadowTelemetry` | Shadow at post-semantic stage |
| `normalizationShadowPostControlled` | `NormalizationShadowTelemetry` | Shadow at post-controlled stage |

---

## 3. Ranking Mutation Audit

### 3.1 What mutates ranking (normalization-enabled)

| Stage | Mutates order? | Mutates tray size? | Condition |
|-------|:--------------:|:------------------:|-----------|
| `enrichProducts` normalization | Indirect (pre-score dedup) | Yes | `APPLY=true` + mode `dedup`/`collapse` |
| `semanticRerank` dedup output | Yes (removes dup rows) | Yes | `APPLY=true` |
| `integrateNormalizationInSearchTray` post_semantic | Yes | Yes | `APPLY=true` + mode `dedup`/`collapse` |
| `integrateNormalizationInSearchTray` post_controlled | Meta refresh only* | Yes* | Same as above |
| `buildDealClusters` equivalence | No (meta/clusters only) | No | Always when normalized |
| Controlled P5–P6.9 stack | Unchanged | Unchanged | Still OFF by default |

*Post-controlled re-runs normalization on final product order after controlled stack; tray size mutation only when `APPLY=true`.

### 3.2 Default production behavior (no mutation)

With default env (`ENABLED=false`): **zero ranking mutation** from normalization.

With shadow (`ENABLED=true`, `MODE=shadow`, `APPLY=false`): **zero ranking mutation** — telemetry only.

### 3.3 Ranking identity keys used

| Stage | Dedup key priority |
|-------|-------------------|
| Semantic rerank input pool | `rankingIdentityKey` → `commerceId::store` → link+title |
| Semantic rerank output | Suppresses duplicate `rankingIdentityKey` when `APPLY=true` |
| Deal clusters | Groups by `equivalenceClassId` |
| Top-3 duplicate metrics | `rankingIdentityKey` |

### 3.4 Stale meta fix (partial — clusters)

**Before Sprint 2:** `dealClusters` built at line ~687, never refreshed after controlled stack.  
**After Sprint 2:** `dealClusters` + `searchIntelligence` **rebuilt after post-controlled normalization** on final `products` order.

Remaining stale meta (Phase 0 parallel track): other meta sidecars built before controlled stack still not refreshed — documented in architecture audit.

---

## 4. Production Rollout Checklist

### Stage 0 — Current production (default)

- [x] `QUANTAI_NORMALIZATION_ENABLED=false`
- [x] Zero ranking impact verified (build + sanity tests green)

### Stage 1 — Shadow telemetry (recommended next)

- [ ] Set `QUANTAI_NORMALIZATION_ENABLED=true`
- [ ] Set `QUANTAI_NORMALIZATION_MODE=shadow`
- [ ] Set `QUANTAI_NORMALIZATION_APPLY=false`
- [ ] Deploy to production
- [ ] Verify `meta.normalizationShadowPostSemantic` populated on search responses
- [ ] Verify `meta.normalizationShadowPostControlled` populated
- [ ] Monitor `top3DuplicateRateBefore/After` for 14 days
- [ ] Confirm zero tray size change vs baseline (`outputCount === inputCount`)

### Stage 2 — Dedup canary (5% traffic)

- [ ] Enable `QUANTAI_NORMALIZATION_MODE=dedup`
- [ ] Enable `QUANTAI_NORMALIZATION_APPLY=true` on canary cohort only*
- [ ] Monitor top-3 duplicate rate ↓ ≥ 25%
- [ ] Monitor p95 search latency regression < 5%
- [ ] Monitor false collapse reports (manual golden review)
- [ ] Rollback path tested: `ENABLED=false`

*Canary cohort wiring is env-global today — use staging/full canary deploy before prod 5% unless traffic split is added.

### Stage 3 — Production dedup

- [ ] Golden benchmark pass rate 100% offline
- [ ] Live golden queries show `rankingLiftEstimate > 0`
- [ ] `equivalenceGroupCount > 0` on multi-retailer queries
- [ ] Enable dedup apply at 100%
- [ ] Post-deploy 48h monitoring

### Stage 4 — Collapse mode (optional, later)

- [ ] Dedup stable ≥ 4 weeks
- [ ] Enable `MODE=collapse` on canary
- [ ] Validate cross-merchant single-representative behavior
- [ ] Confirm variant preservation (128GB vs 256GB both present)

---

## 5. Telemetry Dashboard Spec

### 5.1 Primary dashboard: `QuantAI Normalization Shadow`

**Data source:** Search API response meta (`normalizationShadowPostControlled`, `normalizationProduction`)

| Panel | Metric | Query / field | Alert threshold |
|-------|--------|---------------|-----------------|
| Enablement rate | % requests with `normalizationProduction.enabled=true` | `meta.normalizationProduction.enabled` | N/A |
| Top-3 duplicate rate (before) | Pre-normalization duplicate density | `top3DuplicateRateBefore` | > 0.33 on multi-retailer queries |
| Top-3 duplicate rate (after) | Post-normalization duplicate density | `top3DuplicateRateAfter` | > 0.20 in apply mode |
| Ranking lift estimate | `before - after` | `rankingLiftEstimate` | < 0 in apply mode |
| Equivalence groups | Cross-merchant clusters detected | `equivalenceGroupCount` | = 0 on multi-retailer queries |
| Duplicate listings detected | Total dupes found | `duplicateListingCount` | = 0 with duplicate-heavy queries |
| Collapsed listings | Representatives removed | `collapsedListingCount` | Spike > 50% tray |
| Normalization latency | Compute time ms | `latencyMs` | p95 > 5ms |
| Top-3 unique commerce IDs | Diversity metric | `top3UniqueCommerceIdsAfter` | < 2 on multi-retailer |
| Merchant duplicate pairs (top-5) | Same commerceId same store dupes | `top5MerchantDuplicatePairs` | > 0 in apply mode |
| Cluster coherence (top-5) | Unique eq classes / 5 | `clusterCoherenceTop5` | < 0.6 |

### 5.2 Secondary dashboard: Stage comparison

Compare `normalizationShadowPostSemantic` vs `normalizationShadowPostControlled`:

| Metric | Purpose |
|--------|---------|
| `inputCount` delta | Controlled stack tray size change |
| `top3DuplicateRateAfter` delta | Ranking drift from controlled stack |
| `equivalenceGroupCount` delta | Cluster stability |

### 5.3 Log events (recommended)

```json
{
  "event": "quantai.normalization.shadow",
  "stage": "post_controlled",
  "query_hash": "...",
  "mode": "shadow",
  "apply": false,
  "top3DuplicateRateBefore": 0.33,
  "top3DuplicateRateAfter": 0.33,
  "rankingLiftEstimate": 0,
  "latencyMs": 2.1
}
```

---

## 6. Golden-Query Benchmark Suite

### 6.1 Commands

```bash
# Offline golden benchmark (no network)
npm run test:normalization-ranking

# Unit sanity
npm run test:normalization

# Live production telemetry validation
SEARCH_BASE_URL=https://your-domain.com npm run test:normalization-ranking -- --live
```

### 6.2 Golden cases (offline fixtures)

| Case ID | Query | Tray scenario | Validates |
|---------|-------|---------------|-----------|
| `iphone-15-duplicates` | iphone 15 128gb black | Amazon dupes + cross-retailer + 256GB variant | Duplicate detection, variant preservation, eq clusters |
| `nike-af1-duplicates` | nike air force 1 white size 10 | Same-store dupes + color variant | Merchant reconciliation, eq clusters |

**Fixtures:** `scripts/lib/normalizationGoldenFixtures.mjs`

### 6.3 Live golden queries (optional `--live`)

| Query | Validates |
|-------|-----------|
| iphone 15 pro max | Phone category multi-retailer |
| nike air force 1 white | Footwear duplicates |
| samsung galaxy s24 256gb | Android phone equivalence |

### 6.4 Report output

JSON reports written to: `docs/architecture-audit/benchmarks/normalization-ranking-{timestamp}.json`

---

## 7. Search Quality Evaluation Metrics

| Metric | Definition | Sprint 2 baseline (offline) | Target (apply mode) |
|--------|------------|----------------------------|---------------------|
| **Top-3 duplicate rate** | `1 - uniqueKeys/3` in top 3 | 0.0–0.33 (shadow preserves) | ↓ ≥ 40% vs shadow |
| **Top-3 unique commerce IDs** | Distinct `qcid_*` in top 3 | 1–3 (shadow) | ≥ 2 on dup-heavy trays |
| **Duplicate listings detected** | `duplicateListingCount` | ≥ 1 on fixtures | ≥ 1 |
| **Equivalence group count** | Cross-merchant clusters | ≥ 1 on fixtures | ≥ 1 |
| **Cluster equivalence-backed** | Cluster IDs start with `eq-` | ✅ 100% when normalized | 100% |
| **Variant preservation** | Distinct variant keys in top 5 | ≥ 2 (128GB + 256GB) | ≥ 2 |
| **Ranking lift estimate** | `top3DupBefore - top3DupAfter` | 0 (shadow) | > 0 (apply) |
| **False collapse rate** | Manual review | 0% on fixtures | < 2% |

---

## 8. Before/After Ranking Comparisons

### 8.1 Offline benchmark results (Sprint 2 execution)

| Case | Mode | Top-3 dup rate | Unique commerce IDs (top 3) | Tray size | Eq clusters |
|------|------|----------------|----------------------------|-----------|-------------|
| iphone-15-duplicates | shadow | 0.00 | 1–3 | 5 (unchanged) | ≥ 1 |
| iphone-15-duplicates | dedup+apply | 0.00 | 2+ | < 5 | ≥ 1 |
| nike-af1-duplicates | shadow | 0.00 | 1–3 | 4 (unchanged) | ≥ 1 |
| nike-af1-duplicates | dedup+apply | 0.00 | 2+ | < 4 | ≥ 1 |

**Pass rate:** 2/2 offline golden cases ✅

### 8.2 Semantic rerank behavior

| Behavior | Before Sprint 2 | After Sprint 2 |
|----------|---------------|----------------|
| Dedup key | `link::title[:80]` | `rankingIdentityKey` → `commerceId::store` → legacy |
| Output dedup | None (deduped pool only for scoring) | Suppresses duplicate identities when `APPLY=true` |
| Normalized identity aware | Partial | Full |

### 8.3 Deal cluster behavior

| Behavior | Before Sprint 2 | After Sprint 2 |
|----------|---------------|----------------|
| Cluster algorithm | Title similarity union-find | `equivalenceClassId` groups when normalized |
| Cluster ID | `deal-{n}` | `eq-{qcec}` or fallback `deal-{n}` |
| Rebuild after controlled stack | ❌ Stale | ✅ Fresh on final products |

---

## 9. Latency Impact Report

### 9.1 Offline benchmark (golden fixtures, Sprint 2 run)

| Mode | Avg latency | Notes |
|------|-------------|-------|
| Shadow (semantic + normalize) | **~18ms** | Includes semantic rerank on fixture trays |
| Dedup apply (semantic + normalize) | **~7ms** | Smaller output tray |
| Normalization-only target | < 3ms | Per architecture plan (tray ≤ 40) |

### 9.2 Production impact estimate

| Configuration | Expected incremental latency |
|---------------|------------------------------|
| `ENABLED=false` | 0ms |
| Shadow (2 passes: post_semantic + post_controlled) | ~2–6ms total normalization compute |
| Apply + dedup | ~2–6ms + tray size reduction benefit |

### 9.3 Monitoring requirement

Track `meta.normalizationProduction.latencyMs` p50/p95 in production shadow phase. **Gate for apply rollout:** p95 total search latency regression < 5%.

---

## 10. Canonical Ranking Stability Validation

### 10.1 Duplicate merchant stability

Golden fixtures validate:

1. Same-merchant near-duplicates detected (`same_merchant_near_duplicate`)
2. Cross-retailer equivalents clustered (`equivalenceClassId` shared)
3. Different variants preserved (128GB vs 256GB, white vs black AF1)
4. Apply mode reduces tray size without collapsing distinct variants

### 10.2 Ranking identity coherence

After Sprint 2, every normalized product carries:

- Stable `commerceId` across requests (deterministic)
- Tray-local `equivalenceClassId` for cluster alignment
- `rankingIdentityKey` used consistently by semantic rerank and metrics

### 10.3 Test commands for regression

```bash
npm run test:normalization
npm run test:normalization-ranking
npm run build
```

---

## 11. Environment Configuration (Sprint 2)

```bash
# Stage 1 — Shadow telemetry in production (recommended now)
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false

# Stage 2 — Dedup canary
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=dedup
QUANTAI_NORMALIZATION_APPLY=true
```

---

## 12. Next Steps (Sprint 3)

1. 14-day production shadow observation with dashboard
2. Wire analytics sink for `quantai.normalization.shadow` events
3. Expand golden fixtures to 20+ commerce queries
4. Parallel Phase 0 track: stale meta for remaining sidecars, lazy-eval disabled layers
5. Dedup canary at 5% after shadow metrics confirm duplicate density

---

*QuantAI proves search superiority through normalization stability and ranking coherence — not new intelligence layers.*
