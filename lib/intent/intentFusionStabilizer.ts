/**
 * P5.4 — Fusion stabilizer (bounded ranking synthesis).
 */

import type { FusionBalanceResult, FusionBlendInfluence } from "@/lib/intent/intentFusionBalancer";
import type { IntentFusionProfile } from "@/lib/intent/intentFusionProfiles";
import type { FusedCommerceSignals } from "@/lib/intent/intentSignalFusion";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyFusionStabilizationRanking(args: {
  products: QuantProduct[];
  influence: FusionBlendInfluence;
  balance: FusionBalanceResult;
  signals: FusedCommerceSignals;
  profile: IntentFusionProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.trustFusion * (getStoreTrustScore(p.store) / 100);
    score += influence.valueFusion * 0.4;
    score += influence.qualityFusion * ((typeof p.rating === "number" ? p.rating : 4) / 5);
    score -= influence.suppressionRecovery * 0.12;
    score += influence.rankingContinuity * 0.3;

    if (balance.routingLane === "compare") score += influence.premiumFusion * 0.15;
    if (balance.routingLane === "reinforce") score += influence.diversityBalance * 0.12;
    if (balance.routingLane === "recover") score += influence.suppressionRecovery * 0.08;
    if (balance.routingLane === "balance") {
      score += (influence.trustFusion + influence.valueFusion) * 0.1;
    }
    if (balance.routingLane === "suppress") score -= influence.suppressionRecovery * 0.05;
    if (signals.fusionConfidence >= 0.5) score += influence.urgencyFusion * 0.08;

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

export function computeFusionReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: FusedCommerceSignals;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const confidenceOk = signals.fusionConfidence >= 0.4 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + confidenceOk));
}

export function computeMerchantFairnessScore(products: QuantProduct[]): number {
  const top = products.slice(0, 5);
  const stores = new Set(top.map((p) => p.store.toLowerCase()));
  return Math.min(100, Math.round((stores.size / Math.max(1, top.length)) * 100));
}
