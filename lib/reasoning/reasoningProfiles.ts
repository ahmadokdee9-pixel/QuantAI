/**
 * P5.5 — Reasoning profile registry (bounded chains; no user profiling).
 */

import type { AdaptiveReasoningMode } from "@/lib/reasoning/reasoningFlags";
import {
  REASONING_MAX_CONFIDENCE_AMPLIFICATION,
  REASONING_MAX_DELTA,
  REASONING_MAX_PREMIUM_AMPLIFICATION,
  REASONING_MAX_TRUST_AMPLIFICATION,
} from "@/lib/reasoning/reasoningFlags";

export type ReasoningProfile = {
  id: AdaptiveReasoningMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresFusionStable: boolean;
  requiresCoordinationStable: boolean;
  maxDelta: number;
  maxConfidenceAmplification: number;
  maxTrustAmplification: number;
  maxPremiumAmplification: number;
};

export const REASONING_PROFILES: ReasoningProfile[] = [
  {
    id: "telemetry-only",
    description: "Reasoning telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresFusionStable: false,
    requiresCoordinationStable: false,
    maxDelta: REASONING_MAX_DELTA,
    maxConfidenceAmplification: REASONING_MAX_CONFIDENCE_AMPLIFICATION,
    maxTrustAmplification: REASONING_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: REASONING_MAX_PREMIUM_AMPLIFICATION,
  },
  {
    id: "passive-reasoning",
    description: "Passive reasoning signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresFusionStable: false,
    requiresCoordinationStable: false,
    maxDelta: REASONING_MAX_DELTA,
    maxConfidenceAmplification: REASONING_MAX_CONFIDENCE_AMPLIFICATION,
    maxTrustAmplification: REASONING_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: REASONING_MAX_PREMIUM_AMPLIFICATION,
  },
  {
    id: "shadow-reasoning",
    description: "Shadow reasoning deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresFusionStable: false,
    requiresCoordinationStable: false,
    maxDelta: REASONING_MAX_DELTA,
    maxConfidenceAmplification: REASONING_MAX_CONFIDENCE_AMPLIFICATION,
    maxTrustAmplification: REASONING_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: REASONING_MAX_PREMIUM_AMPLIFICATION,
  },
  {
    id: "bounded-reasoning",
    description: "Bounded adaptive commerce reasoning synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresFusionStable: false,
    requiresCoordinationStable: false,
    maxDelta: REASONING_MAX_DELTA,
    maxConfidenceAmplification: REASONING_MAX_CONFIDENCE_AMPLIFICATION,
    maxTrustAmplification: REASONING_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: REASONING_MAX_PREMIUM_AMPLIFICATION,
  },
  {
    id: "protected-reasoning",
    description: "Reasoning with governance + fusion stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresFusionStable: true,
    requiresCoordinationStable: false,
    maxDelta: REASONING_MAX_DELTA,
    maxConfidenceAmplification: REASONING_MAX_CONFIDENCE_AMPLIFICATION,
    maxTrustAmplification: REASONING_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: REASONING_MAX_PREMIUM_AMPLIFICATION,
  },
  {
    id: "full-safe-reasoning",
    description: "Full reasoning with coordination + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresFusionStable: true,
    requiresCoordinationStable: true,
    maxDelta: REASONING_MAX_DELTA,
    maxConfidenceAmplification: REASONING_MAX_CONFIDENCE_AMPLIFICATION,
    maxTrustAmplification: REASONING_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: REASONING_MAX_PREMIUM_AMPLIFICATION,
  },
];

export function resolveReasoningProfile(mode: AdaptiveReasoningMode): ReasoningProfile {
  return REASONING_PROFILES.find((p) => p.id === mode) ?? REASONING_PROFILES[0];
}
