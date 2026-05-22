/**
 * P6.6 — Commerce decision ranking + replay integrity.
 */

import type { CommerceDecisionBalanceResult, CommerceDecisionBlendInfluence } from "@/lib/commerceDecision/commerceDecisionBalancer";
import type { CommerceDecisionIntelligenceProfile } from "@/lib/commerceDecision/commerceDecisionProfiles";
import type { CommerceDecisionSignalBundle } from "@/lib/commerceDecision/commerceDecisionConfidence";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyCommerceDecisionStabilizationRanking(args: {
  products: QuantProduct[];
  influence: CommerceDecisionBlendInfluence;
  balance: CommerceDecisionBalanceResult;
  signals: CommerceDecisionSignalBundle;
  profile: CommerceDecisionIntelligenceProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    const storeTrust = getStoreTrustScore(p.store) / 100;

    score += influence.continuityInfluence * 0.25;
    score += influence.integrityInfluence * (p.qiComposite ?? 50) * 0.004;
    score += influence.formationReinforcement * 0.15;
    score += influence.trustValueStabilization * storeTrust * 0.08;
    score += influence.conversionStabilization * 0.06;
    score -= influence.promotionDampening * (p.qiRealityTrust?.fakeDiscountProbability ?? 0) * 0.04;
    score -= influence.outcomeDampening * 0.03;

    if (balance.routingLane === "decision-safe" || balance.routingLane === "reinforce") {
      score += influence.continuityInfluence * 0.06;
    }
    if (balance.routingLane === "promotion-check" || balance.routingLane === "outcome-check") {
      score -= signals.unsafePromotionDominanceScore * 0.03;
    }
    if (index === 0) score += influence.formationReinforcement * 0.03;

    score = clamp(score, -profile.maxDelta * 5, products.length * 10 + profile.maxDelta);
    return { p, index, score: Math.round(score * 1000) / 1000 };
  });

  return scored
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 0.0001) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);
}

export function computeCommerceDecisionReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: CommerceDecisionSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.balancedDecisionFormation >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
