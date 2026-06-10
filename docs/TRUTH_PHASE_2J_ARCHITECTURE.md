# Phase 2J — Purchase Motivation Intelligence Layer

**Principle:** Underlying purchase motivation detection — evidence only, no UI, ranking, trust, or recommendation engine changes.

---

## Module

`lib/truth/purchaseMotivationEngine.ts` — builds `PurchaseMotivationSnapshot` from intent, conversational, taste, and user decision layers.

---

## PurchaseMotivationSnapshot

```typescript
{
  motivation: PurchaseMotivation;
  motivationScores: PurchaseMotivationScores;
  motivationSignals: string[];
  motivationConfidence: number;
  motivationEvidenceChain: string[];
}
```

### Motivations (15)

`productivity`, `status`, `luxury`, `enjoyment`, `gaming`, `creativity`, `work`, `education`, `travel`, `fitness`, `gifting`, `replacement`, `necessity`, `curiosity`, `innovation`

Attached on `TruthFoundationSnapshot.purchaseMotivation`.

---

## Inputs

Consumes (via `PurchaseMotivationInput` + raw query):

- `intentEngine` (2A) — use case, product type, category
- `conversationalIntent` (2G)
- `tastePreference` (2H)
- `userDecisionIntelligence` (2I)

---

## Integration

Built in `buildTruthFoundationSnapshot` after `userDecisionIntelligence`.

Multilingual query support (English + Arabic) via envelope matching.

Alignment flags only in `truthConfidenceGate` (`phase2j_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2j-purchase-motivation
npm run test:phase1-truth-regression
```
