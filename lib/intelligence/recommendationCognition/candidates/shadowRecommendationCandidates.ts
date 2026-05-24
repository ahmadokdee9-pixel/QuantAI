/**
 * Phase 7 — Shadow recommendation candidates (deterministic scores, no mutation).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { LatentIntentProfile, ShadowRecommendationCandidate } from "../types";
import type { RecommendationReasoningResult } from "../cognition/recommendationReasoningKernel";
import { MAX_SHADOW_CANDIDATES } from "../contracts/deterministicRecommendationContracts";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildShadowRecommendationCandidates(args: {
  products: QuantProduct[];
  intent: LatentIntentProfile;
  reasoning: RecommendationReasoningResult;
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
}): ShadowRecommendationCandidate[] {
  const candidates: ShadowRecommendationCandidate[] = [];
  const storeSeen = new Map<string, number>();

  const scored = args.products.map((p) => {
    const prep = args.trustResult?.rankingPrepByLink[p.link];
    const trustScore = prep ? prep.trustScore / 100 : 0.5;
    const priceFit =
      args.intent.valueSeekingIntent01 > 0.5
        ? 1 - p.price / (args.products[0]?.price || p.price || 1)
        : args.intent.luxuryIntent01;
    const deterministicScore = round4(
      clamp01(trustScore * 0.4 + priceFit * 0.3 + args.reasoning.confidence01 * 0.3) * 100
    );
    return { p, deterministicScore, trustScore };
  });

  scored.sort((a, b) => b.deterministicScore - a.deterministicScore);

  for (let i = 0; i < scored.length && candidates.length < MAX_SHADOW_CANDIDATES; i++) {
    const { p, deterministicScore, trustScore } = scored[i]!;
    const store = p.store.trim().toLowerCase();
    const slot = storeSeen.get(store) ?? 0;
    storeSeen.set(store, slot + 1);

    const commerceId = p.qiNormalizedCommerce?.commerceId ?? p.link;
    candidates.push({
      link: p.link,
      commerceId,
      deterministicScore,
      confidence01: round4(args.reasoning.confidence01 * 0.7 + trustScore * 0.3),
      trustBalance01: round4(trustScore),
      diversitySlot: slot,
      rankingMutation: false,
      sequenceIndex: i,
    });
  }

  return candidates;
}

export function computeDiversityStability(candidates: ShadowRecommendationCandidate[]): number {
  if (!candidates.length) return 0;
  const stores = new Set(candidates.map((c, i) => `${c.diversitySlot}_${i % 4}`));
  return round4(clamp01(stores.size / Math.max(1, candidates.length)));
}
