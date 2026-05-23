# Production Shadow Telemetry Report

**Generated:** 2026-05-23T01:35:16.918Z  
**Stage:** 1 — Shadow rollout (APPLY=false)  
**Status:** Awaiting live probe — run `npm run test:stage1-shadow-probe`

## Aggregate metrics (live golden queries)

| Metric | Value | Target |
|--------|------:|--------|
| Queries probed | 0 | ≥8 |
| Shadow enabled responses | 0 | 100% |
| Tray unchanged (no mutation) | 0 | 100% |
| Avg top-3 duplicate rate (before) | — | baseline |
| Avg projected ranking lift | — | >0 |
| Avg canonical identity coverage | — | ≥85% |
| Avg semantic coherence (top-5) | — | ≥80% |
| Avg merchant diversity delta | — | ≥0 |
| Total false collapse incidents | 0 | 0 |
| Avg rollout readiness score | —/100 | ≥65 observe, ≥85 APPLY review |

## Latency (live traffic)

| Percentile | Search total | Normalization compute |
|------------|-------------:|----------------------:|
| p50 | —ms | —ms |
| p95 | —ms | —ms |
| p99 | —ms | —ms |

**Gate:** normalization p95 < 5ms; search p95 regression < 5% vs baseline.

## Telemetry channels

1. **Search response meta:** `normalizationProduction`, `normalizationStage1`, `normalizationShadowPostControlled`
2. **Production logs:** `quantai.normalization.shadow` JSON events
3. **Analytics sink:** `quantai.normalization.shadow` (when `QUANTAI_ANALYTICS_SINK_URL` set)

## Per-query samples

_No live samples yet._

---
*Shadow mode: zero ranking mutation. APPLY remains false.*
