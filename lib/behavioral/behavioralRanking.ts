/**
 * P5.9 — Behavioral ranking stabilization (conversion-aware).
 */

import type { BehavioralBalanceResult, BehavioralBlendInfluence } from "@/lib/behavioral/behavioralBalancer";
import type { BehavioralProfile } from "@/lib/behavioral/behavioralProfiles";
import type { BehavioralSignalBundle } from "@/lib/behavioral/behavioralSignals";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function applyBehavioralStabilizationRanking(args: {
  products: QuantProduct[];
  influence: BehavioralBlendInfluence;
  balance: BehavioralBalanceResult;
  signals: BehavioralSignalBundle;
  profile: BehavioralProfile;
}): QuantProduct[] {
  const { products, influence, balance, signals, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.conversionReadiness * (getStoreTrustScore(p.store) / 100);
    score += influence.trustMomentum * 0.12;
    score += influence.continuityStrength * 0.2;
    score -= influence.buyingFriction * 0.06;
    score -= influence.decisionHesitation * 0.05;

    if (balance.routingLane === "conversion-ready") score += influence.readinessAmplification * 0.1;
    if (balance.routingLane === "trust-momentum") score += influence.trustMomentum * 0.08;
    if (balance.routingLane === "comparison-fatigue") score -= influence.comparisonFatigue * 0.04;
    if (balance.routingLane === "friction-check") score -= influence.frictionAmplification * 0.05;
    if (index === 0) score += influence.conversionReadiness * 0.04;

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

export function computeBehavioralReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  signals: BehavioralSignalBundle;
}): number {
  const { preLinks, postLinks, signals } = args;
  const n = Math.min(5, preLinks.length, postLinks.length);
  if (n === 0) return 100;
  let matches = 0;
  for (let i = 0; i < n; i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const stabilityOk = signals.conversionReadiness >= 0.2 ? 10 : 0;
  return Math.min(100, Math.round((matches / n) * 90 + stabilityOk));
}
