/**
 * Phase 13 — Governance-safe identity arbitration (veto layer).
 */

import type { AutonomousCommerceIdentityInput } from "../types";

export type IdentityGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitrateIdentityGovernance(
  input: AutonomousCommerceIdentityInput,
  identityConfidence01: number,
  driftBand: "stable" | "moderate" | "elevated"
): IdentityGovernanceVerdict {
  const reasons: string[] = [];

  if (identityConfidence01 < 0.3) reasons.push("identity_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.brain && !input.brain.meta.governanceAllowed) reasons.push("brain_governance_veto");
  if (input.liveSignals && !input.liveSignals.meta.governanceAllowed) {
    reasons.push("live_signals_governance_veto");
  }
  if (driftBand === "elevated" && identityConfidence01 < 0.42) {
    reasons.push("identity_drift_guard");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.brain?.replayFingerprint?.startsWith("brn_") ?? true) &&
    (input.liveSignals?.replayFingerprint?.startsWith("lcs_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
