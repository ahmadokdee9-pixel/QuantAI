# Phase 1E — Truth Foundation Stabilization

**Principle:** Truth gates use DB-backed observations at decision time, not search-time freshness defaults.

---

## Delivered

| Module | Role |
|--------|------|
| `availabilityStateModel.ts` | `AVAILABLE` / `UNAVAILABLE` / `UNKNOWN` / `STALE` |
| `truthFoundationLoader.ts` | Batch DB prefetch + serialize/parse for search meta |
| `truthDebug.ts` | Structured trace when `TRUTH_DEBUG=true` |
| `availabilityObservation.ts` | `getLatestAvailabilityObservationBySkuId`, `getLatestObservationsBySkuIds` |
| `historicalPriceObservation.ts` | `listHistoricalPriceObservationsForSkus` |
| `truthEvidenceBuilder.ts` | Snapshot from prefetch; gate reads snapshot-first |
| `truthConfidenceGate.ts` | Downgrade via `availabilityState` |
| Search route | `meta.truthFoundationPrefetch` (server prefetch) |
| Phase 45 | Optional `truthPrefetchByLink` param |

---

## Data Flow

```
Search API
  → prefetchTruthFoundationBatch(products)
  → availability_observations (by listing URL + SKU id)
  → historical_price_observations (by canonical SKU id)
  → meta.truthFoundationPrefetch

ProductResultsSurface (data wiring only)
  → parseTruthFoundationPrefetch(searchMeta)
  → buildProductionReadinessDecisionMap(..., truthPrefetchByLink)
  → attachTruthFoundationToDecision(prefetch)
  → applyTruthGateToDecision
```

---

## Availability State Model

| State | Derivation |
|-------|------------|
| `UNAVAILABLE` | `out_of_stock`, `removed`, `seller_unavailable` |
| `STALE` | DB observation with age > 24h or freshness < 80 |
| `AVAILABLE` | `in_stock` / `limited` with fresh observation |
| `UNKNOWN` | No DB observation; inline product text only |

---

## TruthFoundationSnapshot (Phase 1E)

```typescript
{
  canonicalSkuId,
  skuIdentityConfidence,
  availabilityState,
  availability: { freshnessScore, listingAgeHours, observedAt, availabilityStatus },
  priceTruthConfidence,
  baselineCoverage,
  discountEvidence,
  debugTrace?, // TRUTH_DEBUG=true only
}
```

---

## Debug Trace

Set `TRUTH_DEBUG=true` to attach `debugTrace` on each snapshot with data sources, observation counts, and discount state. No UI exposure — alignment/debug only.

---

## Boundaries

- No UI redesign (prefetch passed via existing `searchMeta`)
- No BUY READY promotion
- Downgrade-only gates preserved
- Inline fallback when DB/storage unavailable

---

## Tests

```bash
npm run test:phase1e-truth-foundation
npm run test:phase1-truth-regression
```

---

## Next: Phase 1F

Cross Merchant Truth Aggregation — canonical SKU rollups across merchants for unified truth confidence.
