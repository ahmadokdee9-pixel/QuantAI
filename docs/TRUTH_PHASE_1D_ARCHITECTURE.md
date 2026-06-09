# Phase 1D — Price History + Discount Verification

**Principle:** Historical evidence over marketing claims.

---

## Schema

### `historical_price_observations`

| Column | Purpose |
|--------|---------|
| `canonical_sku_id` | Links to Phase 1C registry |
| `merchant_key` | amazon, walmart, bestbuy, target, ebay, … |
| `observed_price` | Numeric price point |
| `currency` | EUR / USD / GBP |
| `observed_at` | Timestamp |
| `availability_status` | From availability pipeline |
| `listing_url` | Optional merchant listing |

Written by refresh worker after availability insert (when `canonicalSkuId` + price present).

---

## Engines

| Module | Output |
|--------|--------|
| `priceHistoryEngine.ts` | 30d / 90d / 365d min, median, avg, delta |
| `referencePriceEngine.ts` | `referencePrice30d/90d/365d`, primary reference |
| `fakeDiscountDetector.ts` | Inflated ref, markup-then-sale, thin history |
| `discountVerificationEngine.ts` | Internal states → Phase 1A qualified bands |
| `priceTruth.ts` | `PriceTruthBundle` aggregator |

---

## Discount States (internal)

| State | Qualified band (user-facing) |
|-------|------------------------------|
| `VERIFIED_DISCOUNT` | Exceptional Discount Signal |
| `POSSIBLE_DISCOUNT` | Discount Signal |
| `UNVERIFIED_DISCOUNT` | Weak / Fake Discount Signal |
| `NO_DISCOUNT` | Weak Discount Signal |

Never emits raw "Verified Discount" per Phase 1A policy.

---

## PriceTruthBundle

```typescript
{
  priceTruthConfidence: number;      // 0–100
  discountEvidence: DiscountEvidence;
  baselineCoverage: BaselineCoverage;
  baselines, referencePrices, verification, fakeDiscount
}
```

Phase **1D.5** will wire `priceTruthConfidence` into `computeTruthConfidence()`.

---

## Boundaries

- No UI / search / ranking / BUY READY promotion changes in 1D
- Refresh worker only write path for historical observations
