# Critical Hardening Verification Report

**Date:** 2026-08-05  
**Scope:** C-01 + C-02 only  
**Result:** **PASS**  
**Rollback used:** No  
**Wave 2:** Remains **LOCKED**  
**High issues:** Unchanged (7 remain)

---

## Root cause

### C-01
`/api/decision/run` accepted any non-empty string (including HTML/XSS) and, with `forcedDomain: "hotel"`, called the hotel adapter. SerpAPI returned candidates for the hostile string, and the route wrapped them as `success: true` + `action: BUY`.

### C-02
For `forcedDomain: "product"`, `runUniversalDecision` intentionally returns `decision: null` + `routedToProductPipeline: true` (product live path is `/api/search`). The route still called `jsonOk(...)`, emitting `success: true` with `decision: null`.

---

## Files changed

| File | Change |
|------|--------|
| `app/api/decision/run/route.ts` | Strict validate → run → map; 4xx/422 fail-closed |
| `lib/universalDecision/validateDecisionRunRequest.ts` | Schema + hostile markup/prompt rejection |
| `lib/universalDecision/decisionRunResponse.ts` | `isCompleteValidDecision` + `mapDecisionRunOutcome` |
| `lib/universalDecision/criticalDecisionRunFixtures.ts` | Exact production C-01/C-02 payloads |
| `scripts/test-critical-decision-run.mjs` | Regression tests |
| `package.json` | `test:critical-decision-run` script |

---

## Tests added

- `npm run test:critical-decision-run` — fixtures for C-01 hostile reject, C-02 null-decision mapping, valid hotel/flight schema accept.

Local gates: `tsc` PASS · ESLint (touched) PASS · critical tests PASS · router tests PASS · `npm run build` PASS.

---

## Production evidence (uncached)

**Commit:** `71d43136eee48591f1ab29786b9ddda5f6b552bc`  
**Deployment URL:** https://www.quantaihq.com  
**Rollback tag:** `rollback-critical-hardening-20260805-114909` @ `59146ec`  
**Evidence file:** `docs/wave1/CRITICAL_HARDENING_PROD_EVIDENCE.json`

### C-01 — 10/10
- URL: `https://www.quantaihq.com/api/decision/run`
- Payload: `{"query":"<img src=x onerror=alert(1)>","forcedDomain":"hotel"}`
- Actual: `400` · `success:false` · `code:QUERY_HOSTILE` · no BUY action

### C-02 — 10/10
- Payload: `{"query":"MacBook Pro 14","forcedDomain":"product"}`
- Actual: `422` · `success:false` · `code:PRODUCT_PIPELINE_REQUIRED` · `decision:null` · never `success:true`

### Valid domains still work
- Hotel: `200` success BUY · 12 candidates  
- Flight: `200` success WAIT · 11 candidates  
- Subscription: `200` success WAIT · 1 candidate  

### Unaffected
- Search: MacBook Pro 14 returned products  
- Auth protect: `/dashboard` still gated  
- Billing: `/api/billing/subscription` not 5xx  
- Rate limit: health `rateLimit.shared=true`

---

## QA / Launch Board

| Item | Action |
|------|--------|
| C-01 | **Removed** from Critical QA register |
| C-02 | **Removed** from Critical QA register |
| High (H-01…H-07) | Unchanged |
| Wave 2 | Locked |
| Remaining Critical | **0** |
| Remaining High | **7** |
