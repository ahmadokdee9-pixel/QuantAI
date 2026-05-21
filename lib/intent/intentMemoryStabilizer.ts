/**
 * P5.2 — Memory stabilization influence (bounded, deterministic).
 */

import type { IntentMemoryProfile } from "@/lib/intent/intentMemoryProfiles";
import type { IntentMemorySnapshot } from "@/lib/intent/intentMemoryStore";
import type { MemoryCoordinationResult } from "@/lib/intent/intentMemoryCoordinator";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type MemoryStabilizationInfluence = {
  memoryDelta: number;
  trustMemory: number;
  suppressionMemory: number;
  diversityMemory: number;
  continuityScore: number;
  stabilizationMemoryScore: number;
  driftMemoryScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function computeMemoryStabilizationInfluence(args: {
  products: QuantProduct[];
  snapshot: IntentMemorySnapshot;
  previous: IntentMemorySnapshot | null;
  coordinated: MemoryCoordinationResult;
  profile: IntentMemoryProfile;
}): MemoryStabilizationInfluence {
  const { products, snapshot, previous, coordinated, profile } = args;

  let continuityScore = 50;
  if (previous) {
    let overlap = 0;
    for (let i = 0; i < Math.min(5, snapshot.topLinks.length, previous.topLinks.length); i += 1) {
      if (snapshot.topLinks[i] === previous.topLinks[i]) overlap += 1;
    }
    continuityScore = Math.round((overlap / 5) * 100);
  }

  const trustMemory = clamp(
    snapshot.trustMemory * coordinated.governanceDampen * 0.4,
    0,
    profile.maxTrustReinforcement
  );
  const suppressionMemory = clamp(
    snapshot.suppressionMemory * 0.35 * coordinated.governanceDampen,
    0,
    profile.maxSuppressionRecovery
  );

  const stores = new Set(products.slice(0, 5).map((p) => p.store.toLowerCase()));
  const diversityMemory = clamp(
    (stores.size >= 2 ? profile.maxDiversityStabilization * 0.6 : profile.maxDiversityStabilization * 0.3) *
      coordinated.governanceDampen,
    0,
    profile.maxDiversityStabilization
  );

  const driftMemoryScore = clamp(100 - snapshot.driftMemory * 30, 0, 100);
  const stabilizationMemoryScore = clampScore(
    continuityScore * 0.4 + driftMemoryScore * 0.3 + snapshot.orchestrationScore * 0.3
  );

  const memoryDelta = clamp(
    (trustMemory + suppressionMemory + diversityMemory) * 0.35 * (continuityScore / 100),
    0,
    profile.maxDelta
  );

  return {
    memoryDelta: Math.round(memoryDelta * 1000) / 1000,
    trustMemory: Math.round(trustMemory * 1000) / 1000,
    suppressionMemory: Math.round(suppressionMemory * 1000) / 1000,
    diversityMemory: Math.round(diversityMemory * 1000) / 1000,
    continuityScore,
    stabilizationMemoryScore,
    driftMemoryScore,
  };
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function applyMemoryStabilizationRanking(args: {
  products: QuantProduct[];
  influence: MemoryStabilizationInfluence;
  coordinated: MemoryCoordinationResult;
  profile: IntentMemoryProfile;
  reconstructed: QuantProduct[];
}): QuantProduct[] {
  const { products, influence, coordinated, profile, reconstructed } = args;
  if (products.length <= 1) return products;

  const base = reconstructed.length ? reconstructed : products;
  const scored = base.map((p, index) => {
    let score = (base.length - index) * 10;
    score += influence.trustMemory * (getStoreTrustScore(p.store) / 100);
    score -= influence.suppressionMemory * 0.2;
    if (coordinated.routingLane === "reinforce") score += influence.continuityScore * 0.01;
    score = clamp(score, -profile.maxDelta * 5, base.length * 10 + profile.maxContinuityBoost);
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
