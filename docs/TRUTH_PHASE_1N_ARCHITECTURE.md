# Phase 1N — Decision Intelligence Layer

**Principle:** Final autonomous decision layer from fused intelligence + trust — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/decisionIntelligenceLayer.ts` — builds `DecisionEngineSnapshot` from Product Intelligence, Commerce Intelligence, Commerce Reasoning, Evidence Reasoning Graph, and Unified Trust Engine.

---

## DecisionEngineSnapshot

```typescript
{
  decisionScore: number;
  decisionConfidence: number;
  decisionSignals: string[];
  decisionRisks: string[];
  decisionReasons: string[];
  decisionState: "BUY" | "CONSIDER" | "WAIT" | "AVOID" | "UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.decisionEngine`.

---

## Decision Model

Aggregates five intelligence layers:

Product Intelligence, Commerce Intelligence, Commerce Reasoning, Evidence Reasoning Graph, Unified Trust Engine.

Positive and negative evidence chains are exposed via `decisionSignals` and `decisionRisks`. Strongest factors appear first in those arrays and in `decisionReasons`.

---

## Decision Scoring

| Metric | Derivation |
|--------|------------|
| `decisionScore` | Weighted blend of five layer scores (0–100) |
| `decisionConfidence` | Score + trust + evidence + reasoning − risk penalty |
| `decisionSignals` | Positive evidence chain across layers |
| `decisionRisks` | Negative evidence chain across layers |
| `decisionReasons` | Explainable synthesis with strongest factors |

---

## Decision States

`BUY` → `CONSIDER` → `WAIT` → `AVOID` → `UNKNOWN`

States are informational labels — gates use numeric thresholds and risk counts, not state-based promotion.

---

## Downgrade-Only Gates

Requires `hasDecisionEngine` (canonical SKU present).

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `decisionScore` < 52 | `downgrade_weak_decision_score` | → COMPARE |
| `decisionConfidence` < 50 | `downgrade_weak_decision_confidence` | → COMPARE |
| `decisionRisks` ≥ 2 | `downgrade_elevated_decision_risks` | → COMPARE |
| `decisionState` AVOID/UNKNOWN | `downgrade_avoid_decision_state` | → COMPARE |

Phase 1A–1M gates preserved.

---

## Tests

```bash
npm run test:phase1n-decision-intelligence
npm run test:phase1-truth-regression
```
