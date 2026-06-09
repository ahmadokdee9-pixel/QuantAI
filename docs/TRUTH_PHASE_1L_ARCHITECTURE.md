# Phase 1L — Evidence Reasoning Graph

**Principle:** Explainable evidence chains linking intelligence pillars — downgrade-only gates, no UI/ranking changes.

---

## Module

`lib/truth/evidenceReasoningGraph.ts` — builds `EvidenceReasoningGraph` from full truth foundation stack.

---

## EvidenceReasoningGraph

```typescript
{
  evidenceChain: string[];
  supportingEvidence: string[];
  conflictingEvidence: string[];
  evidenceStrength: number;
  evidenceCompleteness: number;
  evidenceState: "EVIDENCE_STRONG" | "EVIDENCE_GOOD" | "EVIDENCE_PARTIAL" | "EVIDENCE_WEAK" | "EVIDENCE_UNKNOWN";
}
```

Attached on `TruthFoundationSnapshot.evidenceReasoningGraph`.

---

## Graph Model

Nine linked pillars (in order):

1. SKU Identity
2. Availability
3. Price Truth
4. Discount Verification
5. Merchant Reliability
6. Market Intelligence
7. Product Intelligence
8. Commerce Intelligence
9. Commerce Reasoning

Each pillar evaluates completeness, strength, supporting label, and conflicting label.

---

## Evidence Scoring

| Metric | Derivation |
|--------|------------|
| `evidenceCompleteness` | % of pillars with sufficient data (0–100) |
| `evidenceStrength` | Mean pillar strength across chain |
| `supportingEvidence` | Labels from pillars with strong confirmation |
| `conflictingEvidence` | Labels from pillars with conflicts or weakness |

---

## Downgrade-Only Gates

Requires `hasEvidenceReasoningGraph` (canonical SKU present).

| Trigger | Gate | Downgrade |
|---------|------|-----------|
| `evidenceStrength` < 52 | `downgrade_weak_evidence_strength` | → COMPARE |
| `evidenceCompleteness` < 45 | `downgrade_incomplete_evidence` | → COMPARE |
| `conflictingEvidence` ≥ 2 | `downgrade_conflicting_evidence` | → COMPARE |

Phase 1A–1K gates preserved.

---

## Tests

```bash
npm run test:phase1l-evidence-reasoning-graph
npm run test:phase1-truth-regression
```
