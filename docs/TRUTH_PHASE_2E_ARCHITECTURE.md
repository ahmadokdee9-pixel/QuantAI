# Phase 2E — Recommendation Intelligence Layer

**Principle:** Final recommendation tier on intent/match/reasoning + intelligence — no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/recommendationIntelligenceEngine.ts` — builds `RecommendationSnapshot` from fused truth foundation layers.

---

## RecommendationSnapshot

```typescript
{
  recommendationTier: "BEST_MATCH" | "RECOMMENDED" | "CONSIDER" | "NOT_RECOMMENDED";
  recommendationScore: number;
  confidenceScore: number;
  recommendationSummary: string;
  primaryRecommendationReason: string;
  primaryWarningReason: string;
  shouldRecommend: boolean;
  shouldHighlight: boolean;
  recommendationEvidenceChain: string[];
}
```

Attached on `TruthFoundationSnapshot.recommendationIntelligence`.

---

## Inputs

Consumes (via `RecommendationIntelligenceInput`):

- `intentEngine.intent` (Phase 2A)
- `productMatch` (Phase 2C)
- `productReasoning` (Phase 2D)
- `trustEngine` (Phase 1M)
- `commerceIntelligence` (Phase 1J)
- `productIntelligence` (Phase 1I)

---

## Integration

Built in `buildTruthFoundationSnapshot` after `productReasoning`.

Search evidence fields: tier, scores, summary, primary reasons, flags, `recommendationEvidenceChain`, `hasRecommendationIntelligence`.

Alignment flags only in `truthConfidenceGate` (`phase2e_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2e-recommendation-intelligence
npm run test:phase1-truth-regression
```
