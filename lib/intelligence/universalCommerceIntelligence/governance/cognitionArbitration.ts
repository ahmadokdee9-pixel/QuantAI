/**
 * Phase 16 — Governance-safe cognition arbitration.
 */

import type { UniversalCommerceIntelligenceInput } from "../types";

export type CognitionGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitrateUniversalCognition(
  input: UniversalCommerceIntelligenceInput,
  universalConfidence01: number
): CognitionGovernanceVerdict {
  const reasons: string[] = [];

  if (universalConfidence01 < 0.28) reasons.push("universal_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.commerceStrategy && !input.commerceStrategy.meta.governanceAllowed) {
    reasons.push("commerce_strategy_governance_veto");
  }
  if (input.predictiveIntent && !input.predictiveIntent.meta.governanceAllowed) {
    reasons.push("predictive_intent_governance_veto");
  }
  if (input.commerceIdentity && !input.commerceIdentity.meta.governanceAllowed) {
    reasons.push("commerce_identity_governance_veto");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.commerceStrategy?.replayFingerprint?.startsWith("acs_") ?? true) &&
    (input.predictiveIntent?.replayFingerprint?.startsWith("pci_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
