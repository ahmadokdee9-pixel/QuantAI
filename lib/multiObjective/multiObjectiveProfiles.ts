/**
 * P6.2 — Multi-objective commerce profile registry (query-derived only; no user profiling).
 */

import type { MultiObjectiveCommerceMode } from "@/lib/multiObjective/multiObjectiveFlags";
import {
  MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  MULTI_OBJECTIVE_MAX_DELTA,
  MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
  MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
} from "@/lib/multiObjective/multiObjectiveFlags";

export type MultiObjectiveCommerceProfile = {
  id: MultiObjectiveCommerceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresIntentStable: boolean;
  maxDelta: number;
  maxQualityAmplification: number;
  maxTrustAmplification: number;
  maxConversionAmplification: number;
};

export const MULTI_OBJECTIVE_COMMERCE_PROFILES: MultiObjectiveCommerceProfile[] = [
  {
    id: "telemetry-only",
    description: "Multi-objective telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresIntentStable: false,
    maxDelta: MULTI_OBJECTIVE_MAX_DELTA,
    maxQualityAmplification: MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
    maxTrustAmplification: MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  },
  {
    id: "passive-multi-objective",
    description: "Passive objective signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresIntentStable: false,
    maxDelta: MULTI_OBJECTIVE_MAX_DELTA,
    maxQualityAmplification: MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
    maxTrustAmplification: MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  },
  {
    id: "shadow-multi-objective",
    description: "Shadow objective deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresIntentStable: false,
    maxDelta: MULTI_OBJECTIVE_MAX_DELTA,
    maxQualityAmplification: MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
    maxTrustAmplification: MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  },
  {
    id: "bounded-multi-objective",
    description: "Bounded multi-objective ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresIntentStable: false,
    maxDelta: MULTI_OBJECTIVE_MAX_DELTA,
    maxQualityAmplification: MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
    maxTrustAmplification: MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  },
  {
    id: "protected-multi-objective",
    description: "Multi-objective with governance + intent stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresIntentStable: true,
    maxDelta: MULTI_OBJECTIVE_MAX_DELTA,
    maxQualityAmplification: MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
    maxTrustAmplification: MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  },
  {
    id: "full-safe-multi-objective",
    description: "Full multi-objective with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresIntentStable: true,
    maxDelta: MULTI_OBJECTIVE_MAX_DELTA,
    maxQualityAmplification: MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION,
    maxTrustAmplification: MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION,
    maxConversionAmplification: MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION,
  },
];

export function resolveMultiObjectiveCommerceProfile(mode: MultiObjectiveCommerceMode): MultiObjectiveCommerceProfile {
  return MULTI_OBJECTIVE_COMMERCE_PROFILES.find((p) => p.id === mode) ?? MULTI_OBJECTIVE_COMMERCE_PROFILES[0];
}
