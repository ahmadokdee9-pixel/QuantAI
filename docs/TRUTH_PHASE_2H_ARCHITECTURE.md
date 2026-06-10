# Phase 2H — Taste & Preference Intelligence Layer

**Principle:** Aesthetic, style, and affinity intelligence — no UI, ranking, or trust engine changes.

---

## Module

`lib/truth/tastePreferenceEngine.ts` — builds `TastePreferenceSnapshot` from intent, conversational, and intelligence layers.

---

## TastePreferenceSnapshot

```typescript
{
  aestheticProfile: string;
  styleProfile: string;
  premiumAffinity: number;
  valueAffinity: number;
  minimalistPreference: number;
  performancePreference: number;
  portabilityPreference: number;
  luxuryPreference: number;
  practicalityPreference: number;
  innovationPreference: number;
  tasteSignals: string[];
  tasteConfidence: number;
}
```

Attached on `TruthFoundationSnapshot.tastePreference`.

---

## Inputs

Consumes (via `TastePreferenceInput` + raw query):

- `intentEngine.intent` (Phase 2A)
- `conversationalIntent` (Phase 2G)
- `productIntelligence` (Phase 1I)
- `commerceIntelligence` (Phase 1J)
- `productReasoning` (Phase 2D)

---

## Integration

Built in `buildTruthFoundationSnapshot` after `conversationalIntent`.

Search evidence fields: aesthetic/style profiles, affinity scores, taste signal count, confidence, `tasteEvidenceChain`, `hasTastePreference`.

Alignment flags only in `truthConfidenceGate` (`phase2h_*`) — no new downgrade gates.

---

## Tests

```bash
npm run test:phase2h-taste-preference
npm run test:phase1-truth-regression
```
