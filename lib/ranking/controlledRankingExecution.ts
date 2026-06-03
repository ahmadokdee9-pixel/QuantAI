/**
 * Phase 13.4 — Controlled Ranking Execution Layer.
 * Activates deterministic ranking execution using Phase 13.3 rankingExecution only.
 */

import type {
  RankingExecutionCandidate,
  RankingExecutionMeta,
  RankingExecutionMode,
} from "@/lib/ranking/rankingExecutionPreparation";

export type RankingChangeDirection = "up" | "down" | "unchanged";

export type RankingChange = {
  productId: number;
  link: string;
  fromRank: number;
  toRank: number;
  delta: number;
  candidateScore: number;
  direction: RankingChangeDirection;
};

export type ExecutedRankingMeta = {
  version: "phase13.4-v1";
  executed: boolean;
  candidateCount: number;
  rerankedCount: number;
  executionConfidence: number;
  executionMode: RankingExecutionMode;
  rankingChanges: RankingChange[];
  rankingSummary: string;
  rankingWarnings: string[];
};

export type ControlledRankingProduct = {
  id: number;
  link: string;
  qiRank?: number;
};

export type ControlledRankingInput<T extends ControlledRankingProduct> = {
  rankingExecution: RankingExecutionMeta;
  products: T[];
};

export type ControlledRankingResult<T extends ControlledRankingProduct> = {
  executedRanking: ExecutedRankingMeta;
  products: T[];
};

const VERSION = "phase13.4-v1" as const;

const BAND_ORDER = {
  primary: 0,
  secondary: 1,
  hold: 2,
} as const;

function findCandidate(
  candidates: RankingExecutionCandidate[],
  product: ControlledRankingProduct
): RankingExecutionCandidate | undefined {
  return candidates.find(
    (candidate) => candidate.productId === product.id || candidate.link === product.link
  );
}

function shouldExecute(rankingExecution: RankingExecutionMeta): boolean {
  const mode = rankingExecution.executionProfile.executionMode;
  if (mode === "blocked") return false;
  if (mode === "ready") return rankingExecution.executionConfidence >= 0.4;
  return rankingExecution.executionConfidence >= 0.3;
}

function sortScoreForCandidate(
  candidate: RankingExecutionCandidate,
  rankingExecution: RankingExecutionMeta,
  mode: RankingExecutionMode
): number {
  const bandPenalty = BAND_ORDER[candidate.priorityBand] * 0.08;
  const readyPenalty = candidate.executionReady ? 0 : 0.18;
  const tierBoost =
    rankingExecution.executionProfile.globalRankingTier === "VERY_HIGH"
      ? 0.04
      : rankingExecution.executionProfile.globalRankingTier === "HIGH"
        ? 0.02
        : 0;

  if (mode === "ready") {
    return (
      (1 - candidate.candidateScore) * 0.72 +
      bandPenalty +
      readyPenalty -
      tierBoost +
      candidate.currentRank * 0.0005 +
      candidate.productId * 0.000001
    );
  }

  const blend = rankingExecution.executionConfidence * 0.65;
  const target = (1 - candidate.candidateScore) * 0.72 + bandPenalty + readyPenalty - tierBoost;
  const original = candidate.currentRank * 0.01;
  return original * (1 - blend) + target * blend + candidate.productId * 0.000001;
}

function orderProducts<T extends ControlledRankingProduct>(
  products: T[],
  rankingExecution: RankingExecutionMeta,
  execute: boolean
): T[] {
  if (!execute || products.length <= 1) {
    return products.map((product, index) => ({ ...product, qiRank: index }));
  }

  const mode = rankingExecution.executionProfile.executionMode;
  const candidates = rankingExecution.rankingCandidates;
  const withCandidates: Array<{ product: T; candidate?: RankingExecutionCandidate; index: number }> =
    products.map((product, index) => ({
      product,
      candidate: findCandidate(candidates, product),
      index,
    }));

  const ranked = withCandidates.filter((entry) => entry.candidate);
  const unranked = withCandidates.filter((entry) => !entry.candidate);

  ranked.sort((a, b) => {
    const scoreA = sortScoreForCandidate(a.candidate!, rankingExecution, mode);
    const scoreB = sortScoreForCandidate(b.candidate!, rankingExecution, mode);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.product.id - b.product.id;
  });

  unranked.sort((a, b) => a.index - b.index);

  return [...ranked, ...unranked].map((entry, index) => ({
    ...entry.product,
    qiRank: index,
  }));
}

function buildRankingChanges<T extends ControlledRankingProduct>(
  before: T[],
  after: T[],
  rankingExecution: RankingExecutionMeta
): RankingChange[] {
  const beforeIndex = new Map(before.map((product, index) => [product.id, index]));
  const candidates = rankingExecution.rankingCandidates;

  return after.map((product, toRank) => {
    const fromRank = beforeIndex.get(product.id) ?? toRank;
    const candidate = findCandidate(candidates, product);
    const delta = fromRank - toRank;
    const direction: RankingChangeDirection =
      delta > 0 ? "up" : delta < 0 ? "down" : "unchanged";

    return {
      productId: product.id,
      link: product.link,
      fromRank,
      toRank,
      delta,
      candidateScore: candidate?.candidateScore ?? 0,
      direction,
    };
  });
}

function buildRankingSummary(
  rankingExecution: RankingExecutionMeta,
  executed: boolean,
  rerankedCount: number
): string {
  const mode = rankingExecution.executionProfile.executionMode;
  const tier = rankingExecution.executionProfile.globalRankingTier;
  const reasons = rankingExecution.executionProfile.metadata.reasons;

  if (!executed) {
    return `Controlled ranking was not executed (${mode} mode, ${tier} tier).`;
  }

  const reasonText =
    reasons.length > 0 ? ` Reasons preserved: ${reasons.join(" ")}` : "";

  return `Controlled ranking executed in ${mode} mode (${tier} tier) with ${rerankedCount} reranked products at confidence ${rankingExecution.executionConfidence}.${reasonText}`;
}

/** Execute controlled deterministic ranking using Phase 13.3 rankingExecution only. */
export function executeControlledRanking<T extends ControlledRankingProduct>(
  input: ControlledRankingInput<T>
): ControlledRankingResult<T> {
  const { rankingExecution, products } = input;
  const execute = shouldExecute(rankingExecution);
  const reordered = orderProducts(products, rankingExecution, execute);
  const rankingChanges = buildRankingChanges(products, reordered, rankingExecution);
  const rerankedCount = rankingChanges.filter((change) => change.direction !== "unchanged").length;

  return {
    executedRanking: {
      version: VERSION,
      executed: execute && rerankedCount > 0,
      candidateCount: rankingExecution.candidateCount,
      rerankedCount,
      executionConfidence: rankingExecution.executionConfidence,
      executionMode: rankingExecution.executionProfile.executionMode,
      rankingChanges,
      rankingSummary: buildRankingSummary(rankingExecution, execute && rerankedCount > 0, rerankedCount),
      rankingWarnings: [...rankingExecution.executionWarnings],
    },
    products: reordered,
  };
}
