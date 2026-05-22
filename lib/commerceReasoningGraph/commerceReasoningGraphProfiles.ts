/**
 * P6.7 — Autonomous commerce reasoning graph profile registry.
 */

import type { AutonomousCommerceReasoningGraphMode } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";
import {
  COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  COMMERCE_REASONING_GRAPH_MAX_DELTA,
  COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";

export type AutonomousCommerceReasoningGraphProfile = {
  id: AutonomousCommerceReasoningGraphMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresDecisionStable: boolean;
  maxDelta: number;
  maxPathAmplification: number;
  maxCausalAmplification: number;
};

export const AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES: AutonomousCommerceReasoningGraphProfile[] = [
  {
    id: "telemetry-only",
    description: "Commerce reasoning graph telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    maxDelta: COMMERCE_REASONING_GRAPH_MAX_DELTA,
    maxPathAmplification: COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
    maxCausalAmplification: COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  },
  {
    id: "passive-graph",
    description: "Passive reasoning graph signals from aggregate telemetry only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    maxDelta: COMMERCE_REASONING_GRAPH_MAX_DELTA,
    maxPathAmplification: COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
    maxCausalAmplification: COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  },
  {
    id: "shadow-graph",
    description: "Shadow reasoning graph deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    maxDelta: COMMERCE_REASONING_GRAPH_MAX_DELTA,
    maxPathAmplification: COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
    maxCausalAmplification: COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  },
  {
    id: "bounded-graph",
    description: "Bounded commerce reasoning graph ranking stabilization.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresDecisionStable: false,
    maxDelta: COMMERCE_REASONING_GRAPH_MAX_DELTA,
    maxPathAmplification: COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
    maxCausalAmplification: COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  },
  {
    id: "protected-graph",
    description: "Reasoning graph with governance + decision stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresDecisionStable: true,
    maxDelta: COMMERCE_REASONING_GRAPH_MAX_DELTA,
    maxPathAmplification: COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
    maxCausalAmplification: COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  },
  {
    id: "full-safe-graph",
    description: "Full reasoning graph with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresDecisionStable: true,
    maxDelta: COMMERCE_REASONING_GRAPH_MAX_DELTA,
    maxPathAmplification: COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION,
    maxCausalAmplification: COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION,
  },
];

export function resolveAutonomousCommerceReasoningGraphProfile(mode: AutonomousCommerceReasoningGraphMode): AutonomousCommerceReasoningGraphProfile {
  return AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES.find((p) => p.id === mode) ?? AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROFILES[0];
}
