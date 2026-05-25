/**
 * Phase 18 — Governance-safe evolution veto.
 */

import type { AutonomousCommerceEvolutionInput } from "../types";

export type EvolutionGovernanceVerdict = {
  allowed: boolean;
  shadowOnly: true;
  vetoed: boolean;
  reasons: string[];
};

export function arbitrateEvolutionCognition(
  input: AutonomousCommerceEvolutionInput,
  evolutionConfidence01: number
): EvolutionGovernanceVerdict {
  const reasons: string[] = [];

  if (evolutionConfidence01 < 0.24) reasons.push("evolution_confidence_low");
  if (input.activation?.activation.inCanary && !input.activation.governance.approved) {
    reasons.push("activation_governance_veto");
  }
  if (input.emotionalCommerce && !input.emotionalCommerce.meta.governanceAllowed) {
    reasons.push("emotional_commerce_governance_veto");
  }
  if (input.universalCommerce && !input.universalCommerce.meta.governanceAllowed) {
    reasons.push("universal_commerce_governance_veto");
  }
  if (input.commerceStrategy && !input.commerceStrategy.meta.governanceAllowed) {
    reasons.push("commerce_strategy_governance_veto");
  }
  if (input.commerceIdentity && !input.commerceIdentity.meta.governanceAllowed) {
    reasons.push("commerce_identity_governance_veto");
  }
  if (input.commerceEvolution && !input.commerceEvolution.meta.governanceAllowed) {
    reasons.push("phase10_evolution_governance_veto");
  }

  const replayOk =
    (input.trust?.replayFingerprint?.startsWith("trp_") ?? true) &&
    (input.emotionalCommerce?.replayFingerprint?.startsWith("eci_") ?? true) &&
    (input.universalCommerce?.replayFingerprint?.startsWith("uci_") ?? true) &&
    (input.commerceStrategy?.replayFingerprint?.startsWith("acs_") ?? true) &&
    (input.commerceIdentity?.replayFingerprint?.startsWith("aci_") ?? true) &&
    (input.commerceEvolution?.replayFingerprint?.startsWith("evo_") ?? true);
  if (!replayOk) reasons.push("replay_integrity_veto");

  return {
    allowed: reasons.length === 0,
    shadowOnly: true,
    vetoed: reasons.length > 0,
    reasons: reasons.slice(0, 8),
  };
}
