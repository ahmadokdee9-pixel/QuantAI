/**
 * Phase 7 — Recommendation safety guards (anti-loop, anti-monopoly, no trust suppression).
 */

import type { ShadowRecommendationCandidate } from "../types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

export type SafetyGuardResult = {
  allowed: ShadowRecommendationCandidate[];
  blockedCount: number;
  blockReasons: string[];
};

const MAX_PER_STORE = 4;
const MIN_TRUST_FLOOR = 0.25;
const MAX_RECURSION_DEPTH = 1;

export function applyRecommendationSafetyGuards(args: {
  candidates: ShadowRecommendationCandidate[];
  products: { link: string; store: string }[];
  trustResult?: TrustEngineResult | null;
  priorCandidateLinks?: string[];
}): SafetyGuardResult {
  const blockReasons: string[] = [];
  const storeCounts = new Map<string, number>();
  const allowed: ShadowRecommendationCandidate[] = [];
  const priorSet = new Set(args.priorCandidateLinks ?? []);

  for (const c of args.candidates) {
    const product = args.products.find((p) => p.link === c.link);
    const store = product?.store.trim().toLowerCase() ?? "unknown";
    const storeCount = storeCounts.get(store) ?? 0;

    if (storeCount >= MAX_PER_STORE) {
      blockReasons.push("merchant_monopolization_cap");
      continue;
    }

    if (c.trustBalance01 < MIN_TRUST_FLOOR) {
      blockReasons.push("trust_suppression_blocked");
      continue;
    }

    if (priorSet.has(c.link) && priorSet.size >= MAX_RECURSION_DEPTH * 8) {
      blockReasons.push("anti_loop_recursion");
      continue;
    }

    const prep = args.trustResult?.rankingPrepByLink[c.link];
    if (prep && prep.fakeDiscountRisk >= 0.75) {
      blockReasons.push("unstable_discount_loop");
      continue;
    }

    storeCounts.set(store, storeCount + 1);
    allowed.push(c);
  }

  return {
    allowed,
    blockedCount: args.candidates.length - allowed.length,
    blockReasons: [...new Set(blockReasons)].slice(0, 6),
  };
}
