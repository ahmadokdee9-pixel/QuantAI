/**
 * P6.8 — Unified cognitive governance profile registry.
 */

import type { UnifiedCognitiveGovernanceMode } from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";
import {
  COGNITIVE_GOVERNANCE_MAX_DELTA,
  COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";

export type UnifiedCognitiveGovernanceProfile = {
  id: UnifiedCognitiveGovernanceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresGraphStable: boolean;
  maxDelta: number;
  maxInfluenceAmplification: number;
  maxEquilibriumAmplification: number;
};

export const UNIFIED_COGNITIVE_GOVERNANCE_PROFILES: UnifiedCognitiveGovernanceProfile[] = [
  {
    id: "telemetry-only",
    description: "Cognitive governance telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresGraphStable: false,
    maxDelta: COGNITIVE_GOVERNANCE_MAX_DELTA,
    maxInfluenceAmplification: COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
    maxEquilibriumAmplification: COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "passive-governance",
    description: "Passive governance signals from aggregate cross-layer telemetry only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresGraphStable: false,
    maxDelta: COGNITIVE_GOVERNANCE_MAX_DELTA,
    maxInfluenceAmplification: COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
    maxEquilibriumAmplification: COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "shadow-governance",
    description: "Shadow governance deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresGraphStable: false,
    maxDelta: COGNITIVE_GOVERNANCE_MAX_DELTA,
    maxInfluenceAmplification: COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
    maxEquilibriumAmplification: COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "bounded-governance",
    description: "Bounded unified cognitive governance ranking stabilization.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresGraphStable: false,
    maxDelta: COGNITIVE_GOVERNANCE_MAX_DELTA,
    maxInfluenceAmplification: COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
    maxEquilibriumAmplification: COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "protected-governance",
    description: "Governance with intent governance + graph stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresGraphStable: true,
    maxDelta: COGNITIVE_GOVERNANCE_MAX_DELTA,
    maxInfluenceAmplification: COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
    maxEquilibriumAmplification: COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
  {
    id: "full-safe-governance",
    description: "Full governance with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresGraphStable: true,
    maxDelta: COGNITIVE_GOVERNANCE_MAX_DELTA,
    maxInfluenceAmplification: COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION,
    maxEquilibriumAmplification: COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION,
  },
];

export function resolveUnifiedCognitiveGovernanceProfile(mode: UnifiedCognitiveGovernanceMode): UnifiedCognitiveGovernanceProfile {
  return UNIFIED_COGNITIVE_GOVERNANCE_PROFILES.find((p) => p.id === mode) ?? UNIFIED_COGNITIVE_GOVERNANCE_PROFILES[0];
}
