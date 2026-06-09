# Phase 2D — Product Reasoning Engine

**Principle:** Explainable reasoning layer from match + truth evidence — no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/productReasoningEngine.ts` — builds `ProductReasoningSnapshot` from fused truth foundation layers.

---

## ProductReasoningSnapshot

```typescript
{
  recommendationStrength: "STRONG" | "GOOD" | "CAUTION" | "WEAK" | "UNKNOWN";
  reasoningConfidence: number;
  topPositiveReasons: string[];
  topNegativeReasons: string[];
  bestFor: string[];
  notIdealFor: string[];
  summaryReason: string;
  shortReason: string;
  explainabilityScore: number;
}
```

Attached on `TruthFoundationSnapshot.productReasoning`.

---

## Inputs

Consumes (via `ProductReasoningInput`):

- `productMatch` (Phase 2C)
- `intentEngine` (Phase 2A)
- `intentRetrieval` (Phase 2B)
- `trustEngine` (Phase 1M)
- `evidenceReasoningGraph` (Phase 1L)
- `commerceReasoning` (Phase 1K)
- `commerceIntelligence` (Phase 1J)
- `productIntelligence` (Phase 1I)

---

## Integration

Built in `buildTruthFoundationSnapshot` after `productMatch`.

Search evidence fields: `recommendationStrength`, `productReasoningConfidence`, `explainabilityScore`, `summaryReason`, `shortReason`, reason counts, `reasoningEvidenceChain`, `hasProductReasoning`.

Alignment flags only in `truthConfidenceGate` (`phase2d_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2d-product-reasoning
npm run test:phase1-truth-regression
```
