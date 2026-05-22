/**
 * P6.4 — Memoryless commerce learning profile registry (aggregate telemetry only; no user profiles).
 */

import type { MemorylessCommerceLearningMode } from "@/lib/memorylessLearning/memorylessLearningFlags";
import {
  MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
  MEMORYLESS_LEARNING_MAX_DELTA,
  MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
} from "@/lib/memorylessLearning/memorylessLearningFlags";

export type MemorylessCommerceLearningProfile = {
  id: MemorylessCommerceLearningMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresStrategicStable: boolean;
  maxDelta: number;
  maxContinuityAmplification: number;
  maxStabilizationAmplification: number;
};

export const MEMORYLESS_COMMERCE_LEARNING_PROFILES: MemorylessCommerceLearningProfile[] = [
  {
    id: "telemetry-only",
    description: "Memoryless learning telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresStrategicStable: false,
    maxDelta: MEMORYLESS_LEARNING_MAX_DELTA,
    maxContinuityAmplification: MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
    maxStabilizationAmplification: MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
  },
  {
    id: "passive-learning",
    description: "Passive learning signals from aggregate telemetry only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresStrategicStable: false,
    maxDelta: MEMORYLESS_LEARNING_MAX_DELTA,
    maxContinuityAmplification: MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
    maxStabilizationAmplification: MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
  },
  {
    id: "shadow-learning",
    description: "Shadow learning deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresStrategicStable: false,
    maxDelta: MEMORYLESS_LEARNING_MAX_DELTA,
    maxContinuityAmplification: MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
    maxStabilizationAmplification: MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
  },
  {
    id: "bounded-learning",
    description: "Bounded memoryless learning ranking stabilization.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresStrategicStable: false,
    maxDelta: MEMORYLESS_LEARNING_MAX_DELTA,
    maxContinuityAmplification: MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
    maxStabilizationAmplification: MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
  },
  {
    id: "protected-learning",
    description: "Memoryless learning with governance + strategic stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresStrategicStable: true,
    maxDelta: MEMORYLESS_LEARNING_MAX_DELTA,
    maxContinuityAmplification: MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
    maxStabilizationAmplification: MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
  },
  {
    id: "full-safe-learning",
    description: "Full memoryless learning with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresStrategicStable: true,
    maxDelta: MEMORYLESS_LEARNING_MAX_DELTA,
    maxContinuityAmplification: MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION,
    maxStabilizationAmplification: MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION,
  },
];

export function resolveMemorylessCommerceLearningProfile(mode: MemorylessCommerceLearningMode): MemorylessCommerceLearningProfile {
  return MEMORYLESS_COMMERCE_LEARNING_PROFILES.find((p) => p.id === mode) ?? MEMORYLESS_COMMERCE_LEARNING_PROFILES[0];
}
