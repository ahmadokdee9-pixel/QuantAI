/**
 * Phase 12 — Governance-safe signal arbitration (veto layer).
 */

import type { LiveCommerceSignalsInput } from "../types";

export type LiveSignalGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitrateLiveSignalGovernance(
  input: LiveCommerceSignalsInput,
  signalConfidence01: number,
  volatilityBand: "low" | "moderate" | "elevated"
): LiveSignalGovernanceVerdict {
  const reasons: string[] = [];

  if (signalConfidence01 < 0.32) reasons.push("signal_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.brain && !input.brain.meta.governanceAllowed) {
    reasons.push("brain_governance_veto");
  }
  if (input.evolution && !input.evolution.meta.governanceAllowed) {
    reasons.push("evolution_governance_veto");
  }
  if (volatilityBand === "elevated" && signalConfidence01 < 0.45) {
    reasons.push("elevated_volatility_guard");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.brain?.replayFingerprint?.startsWith("brn_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
