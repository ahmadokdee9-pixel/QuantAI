/**
 * Mutation governance kernel — validates all thresholds before shadow mutation prep.
 */

import type { ControlledActivationInput, MutationGovernanceVerdict } from "../types";
import { evaluateRankingSafety } from "./rankingSafetyEvaluator";
import { validateReplayMutation } from "./replayMutationValidator";
import { auditCommerceMutation } from "./commerceMutationAuditor";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function runMutationGovernanceKernel(
  input: ControlledActivationInput
): MutationGovernanceVerdict {
  const blockedReasons: string[] = [];
  const ranking = evaluateRankingSafety({
    preLinks: input.preMutationLinks,
    products: input.products,
  });
  const replay = validateReplayMutation({
    trustResult: input.trustResult,
    recommendationResult: input.recommendationResult,
    commerceOsResult: input.commerceOsResult,
  });
  const audit = auditCommerceMutation({
    products: input.products,
    trustResult: input.trustResult,
  });

  const recStability =
    (input.recommendationResult?.meta.diversityStability01 ?? 0.5) >= 0.25;
  const cognitionConf =
    input.commerceOsResult?.meta.avgStrategicConfidence ??
    input.recommendationResult?.meta.avgConfidence01 ??
    0.4;
  const latencyOk = input.latencyBudgetOk !== false;
  const falseCollapseOk = audit.falseCollapseRisk01 < 0.35;

  const checks: Record<string, boolean> = {
    replay_determinism: replay.ok,
    trust_integrity: audit.trustIntegrityOk,
    false_collapse: falseCollapseOk,
    merchant_diversity: ranking.merchantDiversity01 >= 0.2,
    latency_budget: latencyOk,
    recommendation_stability: recStability,
    cognition_confidence: cognitionConf >= 0.45,
    ranking_safety: ranking.safe,
  };

  for (const [k, v] of Object.entries(checks)) {
    if (!v) blockedReasons.push(k);
  }

  const passCount = Object.values(checks).filter(Boolean).length;
  const confidence01 = round4(passCount / Object.keys(checks).length);

  return {
    approved: blockedReasons.length === 0,
    shadowOnly: true,
    blockedReasons: blockedReasons.slice(0, 10),
    checks,
    confidence01,
  };
}
