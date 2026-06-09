# Phase 2A — Intent Intelligence Engine

**Principle:** Backend-only query intent parsing for Arabic + English — no UI, ranking, trust, or decision engine changes.

---

## Module

`lib/truth/intentIntelligenceEngine.ts` — parses shopping queries into `IntentEngineSnapshot`.

---

## IntentEngineSnapshot

```typescript
{
  intent: {
    category: string | null;
    productType: string | null;
    budget: number | null;
    currency: string | null;
    useCase: string | null;
    qualityLevel: string | null;
    urgency: string | null;
    preferredBrand: string | null;
    excludedBrands: string[];
    language: "en" | "ar" | "mixed" | "unknown";
  };
  intentConfidence: number;
  intentCompleteness: number;
  normalizedQuery: string;
  rewrittenQuery: string;
  rewrite: {
    productType: string | null;
    brand: string | null;
    objective: string | null;
    budgetSensitive: boolean;
  };
}
```

Attached on `TruthFoundationSnapshot.intentEngine`.

---

## Query Processing

1. **Normalization** — typo fixes, Eastern digit normalization, Arabic gloss expansion
2. **Structured extraction** — category, product type, budget, brand, use case, quality, urgency
3. **Rewriting** — retrieval-friendly commerce query from structured intent

Example: `"cheap iphone"` → `{ productType: "smartphone", brand: "Apple", objective: "best value", budgetSensitive: true }`

---

## Integration

Built inside `buildTruthFoundationSnapshot` from `searchQuery`. Does not modify trust engine, decision engine, or ranking gates.

---

## Tests

```bash
npm run test:phase2a-intent-intelligence
npm run test:phase1-truth-regression
```
