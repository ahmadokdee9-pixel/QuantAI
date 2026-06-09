# Phase 1B.2 — Test Report

**Date:** June 2026  
**Command:** `npm run test:phase1b-availability-intelligence`  
**Result:** **17/17 PASS** (offline, no network)

---

## Summary

| Area | Checks | Status |
|------|--------|--------|
| Wiring guards (no UI / verdict / cron) | 1 | PASS |
| SerpApi classifier | 5 | PASS |
| Freshness scoring | 2 | PASS |
| Change detector | 5 | PASS |
| Refresh adapter | 4 | PASS |

Typecheck: `npx tsc --noEmit` — **PASS**

---

## Wiring Guards

Verified that Phase 1B.2 modules are **not** connected to production surfaces:

- `ProductResultsSurface.tsx` — no `availabilityIntelligence` / `listingRefreshAdapter` imports
- `truthConfidenceGate.ts` — no `freshnessScore` integration (Phase 1A unchanged)
- `app/api/cron/refresh-listings/route.ts` — not present
- `vercel.json` — not present

---

## AvailabilityClassifier

| Case | Input | Expected | Result |
|------|-------|----------|--------|
| In stock | `extensions: ["In stock"]` | `IN_STOCK` | PASS |
| Out of stock | `extensions: ["Out of stock"]` | `OUT_OF_STOCK` | PASS |
| Limited | `extensions: ["Only 2 left in stock"]` | `LIMITED` | PASS |
| Preorder | `extensions: ["Preorder"]` | `LIMITED` | PASS |
| Structural | `structuralLabel: "REMOVED"` | `REMOVED` | PASS |
| DB map | `IN_STOCK` → `in_stock` | Correct | PASS |

---

## Freshness Scoring

| Age (hours) | Expected score | Result |
|-------------|----------------|--------|
| 0, 23.9 | 100 | PASS |
| 24, 47.9 | 80 | PASS |
| 48, 71.9 | 60 | PASS |
| 72, 200 | 30 | PASS |

Timestamp helper: 6h offset → band `fresh`, score 100 — PASS

---

## Change Detector

| Transition | Expected change | Result |
|------------|-----------------|--------|
| in_stock → out_of_stock | `stock_in_to_out` + `out_of_stock` alert | PASS |
| out_of_stock → in_stock | `stock_out_to_in` + `back_in_stock` alert | PASS |
| in_stock → removed | `listing_removed` | PASS |
| in_stock → seller_unavailable | `seller_disappeared` | PASS |
| €200 → €180 (−10%) | `price_drop_major` + `price_dropped` alert | PASS |

Default thresholds: drop 8%, up 12%.

---

## Listing Refresh Adapter

| Case | Expected | Result |
|------|----------|--------|
| URL normalize | Trailing slash / host case insensitive | PASS |
| Exact link match | `matchReason: exact_link` | PASS |
| Matched product | `in_stock`, freshness 100 at write time | PASS |
| Miss (other store only) | `REMOVED` | PASS |
| Seller in tray, link missing | `SELLER_UNAVAILABLE` | PASS |

---

## Files Added

```
lib/truth/availabilityClassifier.ts
lib/truth/freshnessScore.ts
lib/truth/availabilityChangeDetector.ts
lib/truth/listingRefreshAdapter.ts
lib/truth/availabilityIntelligence.ts
scripts/test-phase1b-availability-intelligence.mjs
docs/TRUTH_PHASE_1B_2_ARCHITECTURE.md
docs/TRUTH_PHASE_1B_2_TEST_REPORT.md
```

Package script: `test:phase1b-availability-intelligence`

---

## Not Tested (deferred)

- Live SerpApi fetch (1B.3 cron)
- Supabase insert round-trip (requires migration applied + env)
- Truth gate downgrades (1B.5)
- Alert UI / watchlist sync (1B.6)

---

## How to Re-run

```bash
npm run test:phase1b-availability-intelligence
npx tsc --noEmit
```
