/**
 * Phase 15 — Governance-safe strategy arbitration.
 */

import type { AutonomousCommerceStrategyInput } from "../types";

export type StrategyGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitrateStrategyGovernance(
  input: AutonomousCommerceStrategyInput,
  strategyConfidence01: number,
  regret01: number
): StrategyGovernanceVerdict {
  const reasons: string[] = [];

  if (strategyConfidence01 < 0.3) reasons.push("strategy_confidence_low");
  if (regret01 > 0.65) reasons.push("regret_threshold_exceeded");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.brain && !input.brain.meta.governanceAllowed) reasons.push("brain_governance_veto");
  if (input.predictiveIntent && !input.predictiveIntent.meta.governanceAllowed) {
    reasons.push("predictive_intent_governance_veto");
  }
  if (input.commerceIdentity && !input.commerceIdentity.meta.governanceAllowed) {
    reasons.push("commerce_identity_governance_veto");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.brain?.replayFingerprint?.startsWith("brn_") ?? true) &&
    (input.predictiveIntent?.replayFingerprint?.startsWith("pci_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
