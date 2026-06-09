# Phase 1H — Merchant Reliability Intelligence

**Principle:** Per-listing merchant trust from observation history — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/merchantReliabilityTruth.ts` — builds `MerchantReliabilitySnapshot` for the listing merchant (`normalizeMerchantKey`).

---

## MerchantReliabilitySnapshot

```typescript
{
  merchantReliabilityScore: number;
  merchantAvailabilityReliability: number;
  merchantPricingReliability: number;
  merchantFreshnessReliability: number;
  merchantVolatilityScore: number;
  merchantState: "RELIABLE" | "VOLATILE" | "UNRELIABLE" | "STALE" | "UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.merchantReliability` (+ internal `merchantObservationCount`).

---

## Score Inputs

| Signal | Source |
|--------|--------|
| Availability reliability | in_stock/limited vs unavailable across merchant observations |
| Pricing reliability | price CV, deviation from merchant median, reference spike |
| Freshness reliability | latest price/availability observation age |
| Volatility score | coefficient of variation × 220 (higher = worse) |
| Overall score | Weighted blend (25/30/25/20) |

---

## Downgrade-Only Gates

Requires `merchantObservationCount >= 2`.

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `merchantReliabilityScore` < 45 | `downgrade_unreliable_merchant` | → COMPARE |
| `merchantVolatilityScore` ≥ 65 | `downgrade_highly_volatile_merchant` | → COMPARE |
| `merchantAvailabilityReliability` < 50 | `downgrade_poor_merchant_availability_reliability` | → WAIT |
| Stale freshness / `STALE` state | `downgrade_stale_merchant_observations` | → WAIT |
| `merchantPricingReliability` < 45 | `downgrade_abnormal_merchant_pricing` | → COMPARE |

Phase 1A–1G gates preserved.

---

## Tests

```bash
npm run test:phase1h-merchant-reliability
npm run test:phase1-truth-regression
```

---

## Next: Phase 1I

Universal Product Intelligence Foundation — unified product-level truth snapshot for decision systems.
