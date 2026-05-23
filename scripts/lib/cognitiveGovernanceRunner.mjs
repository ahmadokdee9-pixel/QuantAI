/**
 * P6.8 — Unified cognitive governance evaluation runner.
 */
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV } from "./commerceReasoningGraphRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV = {
  ...AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV,
  COGNITIVE_GOVERNANCE_ENABLED: "true",
  COGNITIVE_GOVERNANCE_MODE: "bounded-governance",
};

export const UNIFIED_COGNITIVE_GOVERNANCE_TELEMETRY_ENV = {
  ...AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV,
  NODE_ENV: "production",
  COGNITIVE_GOVERNANCE_ENABLED: "true",
  COGNITIVE_GOVERNANCE_MODE: "telemetry-only",
};

export function runCognitiveGovernancePartitions(env = UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    unifiedCognitiveGovernance: r.unifiedCognitiveGovernance,
    autonomousCommerceReasoningGraph: r.autonomousCommerceReasoningGraph,
    row: r.row,
  }));
}

export { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV };
