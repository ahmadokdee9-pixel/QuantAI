# Phase 1M — Unified Trust Engine

**Principle:** Single normalized trust layer from all foundation signals — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/unifiedTrustEngine.ts` — builds `TrustEngineSnapshot` from full truth foundation stack.

---

## TrustEngineSnapshot

```typescript
{
  trustScore: number;
  trustConfidence: number;
  trustSignals: string[];
  trustRisks: string[];
  trustStrength: number;
  trustState: "TRUST_STRONG" | "TRUST_GOOD" | "TRUST_CAUTION" | "TRUST_WEAK" | "TRUST_UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.trustEngine`.

---

## Trust Model

Aggregates trust from ten layers:

SKU Identity, Availability, Price Truth, Discount Verification, Merchant Reliability, Market Intelligence, Product Intelligence, Commerce Intelligence, Commerce Reasoning, Evidence Reasoning Graph.

---

## Trust Scoring

| Metric | Derivation |
|--------|------------|
| `trustScore` | Weighted blend of ten pillar scores (0–100) |
| `trustConfidence` | Score + evidence completeness + reasoning clarity − risk penalty |
| `trustStrength` | Mean pillar strength |
| `trustSignals` | Positive confirmations across layers |
| `trustRisks` | Conflicts and weak-trust indicators |

---

## Trust States

`TRUST_STRONG` → `TRUST_GOOD` → `TRUST_CAUTION` → `TRUST_WEAK` → `TRUST_UNKNOWN`

---

## Downgrade-Only Gates

Requires `hasTrustEngine` (canonical SKU present).

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `trustScore` < 52 | `downgrade_weak_trust_score` | → COMPARE |
| `trustConfidence` < 50 | `downgrade_weak_trust_confidence` | → COMPARE |
| `trustStrength` < 48 | `downgrade_weak_trust_strength` | → COMPARE |
| `trustRisks` ≥ 2 | `downgrade_elevated_trust_risks` | → COMPARE |

Phase 1A–1L gates preserved.

---

## Tests

```bash
npm run test:phase1m-unified-trust-engine
npm run test:phase1-truth-regression
```
