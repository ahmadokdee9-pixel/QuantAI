/**
 * Phase 11 — Governance-safe brain orchestration boundaries.
 */

import type { CommerceBrainInput } from "../types";

export type BrainGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  reasons: string[];
};

export function evaluateBrainOrchestrationBoundaries(
  input: CommerceBrainInput,
  brainConfidence01: number
): BrainGovernanceVerdict {
  const reasons: string[] = [];

  if (brainConfidence01 < 0.38) reasons.push("brain_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_blocked");
  }
  if (input.evolution && !input.evolution.meta.governanceAllowed) {
    reasons.push("evolution_governance_blocked");
  }
  if ((input.recommendation?.meta.safetyBlockedCount ?? 0) > 6) {
    reasons.push("unstable_recommendation_recursion");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.recommendation?.replayFingerprint?.startsWith("rcp_") ?? true) &&
    (input.evolution?.replayFingerprint?.startsWith("evo_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_fail");

  return { allowed: reasons.length === 0, shadowOnly: true, reasons: reasons.slice(0, 8) };
}
