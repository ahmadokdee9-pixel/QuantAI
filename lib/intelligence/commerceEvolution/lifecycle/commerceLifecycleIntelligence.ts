/**
 * Phase 10 — Commerce lifecycle intelligence.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { CommerceLifecycleProfile, LifecyclePhase } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveCommerceLifecycle(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  recommendationResult?: RecommendationCognitionResult | null;
}): CommerceLifecycleProfile {
  const q = args.query.toLowerCase();
  const exploration = args.recommendationResult?.intentEvolution.exploration01 ?? 0.5;
  const commitment = args.recommendationResult?.intentEvolution.commitment01 ?? 0.4;
  const maturity = args.recommendationResult?.intentEvolution.shoppingMaturity01 ?? 0.3;

  let phase: LifecyclePhase = "discovery";
  if (commitment > exploration + 0.15) phase = "commitment";
  else if (exploration > commitment + 0.15) phase = "comparison";
  if (/\b(replace|upgrade|newer|successor)\b/.test(q)) phase = "replacement";

  const replacementCycle01 = round4(
    clamp01(
      (args.recommendationResult?.latentIntent.upgradeIntent01 ?? 0.2) * 0.5 +
        maturity * 0.3 +
        args.sessionMemory.interactionCount / 15 * 0.2
    )
  );
  const timingSensitivity01 = round4(
    clamp01((args.recommendationResult?.latentIntent.urgency01 ?? 0.2) + maturity * 0.3)
  );

  return {
    phase,
    lifecycleMaturity01: round4(maturity),
    replacementCycle01,
    timingSensitivity01,
  };
}
