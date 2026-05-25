# Beta latency probe

**Generated:** 2026-05-25T21:41:32.872Z  
**Base URL:** https://quant-ai-app.vercel.app

| Metric | Value | Gate |
|--------|------:|------|
| p50 | 8644ms | — |
| p95 (cold) | 12879ms | ≤ 8000ms |
| max | 12879ms | — |
| success | 5/5 | all OK |


**Verdict (cold p95):** FAIL — re-run before Phase 1 invites; see `BETA_LAUNCH_READINESS_SCORE.md` for prior PASS sweep.

**Note:** Latency varies with SerpAPI cold path; cache probe (`npm run test:beta-cache-dedupe`) may still PASS when p95 probe fails.


## Per query (cold)

| Query | Status | ms | Products |
|-------|--------|---:|---------:|
| iphone 16 | 200 | 1093 | 23 |
| airpods | 200 | 12879 | 20 |
| gaming monitor | 200 | 4101 | 18 |
| sofa | 200 | 8644 | 27 |
| adidas samba | 200 | 12226 | 26 |

