/**
 * Compact Decision Thesis snapshots for Living Decision Memory continuity.
 * Stored inside evidence[] — no schema migration required.
 */

import type { DecisionChange, DecisionChangeKind } from "@/lib/decisionMemory/types";
import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";
import type { DecisionThesis } from "@/lib/decisionThesis/types";

export const THESIS_EVIDENCE_ID = "decision_thesis";

export type DecisionThesisSnapshot = {
  version: 1;
  action: string;
  confidence: number;
  coreThesis: string;
  counterThesis: string;
  nextExpectedEvent: string;
  invalidationSignals: string[];
  confirmationSignals: string[];
  stabilityScore: number | null;
  /** Stable compare key for continuity. */
  fingerprint: string;
};

export type ThesisEvidenceItem = {
  id: typeof THESIS_EVIDENCE_ID;
  label: "Decision thesis";
  value: string;
  kind: "recommendation";
  snapshot: DecisionThesisSnapshot;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function fingerprintOf(action: string, core: string, next: string): string {
  return `${action}|${core.trim().toLowerCase().slice(0, 160)}|${next.trim().toLowerCase().slice(0, 120)}`;
}

export function buildThesisSnapshot(args: {
  action: string;
  confidence: number;
  thesis: DecisionThesis;
  analyst?: AnalystDecisionBrief | null;
}): DecisionThesisSnapshot {
  const coreThesis = args.thesis.coreThesis.trim().slice(0, 280);
  const nextExpectedEvent = args.thesis.nextExpectedEvent.trim().slice(0, 220);
  return {
    version: 1,
    action: args.action,
    confidence: clampPct(args.confidence),
    coreThesis,
    counterThesis: args.thesis.counterThesis.trim().slice(0, 240),
    nextExpectedEvent,
    invalidationSignals: args.thesis.invalidationSignals.slice(0, 3),
    confirmationSignals: args.thesis.confirmationSignals.slice(0, 2),
    stabilityScore: args.analyst?.recommendationStability?.score ?? null,
    fingerprint: fingerprintOf(args.action, coreThesis, nextExpectedEvent),
  };
}

export function thesisEvidenceItem(snapshot: DecisionThesisSnapshot): ThesisEvidenceItem {
  return {
    id: THESIS_EVIDENCE_ID,
    label: "Decision thesis",
    value: snapshot.coreThesis,
    kind: "recommendation",
    snapshot,
  };
}

export function extractThesisSnapshot(
  evidence: unknown[] | null | undefined
): DecisionThesisSnapshot | null {
  if (!Array.isArray(evidence)) return null;
  for (const item of evidence) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; snapshot?: unknown };
    if (row.id !== THESIS_EVIDENCE_ID) continue;
    const snap = row.snapshot as DecisionThesisSnapshot | undefined;
    if (!snap || snap.version !== 1 || !snap.coreThesis || !snap.fingerprint) continue;
    return snap;
  }
  return null;
}

/** Merge thesis evidence into an evidence array (replace prior thesis item). */
export function withThesisEvidence(
  evidence: unknown[] | null | undefined,
  snapshot: DecisionThesisSnapshot | null | undefined
): unknown[] {
  const base = Array.isArray(evidence)
    ? evidence.filter((item) => {
        if (!item || typeof item !== "object") return true;
        return (item as { id?: unknown }).id !== THESIS_EVIDENCE_ID;
      })
    : [];
  if (!snapshot) return base;
  return [...base, thesisEvidenceItem(snapshot)];
}

/**
 * Continuity diff — thesis hold / update / invalidation.
 * Emits at most one thesis continuity change.
 */
export function detectThesisContinuityChanges(
  previous: DecisionThesisSnapshot | null | undefined,
  current: DecisionThesisSnapshot | null | undefined
): DecisionChange[] {
  if (!previous || !current) return [];

  const prevAction = String(previous.action || "").toUpperCase();
  const nextAction = String(current.action || "").toUpperCase();

  if (prevAction && nextAction && prevAction !== nextAction) {
    return [
      {
        kind: "thesis_invalidated" as DecisionChangeKind,
        label: `Thesis invalidated — ${prevAction} → ${nextAction}`,
        previous: previous.coreThesis.slice(0, 80),
        current: current.coreThesis.slice(0, 80),
      },
    ];
  }

  if (previous.fingerprint !== current.fingerprint) {
    return [
      {
        kind: "thesis_updated" as DecisionChangeKind,
        label: "Decision thesis updated",
        previous: previous.coreThesis.slice(0, 80),
        current: current.coreThesis.slice(0, 80),
      },
    ];
  }

  // Same fingerprint — thesis holding (confirmation through recheck)
  return [
    {
      kind: "thesis_confirmed" as DecisionChangeKind,
      label: `Thesis holding — ${current.nextExpectedEvent || "no new invalidation"}`,
      previous: previous.coreThesis.slice(0, 80),
      current: current.coreThesis.slice(0, 80),
    },
  ];
}

/** Homepage / feed one-liner from latest thesis-related changes. */
export function thesisContinuityHeadline(changes: DecisionChange[]): string | null {
  const invalidated = changes.find((c) => c.kind === "thesis_invalidated");
  if (invalidated) return invalidated.label;
  const updated = changes.find((c) => c.kind === "thesis_updated");
  if (updated) return updated.label;
  const confirmed = changes.find((c) => c.kind === "thesis_confirmed");
  if (confirmed) return confirmed.label;
  return null;
}
