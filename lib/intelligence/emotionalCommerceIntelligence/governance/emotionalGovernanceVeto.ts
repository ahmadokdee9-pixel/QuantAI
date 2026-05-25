/**
 * Phase 17 — Governance-safe emotional cognition veto.
 */

import type { EmotionalCommerceIntelligenceInput } from "../types";

export type EmotionalGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitrateEmotionalCognition(
  input: EmotionalCommerceIntelligenceInput,
  emotionalConfidence01: number
): EmotionalGovernanceVerdict {
  const reasons: string[] = [];

  if (emotionalConfidence01 < 0.26) reasons.push("emotional_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.commerceStrategy && !input.commerceStrategy.meta.governanceAllowed) {
    reasons.push("commerce_strategy_governance_veto");
  }
  if (input.universalCommerce && !input.universalCommerce.meta.governanceAllowed) {
    reasons.push("universal_commerce_governance_veto");
  }
  if (input.commerceIdentity && !input.commerceIdentity.meta.governanceAllowed) {
    reasons.push("commerce_identity_governance_veto");
  }
  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.universalCommerce?.replayFingerprint?.startsWith("uci_") ?? true) &&
    (input.commerceStrategy?.replayFingerprint?.startsWith("acs_") ?? true) &&
    (input.commerceIdentity?.replayFingerprint?.startsWith("aci_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
