/**
 * P5.0 — Runtime activation profiles per rollout mode.
 */

import type { IntentRuntimeMode } from "@/lib/intent/intentRuntimeFlags";
import {
  INTENT_RUNTIME_COMPARISON_BOOST_CAP,
  INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP,
  INTENT_RUNTIME_MAX_DELTA,
  INTENT_RUNTIME_SUPPRESSION_CAP,
  INTENT_RUNTIME_TRUST_BOOST_CAP,
} from "@/lib/intent/intentRuntimeFlags";

export type IntentRuntimeProfile = {
  id: IntentRuntimeMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresCalibrationPass: boolean;
  maxDelta: number;
  trustBoostCap: number;
  suppressionCap: number;
  comparisonBoostCap: number;
  diversityRebalanceCap: number;
};

export const INTENT_RUNTIME_PROFILES: IntentRuntimeProfile[] = [
  {
    id: "telemetry-only",
    description: "Compute runtime telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    maxDelta: INTENT_RUNTIME_MAX_DELTA,
    trustBoostCap: INTENT_RUNTIME_TRUST_BOOST_CAP,
    suppressionCap: INTENT_RUNTIME_SUPPRESSION_CAP,
    comparisonBoostCap: INTENT_RUNTIME_COMPARISON_BOOST_CAP,
    diversityRebalanceCap: INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP,
  },
  {
    id: "shadow-apply",
    description: "Shadow bounded deltas recorded; ranking order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    maxDelta: INTENT_RUNTIME_MAX_DELTA,
    trustBoostCap: INTENT_RUNTIME_TRUST_BOOST_CAP,
    suppressionCap: INTENT_RUNTIME_SUPPRESSION_CAP,
    comparisonBoostCap: INTENT_RUNTIME_COMPARISON_BOOST_CAP,
    diversityRebalanceCap: INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP,
  },
  {
    id: "bounded-apply",
    description: "Bounded runtime ranking mutation with drift cap.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    maxDelta: INTENT_RUNTIME_MAX_DELTA,
    trustBoostCap: INTENT_RUNTIME_TRUST_BOOST_CAP,
    suppressionCap: INTENT_RUNTIME_SUPPRESSION_CAP,
    comparisonBoostCap: INTENT_RUNTIME_COMPARISON_BOOST_CAP,
    diversityRebalanceCap: INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP,
  },
  {
    id: "protected-canary",
    description: "Mutation gated by governance pass and canary opt-in.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCalibrationPass: true,
    maxDelta: INTENT_RUNTIME_MAX_DELTA,
    trustBoostCap: INTENT_RUNTIME_TRUST_BOOST_CAP,
    suppressionCap: INTENT_RUNTIME_SUPPRESSION_CAP,
    comparisonBoostCap: INTENT_RUNTIME_COMPARISON_BOOST_CAP,
    diversityRebalanceCap: INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP,
  },
  {
    id: "full-safe-runtime",
    description: "Full mutation only when all safety monitors pass.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCalibrationPass: true,
    maxDelta: INTENT_RUNTIME_MAX_DELTA,
    trustBoostCap: INTENT_RUNTIME_TRUST_BOOST_CAP,
    suppressionCap: INTENT_RUNTIME_SUPPRESSION_CAP,
    comparisonBoostCap: INTENT_RUNTIME_COMPARISON_BOOST_CAP,
    diversityRebalanceCap: INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP,
  },
];

export function resolveRuntimeProfile(mode: IntentRuntimeMode): IntentRuntimeProfile {
  return INTENT_RUNTIME_PROFILES.find((p) => p.id === mode) ?? INTENT_RUNTIME_PROFILES[0];
}
