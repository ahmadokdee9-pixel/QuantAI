# Phase 2I — User Decision Intelligence Layer

**Principle:** Buying decision behavior and strategy detection — evidence only, no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/userDecisionIntelligenceEngine.ts` — builds `UserDecisionSnapshot` from intent, conversational, taste, and recommendation layers.

---

## UserDecisionSnapshot

```typescript
{
  decisionStrategy:
    | "bestValue"
    | "bestQuality"
    | "premiumChoice"
    | "budgetChoice"
    | "longTermInvestment"
    | "fastPurchase"
    | "safeChoice"
    | "experimentalChoice";
  decisionBehavior: string;
  strategyScores: {
    bestValue: number;
    bestQuality: number;
    premiumChoice: number;
    budgetChoice: number;
    longTermInvestment: number;
    fastPurchase: number;
    safeChoice: number;
    experimentalChoice: number;
  };
  decisionSignals: string[];
  decisionConfidence: number;
  decisionEvidenceChain: string[];
}
```

Attached on `TruthFoundationSnapshot.userDecisionIntelligence`.

---

## Inputs

Consumes (via `UserDecisionIntelligenceInput` + raw query):

- `intentEngine` (2A)
- `conversationalIntent` (2G)
- `tastePreference` (2H)
- `recommendationIntelligence` (2E)
- `trustEngine` (1M) — read-only for safeChoice scoring
- `productReasoning` (2D) — via upstream confidence signals

---

## Integration

Built in `buildTruthFoundationSnapshot` after `tastePreference`.

Multilingual query support (English + Arabic) via envelope matching.

Alignment flags only in `truthConfidenceGate` (`phase2i_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2i-user-decision-intelligence
npm run test:phase1-truth-regression
```
