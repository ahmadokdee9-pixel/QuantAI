/**
 * P6.1 — Query uncertainty/conflict + cross-intent contradiction detection.
 */

import type { IntentComparison } from "@/lib/intent/intentComparison";
import type { IntentReadiness } from "@/lib/intent/intentReadiness";
import type { IntentTrust } from "@/lib/intent/intentTrust";
import type { IntentUnderstanding } from "@/lib/intent/intentUnderstanding";
import type { IntentValue } from "@/lib/intent/intentValue";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";

export type IntentContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

const UNCERTAIN = /\b(not sure|maybe|either|or|vs|versus|confused|help me choose|which one)\b/i;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectIntentContradictions(args: {
  query: string;
  understanding: IntentUnderstanding;
  value: IntentValue;
  comparison: IntentComparison;
  readiness: IntentReadiness;
  trust: IntentTrust;
  cognition: CognitionEngineMeta;
}): IntentContradictionResult {
  const { query, understanding, value, comparison, readiness, trust, cognition } = args;
  const contradictions: string[] = [];

  if (value.premiumIntent >= 0.5 && value.valueIntent >= 0.5) contradictions.push("premium_value_conflict");
  if (comparison.comparisonIntent >= 0.5 && understanding.purchaseMode === "purchase") contradictions.push("compare_purchase_conflict");
  if (readiness.readinessIntent >= 0.5 && readiness.hesitationIntent >= 0.5) contradictions.push("readiness_hesitation_conflict");
  if (understanding.explorationIntent >= 0.55 && understanding.hiddenBuyingIntent >= 0.55) contradictions.push("explore_buy_conflict");
  if (cognition.contradictionCount >= 2) contradictions.push("cognition_upstream_conflict");
  if (cognition.rollbackTriggered) contradictions.push("cognition_rollback");
  if (UNCERTAIN.test(query)) contradictions.push("query_uncertainty");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.15 + (UNCERTAIN.test(query) ? 0.25 : 0) + cognition.contradictionCount * 0.08)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}
