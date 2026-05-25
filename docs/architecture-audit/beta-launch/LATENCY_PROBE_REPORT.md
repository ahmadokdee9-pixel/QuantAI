# Beta latency probe

**Generated:** 2026-05-25 (production stabilization validation)  
**Base URL:** https://quant-ai-app.vercel.app

## Cold path (first probe per query, empty CDN cache)

| Metric | Value | Gate |
|--------|------:|------|
| p50 | 4784ms | — |
| p95 (cold) | **4953ms** | ≤ 8000ms |
| max | 4953ms | — |
| success | 5/5 | all OK |

**Verdict (cold p95):** **PASS**

| Query | Status | ms | Products |
|-------|--------|---:|---------:|
| iphone 16 | 200 | 801 | 32 |
| airpods | 200 | 578 | 30 |
| gaming monitor | 200 | 4929 | 28 |
| sofa | 200 | 4953 | 33 |
| adidas samba | 200 | 4784 | 32 |

## Warm path (second probe per query, same session)

| p50 | p95 | Gate |
|-----|-----|------|
| 680ms | 869ms | PASS |

## Cached guest pipeline (subsequent probe run)

| p50 | p95 |
|-----|-----|
| 735ms | 831ms |

See `latency-probe.json` for latest automated run output.

**Note:** Deploy stabilization changes to Vercel if `shadow_stack_skipped` is not yet in production stage logs. Re-probe after deploy with fresh queries: `BETA_LATENCY_QUERIES="unique query 1,..." npm run test:beta-latency-probe`.
