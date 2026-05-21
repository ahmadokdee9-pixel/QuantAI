/**
 * P5.3 — Coordination profile registry (deterministic routing; no user profiling).
 */

import type { IntentCoordinationMode } from "@/lib/intent/intentCoordinationFlags";
import {
  INTENT_COORDINATION_MAX_DELTA,
  INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  INTENT_COORDINATION_MAX_INTENT_REBALANCE,
  INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
  INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
} from "@/lib/intent/intentCoordinationFlags";

export type IntentCoordinationProfile = {
  id: IntentCoordinationMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresMemoryStable: boolean;
  requiresOrchestrationStable: boolean;
  maxDelta: number;
  maxIntentRebalance: number;
  maxTrustPropagation: number;
  maxSuppressionRebalance: number;
  maxDiversityCoordination: number;
};

export const INTENT_COORDINATION_PROFILES: IntentCoordinationProfile[] = [
  {
    id: "telemetry-only",
    description: "Coordination telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMemoryStable: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_COORDINATION_MAX_DELTA,
    maxIntentRebalance: INTENT_COORDINATION_MAX_INTENT_REBALANCE,
    maxTrustPropagation: INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
    maxSuppressionRebalance: INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
    maxDiversityCoordination: INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  },
  {
    id: "passive-coordination",
    description: "Passive cross-intent signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMemoryStable: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_COORDINATION_MAX_DELTA,
    maxIntentRebalance: INTENT_COORDINATION_MAX_INTENT_REBALANCE,
    maxTrustPropagation: INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
    maxSuppressionRebalance: INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
    maxDiversityCoordination: INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  },
  {
    id: "shadow-coordination",
    description: "Shadow coordination deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMemoryStable: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_COORDINATION_MAX_DELTA,
    maxIntentRebalance: INTENT_COORDINATION_MAX_INTENT_REBALANCE,
    maxTrustPropagation: INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
    maxSuppressionRebalance: INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
    maxDiversityCoordination: INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  },
  {
    id: "bounded-coordination",
    description: "Bounded cross-intent ranking coordination.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresMemoryStable: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_COORDINATION_MAX_DELTA,
    maxIntentRebalance: INTENT_COORDINATION_MAX_INTENT_REBALANCE,
    maxTrustPropagation: INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
    maxSuppressionRebalance: INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
    maxDiversityCoordination: INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  },
  {
    id: "protected-coordination",
    description: "Coordination with governance + orchestration stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresMemoryStable: false,
    requiresOrchestrationStable: true,
    maxDelta: INTENT_COORDINATION_MAX_DELTA,
    maxIntentRebalance: INTENT_COORDINATION_MAX_INTENT_REBALANCE,
    maxTrustPropagation: INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
    maxSuppressionRebalance: INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
    maxDiversityCoordination: INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  },
  {
    id: "full-safe-coordination",
    description: "Full coordination with memory + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresMemoryStable: true,
    requiresOrchestrationStable: true,
    maxDelta: INTENT_COORDINATION_MAX_DELTA,
    maxIntentRebalance: INTENT_COORDINATION_MAX_INTENT_REBALANCE,
    maxTrustPropagation: INTENT_COORDINATION_MAX_TRUST_PROPAGATION,
    maxSuppressionRebalance: INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE,
    maxDiversityCoordination: INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION,
  },
];

export function resolveCoordinationProfile(mode: IntentCoordinationMode): IntentCoordinationProfile {
  return INTENT_COORDINATION_PROFILES.find((p) => p.id === mode) ?? INTENT_COORDINATION_PROFILES[0];
}
