/**
 * P5.2 — Memory profile registry (contextual continuity; no user profiling).
 */

import type { IntentMemoryMode } from "@/lib/intent/intentMemoryFlags";
import {
  INTENT_MEMORY_MAX_CONTINUITY_BOOST,
  INTENT_MEMORY_MAX_DELTA,
  INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
  INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
} from "@/lib/intent/intentMemoryFlags";

export type IntentMemoryProfile = {
  id: IntentMemoryMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresOrchestrationStable: boolean;
  maxDelta: number;
  maxContinuityBoost: number;
  maxTrustReinforcement: number;
  maxSuppressionRecovery: number;
  maxDiversityStabilization: number;
};

export const INTENT_MEMORY_PROFILES: IntentMemoryProfile[] = [
  {
    id: "telemetry-only",
    description: "Memory telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_MEMORY_MAX_DELTA,
    maxContinuityBoost: INTENT_MEMORY_MAX_CONTINUITY_BOOST,
    maxTrustReinforcement: INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
    maxSuppressionRecovery: INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
    maxDiversityStabilization: INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  },
  {
    id: "passive-memory",
    description: "Passive continuity signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_MEMORY_MAX_DELTA,
    maxContinuityBoost: INTENT_MEMORY_MAX_CONTINUITY_BOOST,
    maxTrustReinforcement: INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
    maxSuppressionRecovery: INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
    maxDiversityStabilization: INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  },
  {
    id: "shadow-memory",
    description: "Shadow memory deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresOrchestrationStable: false,
    maxDelta: INTENT_MEMORY_MAX_DELTA,
    maxContinuityBoost: INTENT_MEMORY_MAX_CONTINUITY_BOOST,
    maxTrustReinforcement: INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
    maxSuppressionRecovery: INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
    maxDiversityStabilization: INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  },
  {
    id: "bounded-memory",
    description: "Bounded memory influence with drift cap.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresOrchestrationStable: true,
    maxDelta: INTENT_MEMORY_MAX_DELTA,
    maxContinuityBoost: INTENT_MEMORY_MAX_CONTINUITY_BOOST,
    maxTrustReinforcement: INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
    maxSuppressionRecovery: INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
    maxDiversityStabilization: INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  },
  {
    id: "protected-memory-runtime",
    description: "Memory gated by governance and orchestration stability.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresOrchestrationStable: true,
    maxDelta: INTENT_MEMORY_MAX_DELTA,
    maxContinuityBoost: INTENT_MEMORY_MAX_CONTINUITY_BOOST,
    maxTrustReinforcement: INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
    maxSuppressionRecovery: INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
    maxDiversityStabilization: INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  },
  {
    id: "full-safe-memory",
    description: "Full memory only when all monitors pass.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresOrchestrationStable: true,
    maxDelta: INTENT_MEMORY_MAX_DELTA,
    maxContinuityBoost: INTENT_MEMORY_MAX_CONTINUITY_BOOST,
    maxTrustReinforcement: INTENT_MEMORY_MAX_TRUST_REINFORCEMENT,
    maxSuppressionRecovery: INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY,
    maxDiversityStabilization: INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION,
  },
];

export function resolveMemoryProfile(mode: IntentMemoryMode): IntentMemoryProfile {
  return INTENT_MEMORY_PROFILES.find((p) => p.id === mode) ?? INTENT_MEMORY_PROFILES[0];
}
