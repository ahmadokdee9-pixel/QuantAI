# Phase 1F — Cross Merchant Truth Aggregation

**Principle:** Canonical SKU truth aggregates across merchants for market-level reference, consensus, and downgrade-only gates.

---

## Modules

| Module | Role |
|--------|------|
| `crossMerchantTruthAggregator.ts` | Price reference, spread, agreement score |
| `availabilityConsensusModel.ts` | `CONSENSUS_*` states |
| `truthFoundationTypes.ts` | Extended snapshot + evidence fields |
| `truthEvidenceBuilder.ts` | Runs aggregator on historical rows |
| `truthConfidenceGate.ts` | Phase 1F downgrade gates |

---

## Cross-Merchant Reference Price

Per canonical SKU (90-day window, latest observation per merchant):

1. Collect merchant prices
2. **Outlier rejection** — IQR (1.5×)
3. **Median** on cleaned set
4. **Trimmed mean** (10% trim)
5. **Reference** = average of median + trimmed mean

---

## Availability Consensus

| State | Rule |
|-------|------|
| `CONSENSUS_AVAILABLE` | ≥60% merchants in_stock/limited |
| `CONSENSUS_UNAVAILABLE` | ≥60% out_of_stock/removed/seller_unavailable |
| `CONSENSUS_CONFLICT` | ≥30% available AND ≥30% unavailable |
| `CONSENSUS_UNKNOWN` | Insufficient or mixed weak signal |

---

## TruthFoundationSnapshot (Phase 1F fields)

```typescript
{
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;  // (max-min)/median %
  merchantAgreementScore: number;    // 0–100
  listingPriceOutlier: boolean;      // current > reference × 1.22
}
```

---

## Downgrade-Only Gates

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| Listing price > reference × 1.22 (≥2 merchants) | `downgrade_cross_merchant_price_outlier` | → COMPARE |
| `CONSENSUS_CONFLICT` | `downgrade_cross_merchant_availability_conflict` | → WAIT |
| `merchantAgreementScore` < 55 (≥2 merchants) | `downgrade_weak_cross_merchant_agreement` | → COMPARE |

No promotion logic. No ranking changes.

---

## Tests

```bash
npm run test:phase1f-cross-merchant-truth
npm run test:phase1-truth-regression
```

---

## Next: Phase 1G

Market Intelligence Layer — **Complete** — see `docs/TRUTH_PHASE_1G_ARCHITECTURE.md`.
