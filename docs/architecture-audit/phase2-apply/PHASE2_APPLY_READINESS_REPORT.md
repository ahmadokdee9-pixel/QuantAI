# Phase 2 APPLY Readiness Report

**Generated:** 2026-05-24T00:06:10.370Z  
**Base URL:** https://quant-ai-app.vercel.app  
**APPLY enabled:** false (by design)  
**Ranking mutation:** false

## Safe APPLY readiness verdict

| Field | Value |
|-------|-------|
| **Verdict** | **OBSERVING** |
| **Score** | 73/100 |
| **Critical gates** | FAILURES |
| **Recommendation** | BLOCKED: falseCollapseIncidents > 0. Fix variant boundaries before any APPLY discussion. |

## Measured duplicate reduction (shadow projection)

| Metric | Value |
|--------|------:|
| Avg top-3 duplicate rate (before) | 0 |
| Avg projected top-3 duplicate rate | 0 |
| **Avg measured duplicate reduction** | **0** |
| Avg projected ranking lift | 0 |

## False collapse metrics

| Metric | Value |
|--------|------:|
| Live total falseCollapseIncidents | 1 |
| Offline APPLY+shadow false collapses | 0 |

## Merchant diversity impact

| Metric | Value |
|--------|------:|
| Avg merchant diversity delta | 0 |

## Canonical identity consistency

| Metric | Value |
|--------|------:|
| Avg canonical identity coverage | 1 |
| Tray unchanged (shadow) | 7/7 |

## Ranking drift impact (offline APPLY simulation)

| Metric | Value |
|--------|------:|
| Max top-5 drift (offline) | 3 |
| Rollback safe (all fixtures) | YES |

## Latency impact

| Metric | Value |
|--------|------:|
| Normalization p50 | 109ms |
| Normalization p95 | 270ms |
| Search p95 | 6217ms |

## Gates

| Gate | Status | Value | Threshold |
|------|--------|------:|-----------|
| shadow_telemetry_active | PASS | 7/7 | 100% probes shadow-enabled |
| apply_disabled_live | PASS | 7/7 | APPLY=false on all live probes |
| tray_size_invariant | PASS | 7/7 | inputCount === outputCount (shadow) |
| false_collapse_zero | FAIL | 1 | 0 total falseCollapseIncidents |
| canonical_identity_coverage | PASS | 1 | >= 0.85 avg coverage |
| semantic_coherence | FAIL | 0 | >= 0.80 top-5 coherence |
| projected_duplicate_reduction | PASS | 0 | >0 projected reduction OR low baseline dup rate |
| merchant_diversity_non_negative | PASS | 0 | >= 0 avg merchant diversity delta |
| normalization_latency_p95 | FAIL | 270 | <= 250ms p95 (interim gate) |
| offline_apply_false_collapse | PASS | 0 | 0 offline APPLY false collapses |
| offline_apply_top5_drift | PASS | 3 | <= 3 top-5 drift slots (offline simulation) |

## Production env (shadow only — do NOT set APPLY=true)

```
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true
```

## Log events to monitor

- `quantai.normalization.shadow`
- `quantai.normalization.shadow.audit` (duplicate collapse monitoring)

---
*DO NOT enable production APPLY until verdict is READY_FOR_CANARY and 14-day observation completes.*
