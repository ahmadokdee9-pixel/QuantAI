/**
 * Phase 8 — Commerce decision orchestrator (shadow coordination).
 */

import type { CommercePlanScenario } from "./deterministicCommercePlanner";
import type { StrategicRecommendationLayer } from "../types";

export type CommerceDecisionOrchestration = {
  primaryScenario: string;
  layerCount: number;
  orchestrationScore: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function orchestrateCommerceDecisions(args: {
  scenarios: CommercePlanScenario[];
  layers: StrategicRecommendationLayer[];
}): CommerceDecisionOrchestration {
  const primary = args.scenarios[0]?.scenarioId ?? "neutral";
  const orchestrationScore = round4(
    args.scenarios.length > 0
      ? args.scenarios.reduce((s, sc) => s + sc.trustValueBalance01, 0) / args.scenarios.length
      : 0.4
  );
  return {
    primaryScenario: primary,
    layerCount: args.layers.length,
    orchestrationScore,
  };
}
