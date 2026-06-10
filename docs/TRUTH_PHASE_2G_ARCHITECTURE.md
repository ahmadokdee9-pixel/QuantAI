# Phase 2G — Conversational Intent Intelligence Layer

**Principle:** Upgrade structured intent parsing into conversational buying-intent understanding — no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/conversationalIntentEngine.ts` — builds `ConversationalIntentSnapshot` from raw query + intent + intelligence layers.

---

## ConversationalIntentSnapshot

```typescript
{
  explicitIntent: string;
  implicitIntent: string;
  shoppingGoal: string;
  userContext: string;
  expertiseLevel: "BEGINNER" | "INTERMEDIATE" | "EXPERT" | "UNKNOWN";
  urgencyLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  budgetSensitivity: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  qualitySensitivity: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  brandFlexibility: "FIXED" | "PREFERRED" | "FLEXIBLE";
  riskTolerance: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  preferenceSignals: string[];
  conversationalConfidence: number;
}
```

Attached on `TruthFoundationSnapshot.conversationalIntent`.

---

## Inputs

Consumes (via `ConversationalIntentInput` + raw query):

- Raw user query
- `intentEngine.intent` (Phase 2A)
- `commerceIntelligence` (Phase 1J)
- `productIntelligence` (Phase 1I)

---

## Integration

Built in `buildTruthFoundationSnapshot` after `explainableAI`.

Search evidence fields: explicit/implicit intent, shopping goal, user context, sensitivity levels, preference count, confidence, `conversationalEvidenceChain`, `hasConversationalIntent`.

Alignment flags only in `truthConfidenceGate` (`phase2g_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2g-conversational-intent
npm run test:phase1-truth-regression
```
