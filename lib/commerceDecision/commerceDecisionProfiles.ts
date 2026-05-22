/**
 * P6.6 — Commerce decision intelligence profile registry (aggregate telemetry only; no user profiles).
 */

import type { CommerceDecisionIntelligenceMode } from "@/lib/commerceDecision/commerceDecisionFlags";
import {
  COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
  COMMERCE_DECISION_MAX_DELTA,
  COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
} from "@/lib/commerceDecision/commerceDecisionFlags";

export type CommerceDecisionIntelligenceProfile = {
  id: CommerceDecisionIntelligenceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresRealityStable: boolean;
  maxDelta: number;
  maxContinuityAmplification: number;
  maxIntegrityAmplification: number;
};

export const COMMERCE_DECISION_INTELLIGENCE_PROFILES: CommerceDecisionIntelligenceProfile[] = [
  {
    id: "telemetry-only",
    description: "Commerce decision telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresRealityStable: false,
    maxDelta: COMMERCE_DECISION_MAX_DELTA,
    maxContinuityAmplification: COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
    maxIntegrityAmplification: COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
  },
  {
    id: "passive-decision",
    description: "Passive commerce decision signals from aggregate telemetry only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresRealityStable: false,
    maxDelta: COMMERCE_DECISION_MAX_DELTA,
    maxContinuityAmplification: COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
    maxIntegrityAmplification: COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
  },
  {
    id: "shadow-decision",
    description: "Shadow commerce decision deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresRealityStable: false,
    maxDelta: COMMERCE_DECISION_MAX_DELTA,
    maxContinuityAmplification: COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
    maxIntegrityAmplification: COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
  },
  {
    id: "bounded-decision",
    description: "Bounded commerce decision ranking stabilization.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresRealityStable: false,
    maxDelta: COMMERCE_DECISION_MAX_DELTA,
    maxContinuityAmplification: COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
    maxIntegrityAmplification: COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
  },
  {
    id: "protected-decision",
    description: "Commerce decision with governance + market reality stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresRealityStable: true,
    maxDelta: COMMERCE_DECISION_MAX_DELTA,
    maxContinuityAmplification: COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
    maxIntegrityAmplification: COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
  },
  {
    id: "full-safe-decision",
    description: "Full commerce decision with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresRealityStable: true,
    maxDelta: COMMERCE_DECISION_MAX_DELTA,
    maxContinuityAmplification: COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION,
    maxIntegrityAmplification: COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION,
  },
];

export function resolveCommerceDecisionIntelligenceProfile(mode: CommerceDecisionIntelligenceMode): CommerceDecisionIntelligenceProfile {
  return COMMERCE_DECISION_INTELLIGENCE_PROFILES.find((p) => p.id === mode) ?? COMMERCE_DECISION_INTELLIGENCE_PROFILES[0];
}
