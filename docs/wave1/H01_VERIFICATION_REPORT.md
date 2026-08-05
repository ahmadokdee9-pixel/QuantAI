# H-01 Verification Report

**Date:** 2026-08-05  
**Scope:** H-01 only (empty trays on popular exact SKUs)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h01-20260805-225308` @ `0bbcce3`  
**Commit:** `58ee94f`  
**Deployment:** https://www.quantaihq.com (aliased from `quant-fdhaqgm9g-ahmadokdee9-pixels-projects.vercel.app`)  
**H-02…H-07:** Untouched  

---

## Root cause

Three cooperating defects emptied exact-SKU trays:

1. **Query envelope triplication** — `buildEnvelope` used `expandQueryForListingMatch`, turning `dyson v15` into `dyson v15 dyson v15 dyson v15`. That corrupted `detectModel` into brand-reinjected model strings and caused identity mismatches.
2. **Dyson brand collapse** — listing brand extraction mapped Dyson → `appliance-brand`, so exact-SKU brand evidence failed; listings fell to `same_product_family` and were excluded under `exact_sku`, with recovery fusion below the floor.
3. **Weak model/category evidence** — Nike model needed version (`pegasus 41`); home category evidence for Dyson stick vacuums needed English titles without the word “vacuum”; model token fallback on listing blobs.

---

## Files changed

| File | Change |
|------|--------|
| `lib/search/queryUnderstanding.ts` | Clean envelope; `matchExpansion` separate |
| `lib/search/canonicalQuery.ts` | Cleaner model capture (Pegasus/Vomero + version; strip brand reinjection) |
| `lib/deals/productIdentity.ts` | Named `dyson` brand; V15/Pegasus model patterns |
| `lib/intelligence/productIdentity.ts` | Dyson home category evidence; model evidence blob fallback |
| `scripts/test-h01-empty-search-identity.mjs` | Regression |

---

## Tests added

- `npx tsx scripts/test-h01-empty-search-identity.mjs` — canonical model cleanliness + identity gate keeps real Dyson V15 / Nike Pegasus 41 fixtures.

Local gates: ESLint (touched) PASS · `tsc --noEmit` PASS · `npm run build` PASS · H-01 regression PASS.

---

## Production evidence

### Pre-fix (reproduce)

| Query | success | products |
|-------|---------|----------|
| Dyson V15 | true | **0** |
| Nike Pegasus 41 | true | **0** |
| MacBook Pro 14 (control) | true | 27 |

### Post-fix (3× each)

| Query | ok | products (runs) |
|-------|----|-----------------|
| Dyson V15 | 3/3 | 4, 18, 18 |
| Nike Pegasus 41 | 3/3 | 4, 24, 24 |
| MacBook Pro 14 | 3/3 | 27, 27, 27 |

---

## Independent QA

- Script: `scripts/qa-independent-h01.mjs`
- Evidence: `docs/wave1/H01_INDEPENDENT_QA.json`
- Verdict: **PASS**
- Critical control (C-01 hostile `/api/decision/run`): still `400` / `QUERY_HOSTILE`
- No unrelated regression observed → no rollback

---

## Launch Board

| Item | Action |
|------|--------|
| H-01 | **Removed** (independently verified) |
| H-02…H-07 | Unchanged |
| Remaining High | **6** |
| Next (approval required) | **H-06** |
