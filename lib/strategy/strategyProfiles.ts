/**
 * P5.7 — Strategy profile registry (bounded cognition; no user profiling).
 */

import type { StrategyIntelligenceMode } from "@/lib/strategy/strategyFlags";
import {
  STRATEGY_MAX_COMPARISON_AMPLIFICATION,
  STRATEGY_MAX_CONVERSION_AMPLIFICATION,
  STRATEGY_MAX_DELTA,
  STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
  STRATEGY_MAX_MOMENTUM_INFLUENCE,
} from "@/lib/strategy/strategyFlags";

export type StrategyProfile = {
  id: StrategyIntelligenceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresDecisionStable: boolean;
  requiresReasoningStable: boolean;
  maxDelta: number;
  maxConversionAmplification: number;
  maxDominanceAmplification: number;
  maxComparisonAmplification: number;
  maxMomentumInfluence: number;
};

export const STRATEGY_PROFILES: StrategyProfile[] = [
  {
    id: "telemetry-only",
    description: "Strategy telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    requiresReasoningStable: false,
    maxDelta: STRATEGY_MAX_DELTA,
    maxConversionAmplification: STRATEGY_MAX_CONVERSION_AMPLIFICATION,
    maxDominanceAmplification: STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
    maxComparisonAmplification: STRATEGY_MAX_COMPARISON_AMPLIFICATION,
    maxMomentumInfluence: STRATEGY_MAX_MOMENTUM_INFLUENCE,
  },
  {
    id: "passive-strategy",
    description: "Passive strategic signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    requiresReasoningStable: false,
    maxDelta: STRATEGY_MAX_DELTA,
    maxConversionAmplification: STRATEGY_MAX_CONVERSION_AMPLIFICATION,
    maxDominanceAmplification: STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
    maxComparisonAmplification: STRATEGY_MAX_COMPARISON_AMPLIFICATION,
    maxMomentumInfluence: STRATEGY_MAX_MOMENTUM_INFLUENCE,
  },
  {
    id: "shadow-strategy",
    description: "Shadow strategy deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    requiresReasoningStable: false,
    maxDelta: STRATEGY_MAX_DELTA,
    maxConversionAmplification: STRATEGY_MAX_CONVERSION_AMPLIFICATION,
    maxDominanceAmplification: STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
    maxComparisonAmplification: STRATEGY_MAX_COMPARISON_AMPLIFICATION,
    maxMomentumInfluence: STRATEGY_MAX_MOMENTUM_INFLUENCE,
  },
  {
    id: "bounded-strategy",
    description: "Bounded strategic commerce ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    requiresReasoningStable: false,
    maxDelta: STRATEGY_MAX_DELTA,
    maxConversionAmplification: STRATEGY_MAX_CONVERSION_AMPLIFICATION,
    maxDominanceAmplification: STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
    maxComparisonAmplification: STRATEGY_MAX_COMPARISON_AMPLIFICATION,
    maxMomentumInfluence: STRATEGY_MAX_MOMENTUM_INFLUENCE,
  },
  {
    id: "protected-strategy",
    description: "Strategy with governance + decision stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresDecisionStable: true,
    requiresReasoningStable: false,
    maxDelta: STRATEGY_MAX_DELTA,
    maxConversionAmplification: STRATEGY_MAX_CONVERSION_AMPLIFICATION,
    maxDominanceAmplification: STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
    maxComparisonAmplification: STRATEGY_MAX_COMPARISON_AMPLIFICATION,
    maxMomentumInfluence: STRATEGY_MAX_MOMENTUM_INFLUENCE,
  },
  {
    id: "full-safe-strategy",
    description: "Full strategy with reasoning + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresDecisionStable: true,
    requiresReasoningStable: true,
    maxDelta: STRATEGY_MAX_DELTA,
    maxConversionAmplification: STRATEGY_MAX_CONVERSION_AMPLIFICATION,
    maxDominanceAmplification: STRATEGY_MAX_DOMINANCE_AMPLIFICATION,
    maxComparisonAmplification: STRATEGY_MAX_COMPARISON_AMPLIFICATION,
    maxMomentumInfluence: STRATEGY_MAX_MOMENTUM_INFLUENCE,
  },
];

export function resolveStrategyProfile(mode: StrategyIntelligenceMode): StrategyProfile {
  return STRATEGY_PROFILES.find((p) => p.id === mode) ?? STRATEGY_PROFILES[0];
}
