# Phase 2B — Intent-Aware Retrieval Engine

**Principle:** Connect Phase 2A intent parsing to product retrieval scoring — no UI changes, trust/decision engines preserved.

---

## Module

`lib/truth/intentAwareRetrievalEngine.ts` — scores listing fit against `IntentSnapshot`.

---

## IntentRetrievalSnapshot

```typescript
{
  retrievalIntentScore: number;   // 0–100
  retrievalReasons: string[];     // e.g. "✓ gaming GPU"
}
```

Attached on `TruthFoundationSnapshot.intentRetrieval`.

---

## Scoring Dimensions

| Dimension | Weight | Signals |
|-----------|--------|---------|
| Product relevance | 28% | product type, query relevance |
| Use case match | 24% | gaming GPU, refresh rate, travel, editing |
| Budget match | 18% | within/exceeds parsed budget |
| Quality match | 15% | budget vs premium positioning |
| Brand preference | 15% | preferred/excluded brand fit |

---

## Retrieval Integration

1. **Truth foundation** — built per listing in `buildTruthFoundationSnapshot`
2. **Search evidence** — `retrievalIntentScore`, `retrievalReasons`, `hasIntentRetrieval` on `ExtendedTruthEvidenceSources`
3. **Tray ranking** — bounded nudge in `sortByCompositeRankEnhanced` via `intentRetrievalRankNudge`

Boost range: **+8** (strong match) to **−8** (conflict).

---

## Tests

```bash
npm run test:phase2b-intent-aware-retrieval
npm run test:phase1-truth-regression
```
