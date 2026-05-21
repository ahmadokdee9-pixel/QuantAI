/**
 * P5.3 — Coordination stabilizer (bounded influence; deterministic ranking).
 */

import type { CommerceReasoningGraph } from "@/lib/intent/intentCoordinationGraph";
import type { IntentCoordinationProfile } from "@/lib/intent/intentCoordinationProfiles";
import type { ConflictResolution } from "@/lib/intent/intentConflictResolver";
import type { ReasoningCoordinationResult } from "@/lib/intent/intentReasoningCoordinator";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type CoordinationStabilizationInfluence = {
  coordinationDelta: number;
  trustPropagation: number;
  suppressionCoordination: number;
  diversityCoordination: number;
  intentRebalance: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeCoordinationStabilizationInfluence(args: {
  graph: CommerceReasoningGraph;
  conflict: ConflictResolution;
  coordinated: ReasoningCoordinationResult;
  profile: IntentCoordinationProfile;
}): CoordinationStabilizationInfluence {
  const { graph, conflict, coordinated, profile } = args;
  const damp = coordinated.governanceDampen * conflict.dampeningFactor;

  const trustPropagation = clamp(graph.trustPropagation * damp, 0, profile.maxTrustPropagation);
  const suppressionCoordination = clamp(graph.suppressionCoordination * damp, 0, profile.maxSuppressionRebalance);
  const diversityCoordination = clamp(graph.diversityCoordination * damp, 0, profile.maxDiversityCoordination);
  const intentRebalance = clamp(
    conflict.resolvedWeight * profile.maxIntentRebalance * damp,
    0,
    profile.maxIntentRebalance
  );

  const coordinationDelta = clamp(
    (trustPropagation + suppressionCoordination + diversityCoordination + intentRebalance) *
      0.28 *
      (coordinated.reasoningStability / 100),
    0,
    profile.maxDelta
  );

  return {
    coordinationDelta: Math.round(coordinationDelta * 1000) / 1000,
    trustPropagation: Math.round(trustPropagation * 1000) / 1000,
    suppressionCoordination: Math.round(suppressionCoordination * 1000) / 1000,
    diversityCoordination: Math.round(diversityCoordination * 1000) / 1000,
    intentRebalance: Math.round(intentRebalance * 1000) / 1000,
  };
}

export function applyCoordinationStabilizationRanking(args: {
  products: QuantProduct[];
  influence: CoordinationStabilizationInfluence;
  coordinated: ReasoningCoordinationResult;
  graph: CommerceReasoningGraph;
  profile: IntentCoordinationProfile;
}): QuantProduct[] {
  const { products, influence, coordinated, graph, profile } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    let score = (products.length - index) * 10;
    score += influence.trustPropagation * (getStoreTrustScore(p.store) / 100);
    score -= influence.suppressionCoordination * 0.15;
    if (coordinated.routingLane === "reinforce" || graph.stabilizationRoute === "reinforce") {
      score += influence.intentRebalance * 0.5;
    }
    if (coordinated.routingLane === "conflict" || graph.stabilizationRoute === "resolve") {
      score -= influence.intentRebalance * 0.2;
    }
    const stores = new Set(products.slice(0, 5).map((x) => x.store.toLowerCase()));
    if (stores.size >= 2) score += influence.diversityCoordination * 0.1;
    score = clamp(score, -profile.maxDelta * 5, products.length * 10 + profile.maxIntentRebalance);
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

export function computeCoordinationReplayIntegrity(args: {
  preLinks: string[];
  postLinks: string[];
  graph: CommerceReasoningGraph;
}): number {
  const { preLinks, postLinks, graph } = args;
  let matches = 0;
  for (let i = 0; i < Math.min(5, preLinks.length, postLinks.length); i += 1) {
    if (preLinks[i] === postLinks[i]) matches += 1;
  }
  const hashOk = graph.graphIntegrity >= 60 ? 10 : 0;
  return Math.min(100, Math.round((matches / 5) * 90 + hashOk));
}
