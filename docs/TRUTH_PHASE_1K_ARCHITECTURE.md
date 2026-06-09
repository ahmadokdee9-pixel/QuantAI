# Phase 1K — Autonomous Commerce Reasoning Layer

**Principle:** Structured WHY signals from fused intelligence — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/commerceReasoningLayer.ts` — builds `CommerceReasoningSnapshot` from truth foundation + commerce intelligence.

---

## CommerceReasoningSnapshot

```typescript
{
  primaryRisk: string;
  secondaryRisk: string;
  strongestPositiveSignal: string;
  strongestNegativeSignal: string;
  reasoningConfidence: number;
  reasoningState: "COMMERCE_REASONING_STRONG" | "COMMERCE_REASONING_GOOD" | "COMMERCE_REASONING_CAUTION" | "COMMERCE_REASONING_WEAK" | "COMMERCE_REASONING_UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.commerceReasoning`.

---

## Reasoning Model

Negative and positive signal candidates are scored from:

- SKU identity, price truth, availability, discount verification
- Market intelligence, merchant reliability
- Product intelligence, commerce intelligence

Top negative → `primaryRisk` / `strongestNegativeSignal`  
Second negative → `secondaryRisk`  
Top positive → `strongestPositiveSignal`  
`reasoningConfidence` = commerce confidence adjusted by signal clarity

---

## Downgrade-Only Gates

Requires `hasCommerceReasoning` (canonical SKU present).

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `reasoningConfidence` < 52 | `downgrade_weak_commerce_reasoning` | → COMPARE |
| High-severity `primaryRisk` | `downgrade_primary_commerce_risk` | → COMPARE |
| `COMMERCE_REASONING_WEAK` / `UNKNOWN` | `downgrade_reasoning_uncertainty` | → COMPARE |

Phase 1A–1J gates preserved.

---

## Tests

```bash
npm run test:phase1k-commerce-reasoning
npm run test:phase1-truth-regression
```

---

## Next: Phase 1L+

Continue truth foundation hardening or autonomous reasoning extensions as roadmap defines.
