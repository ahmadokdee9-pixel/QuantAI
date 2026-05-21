/**
 * P5.4 — Fusion profile registry (bounded blending; no user profiling).
 */

import type { IntentFusionMode } from "@/lib/intent/intentFusionFlags";
import {
  INTENT_FUSION_MAX_DELTA,
  INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
  INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
  INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
} from "@/lib/intent/intentFusionFlags";

export type IntentFusionProfile = {
  id: IntentFusionMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresCoordinationStable: boolean;
  requiresMemoryStable: boolean;
  maxDelta: number;
  maxTrustAmplification: number;
  maxPremiumAmplification: number;
  maxSuppressionRecovery: number;
  maxDiversityIntervention: number;
};

export const INTENT_FUSION_PROFILES: IntentFusionProfile[] = [
  {
    id: "telemetry-only",
    description: "Fusion telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCoordinationStable: false,
    requiresMemoryStable: false,
    maxDelta: INTENT_FUSION_MAX_DELTA,
    maxTrustAmplification: INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
    maxSuppressionRecovery: INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
    maxDiversityIntervention: INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "passive-fusion",
    description: "Passive fusion signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCoordinationStable: false,
    requiresMemoryStable: false,
    maxDelta: INTENT_FUSION_MAX_DELTA,
    maxTrustAmplification: INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
    maxSuppressionRecovery: INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
    maxDiversityIntervention: INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "shadow-fusion",
    description: "Shadow fusion deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCoordinationStable: false,
    requiresMemoryStable: false,
    maxDelta: INTENT_FUSION_MAX_DELTA,
    maxTrustAmplification: INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
    maxSuppressionRecovery: INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
    maxDiversityIntervention: INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "bounded-fusion",
    description: "Bounded commerce fusion ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresCoordinationStable: false,
    requiresMemoryStable: false,
    maxDelta: INTENT_FUSION_MAX_DELTA,
    maxTrustAmplification: INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
    maxSuppressionRecovery: INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
    maxDiversityIntervention: INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "protected-fusion",
    description: "Fusion with governance + coordination stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCoordinationStable: true,
    requiresMemoryStable: false,
    maxDelta: INTENT_FUSION_MAX_DELTA,
    maxTrustAmplification: INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
    maxSuppressionRecovery: INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
    maxDiversityIntervention: INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "full-safe-fusion",
    description: "Full fusion with memory + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCoordinationStable: true,
    requiresMemoryStable: true,
    maxDelta: INTENT_FUSION_MAX_DELTA,
    maxTrustAmplification: INTENT_FUSION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION,
    maxSuppressionRecovery: INTENT_FUSION_MAX_SUPPRESSION_RECOVERY,
    maxDiversityIntervention: INTENT_FUSION_MAX_DIVERSITY_INTERVENTION,
  },
];

export function resolveFusionProfile(mode: IntentFusionMode): IntentFusionProfile {
  return INTENT_FUSION_PROFILES.find((p) => p.id === mode) ?? INTENT_FUSION_PROFILES[0];
}
