/**
 * P5.6 — Decision profile registry (bounded purchase synthesis; no user profiling).
 */

import type { DecisionIntelligenceMode } from "@/lib/decision/decisionFlags";
import {
  DECISION_MAX_COMPARISON_INFLUENCE,
  DECISION_MAX_DELTA,
  DECISION_MAX_PREMIUM_AMPLIFICATION,
  DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
  DECISION_MAX_TRUST_AMPLIFICATION,
} from "@/lib/decision/decisionFlags";

export type DecisionProfile = {
  id: DecisionIntelligenceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresReasoningStable: boolean;
  requiresFusionStable: boolean;
  maxDelta: number;
  maxTrustAmplification: number;
  maxPremiumAmplification: number;
  maxRecommendationAmplification: number;
  maxComparisonInfluence: number;
};

export const DECISION_PROFILES: DecisionProfile[] = [
  {
    id: "telemetry-only",
    description: "Decision telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresReasoningStable: false,
    requiresFusionStable: false,
    maxDelta: DECISION_MAX_DELTA,
    maxTrustAmplification: DECISION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: DECISION_MAX_PREMIUM_AMPLIFICATION,
    maxRecommendationAmplification: DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
    maxComparisonInfluence: DECISION_MAX_COMPARISON_INFLUENCE,
  },
  {
    id: "passive-decision",
    description: "Passive decision signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresReasoningStable: false,
    requiresFusionStable: false,
    maxDelta: DECISION_MAX_DELTA,
    maxTrustAmplification: DECISION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: DECISION_MAX_PREMIUM_AMPLIFICATION,
    maxRecommendationAmplification: DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
    maxComparisonInfluence: DECISION_MAX_COMPARISON_INFLUENCE,
  },
  {
    id: "shadow-decision",
    description: "Shadow decision deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresReasoningStable: false,
    requiresFusionStable: false,
    maxDelta: DECISION_MAX_DELTA,
    maxTrustAmplification: DECISION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: DECISION_MAX_PREMIUM_AMPLIFICATION,
    maxRecommendationAmplification: DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
    maxComparisonInfluence: DECISION_MAX_COMPARISON_INFLUENCE,
  },
  {
    id: "bounded-decision",
    description: "Bounded purchase decision ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresReasoningStable: false,
    requiresFusionStable: false,
    maxDelta: DECISION_MAX_DELTA,
    maxTrustAmplification: DECISION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: DECISION_MAX_PREMIUM_AMPLIFICATION,
    maxRecommendationAmplification: DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
    maxComparisonInfluence: DECISION_MAX_COMPARISON_INFLUENCE,
  },
  {
    id: "protected-decision",
    description: "Decision with governance + reasoning stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresReasoningStable: true,
    requiresFusionStable: false,
    maxDelta: DECISION_MAX_DELTA,
    maxTrustAmplification: DECISION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: DECISION_MAX_PREMIUM_AMPLIFICATION,
    maxRecommendationAmplification: DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
    maxComparisonInfluence: DECISION_MAX_COMPARISON_INFLUENCE,
  },
  {
    id: "full-safe-decision",
    description: "Full decision with fusion + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresReasoningStable: true,
    requiresFusionStable: true,
    maxDelta: DECISION_MAX_DELTA,
    maxTrustAmplification: DECISION_MAX_TRUST_AMPLIFICATION,
    maxPremiumAmplification: DECISION_MAX_PREMIUM_AMPLIFICATION,
    maxRecommendationAmplification: DECISION_MAX_RECOMMENDATION_AMPLIFICATION,
    maxComparisonInfluence: DECISION_MAX_COMPARISON_INFLUENCE,
  },
];

export function resolveDecisionProfile(mode: DecisionIntelligenceMode): DecisionProfile {
  return DECISION_PROFILES.find((p) => p.id === mode) ?? DECISION_PROFILES[0];
}
