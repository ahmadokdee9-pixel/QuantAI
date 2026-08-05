# H-02 Verification Report

**Date:** 2026-08-05  
**Scope:** H-02 only (nonsense → unrelated products)  
**Result:** **PASS**  
**Rollback used:** No  
**Rollback tag:** `rollback-h02-20260806-001443` @ `7ca0889`  
**Commit:** `465a50e`  
**Deployment:** https://www.quantaihq.com  
**Other Highs:** Untouched  

---

## Root cause

`getGuestStaleTray` fell back to `latestGuestTray` when the current query had no same-key stale entry. After any successful guest search (e.g. Dyson V15), a nonsense / upstream-failing query recovered that prior tray via `upstream_fail_stale_tray`, returning unrelated products with `success: true`.

---

## Files changed

| File | Change |
|------|--------|
| `lib/search/searchReliabilityGuardrails.ts` | Same-key stale only; remove cross-query `latestGuestTray` fallback |
| `scripts/test-h02-stale-cross-query.mjs` | Regression |
| `scripts/qa-independent-h02.mjs` | Independent QA |

---

## Tests added

- `npx tsx scripts/test-h02-stale-cross-query.mjs` — cross-key stale must be empty; same-key still works.

Local gates: ESLint PASS · `tsc` PASS · `npm run build` PASS · phase9 reliability PASS.

---

## Production evidence

### Pre-fix
Warm `Dyson V15` → then `asdfghjkl qwerty nonexistent product xyzzy` ×5:  
**5/5** returned Dyson products · `upstream_fail_stale_tray`.

### Post-fix (independent QA)
Warm Dyson (18 products) → nonsense ×5:  
- i1: `502` · `upstream_fail_empty` · **0 products**  
- i2–i5: `429` · empty · **0 products**  
- Unrelated hits: **0/5**  
- Nike control: 22 · Critical hostile: 400  

---

## Launch Board

| Item | Action |
|------|--------|
| H-02 | **Removed** |
| Remaining High | **4** |
| Next (approval required) | **H-05** |
