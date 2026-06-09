# Phase 1I — Universal Product Intelligence Foundation

**Principle:** Unified product-level truth rollup — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/productIntelligenceFoundation.ts` — builds `ProductIntelligenceSnapshot` from `TruthFoundationSnapshot` inputs.

---

## ProductIntelligenceSnapshot

```typescript
{
  canonicalSkuId: string;
  skuIdentityConfidence: number;
  availabilityConfidence: number;
  priceTruthConfidence: number;
  discountConfidence: number;
  merchantReliabilityConfidence: number;
  marketConfidence: number;
  overallProductConfidence: number;
  intelligenceState: "PRODUCT_CONFIDENT" | "PRODUCT_CAUTION" | "PRODUCT_WEAK" | "PRODUCT_UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.productIntelligence`.

---

## Input Aggregation

| Pillar | Source |
|--------|--------|
| SKU identity | `skuIdentityConfidence` |
| Availability | `availabilityState` + freshness |
| Price truth | `priceTruthConfidence` |
| Discount | `discountEvidence.state` + fake discount |
| Merchant reliability | `merchantReliability.merchantReliabilityScore` |
| Market | `marketIntelligence` rollup blend |

**Overall confidence:** weighted blend (16/14/18/10/16/26).

---

## Downgrade-Only Gates

Requires `hasProductIntelligence` (canonical SKU present).

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `overallProductConfidence` < 52 | `downgrade_weak_overall_product_confidence` | → COMPARE |
| `marketConfidence` < 45 (with market signal) | `downgrade_weak_product_market_confidence` | → COMPARE |
| `merchantReliabilityConfidence` < 45 (≥2 merchant obs) | `downgrade_weak_product_merchant_confidence` | → COMPARE |
| Composite product truth < 48 | `downgrade_weak_product_truth_confidence` | → COMPARE |

Phase 1A–1H gates preserved.

---

## Tests

```bash
npm run test:phase1i-product-intelligence
npm run test:phase1-truth-regression
```

---

## Next: Phase 1J

Universal Commerce Intelligence Core — commerce decision fusion on unified product intelligence.
