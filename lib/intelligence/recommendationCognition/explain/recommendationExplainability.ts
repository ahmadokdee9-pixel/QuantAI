/**
 * Phase 7 — Recommendation explainability (meta-only).
 */

import type { RecommendationExplainability } from "../types";
import type { LatentIntentProfile } from "../types";
import type { IntentEvolutionSnapshot } from "../types";
import type { AutonomousRecommendationGraph } from "../graph/autonomousRecommendationGraph";
import type { RecommendationReasoningResult } from "../cognition/recommendationReasoningKernel";

export function buildRecommendationExplainability(args: {
  intent: LatentIntentProfile;
  evolution: IntentEvolutionSnapshot;
  graph: AutonomousRecommendationGraph;
  reasoning: RecommendationReasoningResult;
  confidence01: number;
}): RecommendationExplainability {
  const whyRecommended: string[] = [];
  const whyCrossCategory: string[] = [];
  const whyBundleSuggested: string[] = [];
  const whyUpgradeDetected: string[] = [];
  const whyLuxuryIntentDetected: string[] = [];
  const whyValueIntentDetected: string[] = [];
  const whyRecommendationConfidence: string[] = [];

  if (args.confidence01 >= 0.5) whyRecommended.push("cognition_confidence_threshold_met");
  for (const step of args.reasoning.reasoningChain.slice(0, 3)) {
    whyRecommended.push(step);
  }

  for (const e of args.graph.expansions.slice(0, 3)) {
    whyCrossCategory.push(`${e.reason}_${e.fromCategory}_to_${e.toCategory}`);
  }

  for (const b of args.graph.bundleHints) whyBundleSuggested.push(b);
  for (const e of args.graph.ecosystemHints) whyBundleSuggested.push(e);

  if (args.intent.upgradeIntent01 >= 0.45) whyUpgradeDetected.push("upgrade_intent_signal");
  if (args.intent.luxuryIntent01 >= 0.5) whyLuxuryIntentDetected.push("luxury_intent_signal");
  if (args.intent.valueSeekingIntent01 >= 0.5) whyValueIntentDetected.push("value_seeking_signal");

  whyRecommendationConfidence.push(`confidence_${Math.round(args.confidence01 * 100)}`);
  whyRecommendationConfidence.push(`mode_${args.reasoning.explorationVsCommitment}`);
  whyRecommendationConfidence.push(`maturity_${Math.round(args.evolution.shoppingMaturity01 * 100)}`);

  return {
    whyRecommended: whyRecommended.slice(0, 6),
    whyCrossCategory: whyCrossCategory.slice(0, 6),
    whyBundleSuggested: whyBundleSuggested.slice(0, 6),
    whyUpgradeDetected: whyUpgradeDetected.slice(0, 4),
    whyLuxuryIntentDetected: whyLuxuryIntentDetected.slice(0, 4),
    whyValueIntentDetected: whyValueIntentDetected.slice(0, 4),
    whyRecommendationConfidence: whyRecommendationConfidence.slice(0, 6),
  };
}
