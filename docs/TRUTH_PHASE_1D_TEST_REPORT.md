# Phase 1D — Test Report

**Command:** `npm run test:phase1d-price-truth`  
**Result:** **9/9 PASS**

Regression: `test:phase1b-refresh-worker` **9/9 PASS** · `tsc --noEmit` **PASS**

| Check | Result |
|-------|--------|
| No UI / search / truth gate wiring | PASS |
| 30d / 90d / 365d baselines | PASS |
| Baseline coverage | PASS |
| Reference prices (90d primary) | PASS |
| VERIFIED_DISCOUNT → qualified label | PASS |
| Fake discount (inflated reference) | PASS |
| Insufficient history | PASS |
| Historical price dedupe | PASS |
| priceTruthConfidence | PASS |
