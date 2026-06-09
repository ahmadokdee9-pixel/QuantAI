# Phase 1G — Market Intelligence Layer

**Principle:** Unified market-level truth rollups feed downgrade-only gates without UI or ranking changes.

---

## Module

`lib/truth/marketTruthRollup.ts` — builds `MarketIntelligenceSnapshot` from cross-merchant aggregation + price/availability signals.

---

## MarketIntelligenceSnapshot

```typescript
{
  marketDepth: number;              // merchant breadth + history depth
  marketCoverage: number;           // observation coverage score
  marketAgreementScore: number;     // cross-merchant agreement
  marketPriceConfidence: number;    // price truth + spread + outlier penalty
  marketAvailabilityConfidence: number;
  consensusState: string;           // CONSENSUS_* from Phase 1F
  referencePrice: number | null;
  marketSpread: number | null;
}
```

Attached on `TruthFoundationSnapshot.marketIntelligence`.

---

## Score Derivation

| Field | Inputs |
|-------|--------|
| `marketDepth` | merchantCount bands + baseline samples |
| `marketCoverage` | merchants × 16 + sample bonuses − spread penalty |
| `marketAgreementScore` | Phase 1F `merchantAgreementScore` |
| `marketPriceConfidence` | priceTruthConfidence + merchants − spread/outlier |
| `marketAvailabilityConfidence` | consensus + listing availability state + freshness |

---

## Downgrade-Only Gates (Phase 1G)

Requires `hasMarketIntelligenceSignal()` — ≥2 merchants OR ≥3 price samples OR priceTruthConfidence ≥45.

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `marketDepth` < 50 | `downgrade_thin_market_depth` | → COMPARE |
| `marketAgreementScore` < 55 | `downgrade_low_market_agreement` | → COMPARE |
| `marketSpread` ≥ 22% | `downgrade_high_market_spread` | → COMPARE |
| `marketPriceConfidence` < 45 | `downgrade_weak_market_price_confidence` | → COMPARE |
| `marketAvailabilityConfidence` < 50 | `downgrade_weak_market_availability_confidence` | → WAIT |

Phase 1F gates preserved. No promotion logic.

---

## Tests

```bash
npm run test:phase1g-market-intelligence
npm run test:phase1-truth-regression
```

---

## Next: Phase 1H

Merchant Reliability Intelligence — **Complete** — see `docs/TRUTH_PHASE_1H_ARCHITECTURE.md`.
