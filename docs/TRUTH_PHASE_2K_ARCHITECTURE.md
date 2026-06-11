# Phase 2K — Purchase Constraints Intelligence Layer

**Principle:** User constraint and hard requirement detection — evidence only, no UI, ranking, trust, or recommendation engine changes.

---

## Module

`lib/truth/purchaseConstraintsEngine.ts` — builds `PurchaseConstraintsSnapshot` from intent, conversational, taste, motivation, and decision layers.

---

## PurchaseConstraintsSnapshot

```typescript
{
  primaryConstraint: PurchaseConstraint;
  constraintScores: PurchaseConstraintScores;
  hardRequirements: string[];
  constraintSignals: string[];
  constraintConfidence: number;
  constraintEvidenceChain: string[];
}
```

### Constraints (15)

`budget`, `performance`, `portability`, `battery`, `screen`, `camera`, `storage`, `compatibility`, `delivery`, `travel`, `gaming`, `work`, `education`, `weight`, `brand`

Attached on `TruthFoundationSnapshot.purchaseConstraints`.

---

## Inputs

Consumes (via `PurchaseConstraintsInput` + raw query):

- `intentEngine` (2A)
- `conversationalIntent` (2G)
- `tastePreference` (2H)
- `userDecisionIntelligence` (2I)
- `purchaseMotivation` (2J)
- `productMatch` (2C) — read-only for brand/quality signals

---

## Integration

Built in `buildTruthFoundationSnapshot` after `purchaseMotivation`.

Multilingual query support (English + Arabic) via envelope matching.

Alignment flags only in `truthConfidenceGate` (`phase2k_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2k-purchase-constraints
npm run test:phase1-truth-regression
```
