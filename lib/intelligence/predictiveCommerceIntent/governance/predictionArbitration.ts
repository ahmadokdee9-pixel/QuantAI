/**
 * Phase 14 — Governance-safe prediction arbitration.
 */

import type { PredictiveCommerceIntentInput } from "../types";

export type PredictionGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitratePredictionGovernance(
  input: PredictiveCommerceIntentInput,
  predictionConfidence01: number
): PredictionGovernanceVerdict {
  const reasons: string[] = [];

  if (predictionConfidence01 < 0.28) reasons.push("prediction_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.brain && !input.brain.meta.governanceAllowed) reasons.push("brain_governance_veto");
  if (input.commerceIdentity && !input.commerceIdentity.meta.governanceAllowed) {
    reasons.push("commerce_identity_governance_veto");
  }
  if (input.liveSignals && !input.liveSignals.meta.governanceAllowed) {
    reasons.push("live_signals_governance_veto");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.brain?.replayFingerprint?.startsWith("brn_") ?? true) &&
    (input.commerceIdentity?.replayFingerprint?.startsWith("aci_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
