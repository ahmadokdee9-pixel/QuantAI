/**
 * P5.9 — Behavioral profile registry (advisory bounded cognition; no user profiling).
 */

import type { BehavioralCommerceMode } from "@/lib/behavioral/behavioralFlags";
import {
  BEHAVIORAL_MAX_DELTA,
  BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
  BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
  BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
} from "@/lib/behavioral/behavioralFlags";

export type BehavioralProfile = {
  id: BehavioralCommerceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresMarketStable: boolean;
  requiresStrategyStable: boolean;
  maxDelta: number;
  maxFrictionAmplification: number;
  maxHesitationAmplification: number;
  maxReadinessAmplification: number;
};

export const BEHAVIORAL_PROFILES: BehavioralProfile[] = [
  {
    id: "telemetry-only",
    description: "Behavioral telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMarketStable: false,
    requiresStrategyStable: false,
    maxDelta: BEHAVIORAL_MAX_DELTA,
    maxFrictionAmplification: BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
    maxHesitationAmplification: BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
    maxReadinessAmplification: BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
  },
  {
    id: "passive-behavioral",
    description: "Passive behavioral signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMarketStable: false,
    requiresStrategyStable: false,
    maxDelta: BEHAVIORAL_MAX_DELTA,
    maxFrictionAmplification: BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
    maxHesitationAmplification: BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
    maxReadinessAmplification: BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
  },
  {
    id: "shadow-behavioral",
    description: "Shadow behavioral deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresMarketStable: false,
    requiresStrategyStable: false,
    maxDelta: BEHAVIORAL_MAX_DELTA,
    maxFrictionAmplification: BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
    maxHesitationAmplification: BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
    maxReadinessAmplification: BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
  },
  {
    id: "bounded-behavioral",
    description: "Bounded behavioral commerce ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresMarketStable: false,
    requiresStrategyStable: false,
    maxDelta: BEHAVIORAL_MAX_DELTA,
    maxFrictionAmplification: BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
    maxHesitationAmplification: BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
    maxReadinessAmplification: BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
  },
  {
    id: "protected-behavioral",
    description: "Behavioral with governance + market stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresMarketStable: true,
    requiresStrategyStable: false,
    maxDelta: BEHAVIORAL_MAX_DELTA,
    maxFrictionAmplification: BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
    maxHesitationAmplification: BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
    maxReadinessAmplification: BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
  },
  {
    id: "full-safe-behavioral",
    description: "Full behavioral with strategy + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresMarketStable: true,
    requiresStrategyStable: true,
    maxDelta: BEHAVIORAL_MAX_DELTA,
    maxFrictionAmplification: BEHAVIORAL_MAX_FRICTION_AMPLIFICATION,
    maxHesitationAmplification: BEHAVIORAL_MAX_HESITATION_AMPLIFICATION,
    maxReadinessAmplification: BEHAVIORAL_MAX_READINESS_AMPLIFICATION,
  },
];

export function resolveBehavioralProfile(mode: BehavioralCommerceMode): BehavioralProfile {
  return BEHAVIORAL_PROFILES.find((p) => p.id === mode) ?? BEHAVIORAL_PROFILES[0];
}
