/**
 * P6.0 — Cognition profile registry (bounded unified cognition; no user profiling).
 */

import type { CognitionEngineMode } from "@/lib/cognition/cognitionFlags";
import {
  COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  COGNITION_MAX_DELTA,
  COGNITION_MAX_MARKET_INFLUENCE,
  COGNITION_MAX_REASONING_INFLUENCE,
  COGNITION_MAX_STRATEGY_INFLUENCE,
} from "@/lib/cognition/cognitionFlags";

export type CognitionProfile = {
  id: CognitionEngineMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresBehavioralStable: boolean;
  requiresMarketStable: boolean;
  maxDelta: number;
  maxReasoningInfluence: number;
  maxStrategyInfluence: number;
  maxMarketInfluence: number;
  maxBehavioralInfluence: number;
};

export const COGNITION_PROFILES: CognitionProfile[] = [
  {
    id: "telemetry-only",
    description: "Cognition telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresBehavioralStable: false,
    requiresMarketStable: false,
    maxDelta: COGNITION_MAX_DELTA,
    maxReasoningInfluence: COGNITION_MAX_REASONING_INFLUENCE,
    maxStrategyInfluence: COGNITION_MAX_STRATEGY_INFLUENCE,
    maxMarketInfluence: COGNITION_MAX_MARKET_INFLUENCE,
    maxBehavioralInfluence: COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  },
  {
    id: "passive-cognition",
    description: "Passive unified cognition signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresBehavioralStable: false,
    requiresMarketStable: false,
    maxDelta: COGNITION_MAX_DELTA,
    maxReasoningInfluence: COGNITION_MAX_REASONING_INFLUENCE,
    maxStrategyInfluence: COGNITION_MAX_STRATEGY_INFLUENCE,
    maxMarketInfluence: COGNITION_MAX_MARKET_INFLUENCE,
    maxBehavioralInfluence: COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  },
  {
    id: "shadow-cognition",
    description: "Shadow cognition deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresBehavioralStable: false,
    requiresMarketStable: false,
    maxDelta: COGNITION_MAX_DELTA,
    maxReasoningInfluence: COGNITION_MAX_REASONING_INFLUENCE,
    maxStrategyInfluence: COGNITION_MAX_STRATEGY_INFLUENCE,
    maxMarketInfluence: COGNITION_MAX_MARKET_INFLUENCE,
    maxBehavioralInfluence: COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  },
  {
    id: "bounded-cognition",
    description: "Bounded unified cognition ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresBehavioralStable: false,
    requiresMarketStable: false,
    maxDelta: COGNITION_MAX_DELTA,
    maxReasoningInfluence: COGNITION_MAX_REASONING_INFLUENCE,
    maxStrategyInfluence: COGNITION_MAX_STRATEGY_INFLUENCE,
    maxMarketInfluence: COGNITION_MAX_MARKET_INFLUENCE,
    maxBehavioralInfluence: COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  },
  {
    id: "protected-cognition",
    description: "Cognition with governance + market stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresBehavioralStable: false,
    requiresMarketStable: true,
    maxDelta: COGNITION_MAX_DELTA,
    maxReasoningInfluence: COGNITION_MAX_REASONING_INFLUENCE,
    maxStrategyInfluence: COGNITION_MAX_STRATEGY_INFLUENCE,
    maxMarketInfluence: COGNITION_MAX_MARKET_INFLUENCE,
    maxBehavioralInfluence: COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  },
  {
    id: "full-safe-cognition",
    description: "Full cognition with behavioral + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresBehavioralStable: true,
    requiresMarketStable: true,
    maxDelta: COGNITION_MAX_DELTA,
    maxReasoningInfluence: COGNITION_MAX_REASONING_INFLUENCE,
    maxStrategyInfluence: COGNITION_MAX_STRATEGY_INFLUENCE,
    maxMarketInfluence: COGNITION_MAX_MARKET_INFLUENCE,
    maxBehavioralInfluence: COGNITION_MAX_BEHAVIORAL_INFLUENCE,
  },
];

export function resolveCognitionProfile(mode: CognitionEngineMode): CognitionProfile {
  return COGNITION_PROFILES.find((p) => p.id === mode) ?? COGNITION_PROFILES[0];
}
