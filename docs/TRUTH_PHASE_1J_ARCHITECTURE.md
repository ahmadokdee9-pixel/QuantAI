# Phase 1J — Universal Commerce Intelligence Core

**Principle:** Fused commerce confidence from all Phase 1 truth pillars — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/universalCommerceIntelligence.ts` — builds `CommerceIntelligenceSnapshot` from truth foundation + product intelligence.

---

## CommerceIntelligenceSnapshot

```typescript
{
  productConfidence: number;
  marketConfidence: number;
  merchantConfidence: number;
  priceConfidence: number;
  availabilityConfidence: number;
  discountConfidence: number;
  commerceConfidence: number;
  commerceState: "COMMERCE_STRONG" | "COMMERCE_GOOD" | "COMMERCE_CAUTION" | "COMMERCE_WEAK" | "COMMERCE_UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.commerceIntelligence`.

---

## Input Aggregation

| Pillar | Source |
|--------|--------|
| Product | `productIntelligence.overallProductConfidence` |
| Market | `productIntelligence.marketConfidence` |
| Merchant | `productIntelligence.merchantReliabilityConfidence` |
| Price | `productIntelligence.priceTruthConfidence` |
| Availability | `productIntelligence.availabilityConfidence` |
| Discount | `productIntelligence.discountConfidence` |

**commerceConfidence:** weighted blend (22/20/16/18/12/12).

---

## Downgrade-Only Gates

Requires `hasCommerceIntelligence` (canonical SKU present).

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `commerceConfidence` < 52 | `downgrade_weak_commerce_confidence` | → COMPARE |
| `marketConfidence` < 45 (with market signal) | `downgrade_weak_market_truth` | → COMPARE |
| `merchantConfidence` < 45 (≥2 merchant obs) | `downgrade_weak_merchant_truth` | → COMPARE |
| `productConfidence` < 48 | `downgrade_weak_product_truth` | → COMPARE |

Phase 1A–1I gates preserved.

---

## Tests

```bash
npm run test:phase1j-universal-commerce-intelligence
npm run test:phase1-truth-regression
```

---

## Next: Phase 1K

Autonomous Commerce Reasoning Layer — reasoning fusion on unified commerce intelligence.
