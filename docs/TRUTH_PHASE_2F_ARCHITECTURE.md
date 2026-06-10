# Phase 2F — Explainable AI Output Layer

**Principle:** Natural-language buying intelligence from recommendation + truth evidence — no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/explainableAIEngine.ts` — builds `ExplainableAISnapshot` from fused truth foundation layers.

---

## ExplainableAISnapshot

```typescript
{
  headline: string;
  recommendationNarrative: string;
  whyThisProduct: string;
  strengths: string[];
  weaknesses: string[];
  trustSummary: string;
  valueSummary: string;
  bestFor: string[];
  avoidIf: string[];
  finalVerdict: string;
  explainabilityConfidence: number;
}
```

Attached on `TruthFoundationSnapshot.explainableAI`.

---

## Inputs

Consumes (via `ExplainableAIInput`):

- `intentEngine.intent` (Phase 2A)
- `productMatch` (Phase 2C)
- `productReasoning` (Phase 2D)
- `recommendationIntelligence` (Phase 2E)
- `trustEngine` (Phase 1M)
- `commerceIntelligence` (Phase 1J)

---

## Integration

Built in `buildTruthFoundationSnapshot` after `recommendationIntelligence`.

Search evidence fields: headline, narrative, whyThisProduct, strength/weakness counts, trust/value summaries, finalVerdict, explainabilityConfidence, `explainableEvidenceChain`, `hasExplainableAI`.

Alignment flags only in `truthConfidenceGate` (`phase2f_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2f-explainable-ai
npm run test:phase1-truth-regression
```
