# Phase 2C — Product Matching Intelligence Layer

**Principle:** Deep product-understanding scores from intent attribute comparison — no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/productMatchingEngine.ts` — builds `ProductMatchSnapshot` from listing attributes vs `IntentSnapshot`.

---

## ProductMatchSnapshot

```typescript
{
  intentMatchScore: number;
  budgetMatchScore: number;
  qualityMatchScore: number;
  brandMatchScore: number;
  useCaseMatchScore: number;
  overallMatchScore: number;
  strongestMatchReason: string;
  strongestMismatchReason: string;
}
```

Attached on `TruthFoundationSnapshot.productMatch`.

---

## Matching Dimensions

Compares listing title/extensions against:

- `productType`
- `budget` / budget sensitivity
- `qualityLevel`
- `preferredBrand` / `excludedBrands`
- `useCase`

`overallMatchScore` is a weighted blend of the five dimension scores.

---

## Integration

Built in `buildTruthFoundationSnapshot` after `intentEngine` and `intentRetrieval`.

Search evidence fields: `overallMatchScore`, dimension scores, strongest match/mismatch reasons, `hasProductMatch`.

No ranking nudge in Phase 2C.

---

## Tests

```bash
npm run test:phase2c-product-matching
npm run test:phase1-truth-regression
```
