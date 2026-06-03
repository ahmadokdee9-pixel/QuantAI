/**
 * Phase 13.3 — Ranking Execution Preparation Layer.
 * Prepares search results for future ranking execution using productRanking profiles.
 * Read-only — no sorting, reranking, tray, UI, or persistence mutations.
 */

import type { RankingTier } from "@/lib/ranking/deterministicRankingEngine";
import type { ProductRankingMeta, ProductRankingProfile } from "@/lib/ranking/productRankingApplication";

export type RankingExecutionPriorityBand = "primary" | "secondary" | "hold";

export type RankingExecutionCandidate = {
  productId: number;
  link: string;
  currentRank: number;
  candidateScore: number;
  candidateTier: RankingTier;
  executionReady: boolean;
  priorityBand: RankingExecutionPriorityBand;
};

export type RankingExecutionMode = "ready" | "caution" | "blocked";

export type RankingExecutionMetadata = {
  profileVersion: string;
  preparedAtPhase: "phase13.3-v1";
  reasons: string[];
  warnings: string[];
  globalRankingScore: number;
  globalRankingTier: RankingTier;
  rankingConfidence: number;
};

export type RankingExecutionProfile = {
  globalRankingScore: number;
  globalRankingTier: RankingTier;
  rankingConfidence: number;
  readyCandidateCount: number;
  holdCandidateCount: number;
  executionMode: RankingExecutionMode;
  metadata: RankingExecutionMetadata;
};

export type RankingExecutionMeta = {
  version: "phase13.3-v1";
  candidateCount: number;
  rankingCandidates: RankingExecutionCandidate[];
  executionConfidence: number;
  executionWarnings: string[];
  executionProfile: RankingExecutionProfile;
};

const VERSION = "phase13.3-v1" as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function priorityBandFor(profile: ProductRankingProfile): RankingExecutionPriorityBand {
  if (!profile.rankingReady) return "hold";
  if (profile.preparedRankingTier === "HIGH" || profile.preparedRankingTier === "VERY_HIGH") {
    return "primary";
  }
  if (profile.preparedRankingTier === "MEDIUM") return "secondary";
  return "hold";
}

function buildRankingCandidate(profile: ProductRankingProfile): RankingExecutionCandidate {
  const priorityBand = priorityBandFor(profile);
  return {
    productId: profile.productId,
    link: profile.link,
    currentRank: profile.currentRank,
    candidateScore: profile.preparedRankingScore,
    candidateTier: profile.preparedRankingTier,
    executionReady: profile.rankingReady && priorityBand !== "hold",
    priorityBand,
  };
}

function resolveExecutionMode(
  productRanking: ProductRankingMeta,
  readyCandidateCount: number,
  candidateCount: number
): RankingExecutionMode {
  if (productRanking.rankingTier === "VERY_LOW" || readyCandidateCount === 0) {
    return "blocked";
  }

  const readyRatio = candidateCount > 0 ? readyCandidateCount / candidateCount : 0;

  if (
    (productRanking.rankingTier === "HIGH" || productRanking.rankingTier === "VERY_HIGH") &&
    productRanking.rankingConfidence >= 0.5 &&
    readyRatio >= 0.5
  ) {
    return "ready";
  }

  if (productRanking.rankingTier === "LOW" && productRanking.rankingWarnings.length >= 2) {
    return "blocked";
  }

  return "caution";
}

function computeExecutionConfidence(
  productRanking: ProductRankingMeta,
  readyCandidateCount: number,
  candidateCount: number
): number {
  const readyRatio = candidateCount > 0 ? readyCandidateCount / candidateCount : 0;
  let confidence = productRanking.rankingConfidence * 0.42;
  confidence += productRanking.rankingScore * 0.28;
  confidence += readyRatio * 0.2;
  confidence -= Math.min(productRanking.rankingWarnings.length * 0.04, 0.16);

  if (productRanking.rankingTier === "VERY_HIGH") confidence += 0.08;
  else if (productRanking.rankingTier === "VERY_LOW") confidence -= 0.12;

  return round2(clamp01(confidence));
}

function buildExecutionWarnings(
  productRanking: ProductRankingMeta,
  executionMode: RankingExecutionMode,
  readyCandidateCount: number
): string[] {
  const warnings = [...productRanking.rankingWarnings];

  if (readyCandidateCount === 0) {
    warnings.push("No execution-ready ranking candidates were prepared.");
  }

  if (executionMode === "blocked") {
    warnings.push("Ranking execution is blocked pending stronger ranking signals.");
  } else if (executionMode === "caution") {
    warnings.push("Ranking execution should proceed with caution.");
  }

  if (productRanking.rankingConfidence < 0.45) {
    warnings.push("Ranking confidence is below the execution readiness threshold.");
  }

  return [...new Set(warnings)];
}

function buildExecutionProfile(
  productRanking: ProductRankingMeta,
  rankingCandidates: RankingExecutionCandidate[],
  executionWarnings: string[]
): RankingExecutionProfile {
  const readyCandidateCount = rankingCandidates.filter((candidate) => candidate.executionReady).length;
  const holdCandidateCount = rankingCandidates.length - readyCandidateCount;
  const executionMode = resolveExecutionMode(
    productRanking,
    readyCandidateCount,
    rankingCandidates.length
  );

  return {
    globalRankingScore: productRanking.rankingScore,
    globalRankingTier: productRanking.rankingTier,
    rankingConfidence: productRanking.rankingConfidence,
    readyCandidateCount,
    holdCandidateCount,
    executionMode,
    metadata: {
      profileVersion: VERSION,
      preparedAtPhase: VERSION,
      reasons: [...productRanking.rankingReasons],
      warnings: executionWarnings,
      globalRankingScore: productRanking.rankingScore,
      globalRankingTier: productRanking.rankingTier,
      rankingConfidence: productRanking.rankingConfidence,
    },
  };
}

/** Prepare ranking execution candidates from Phase 13.2 productRanking only. */
export function prepareRankingExecution(productRanking: ProductRankingMeta): RankingExecutionMeta {
  const rankingCandidates = productRanking.rankingProfile.map(buildRankingCandidate);
  const executionProfile = buildExecutionProfile(productRanking, rankingCandidates, []);
  const executionWarnings = buildExecutionWarnings(
    productRanking,
    executionProfile.executionMode,
    executionProfile.readyCandidateCount
  );
  const finalizedProfile = buildExecutionProfile(
    productRanking,
    rankingCandidates,
    executionWarnings
  );

  return {
    version: VERSION,
    candidateCount: rankingCandidates.length,
    rankingCandidates,
    executionConfidence: computeExecutionConfidence(
      productRanking,
      finalizedProfile.readyCandidateCount,
      rankingCandidates.length
    ),
    executionWarnings,
    executionProfile: finalizedProfile,
  };
}
