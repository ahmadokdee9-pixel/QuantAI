/**
 * Phase 3 — Unified replay / drift primitives for controlled layers (DRY governance kernel).
 */

import { countRankingTopDrift as countDriftFromRegistry } from "@/lib/governance/controlledStackRegistry";

export const DEFAULT_REPLAY_INTEGRITY_FLOOR = 70;
export const DEFAULT_HARD_ROLLBACK_DRIFT = 3;

export type ReplayIntegrityInput = {
  preOrderLinks: string[];
  postOrderLinks: string[];
  integrityScore: number;
  driftLimit?: number;
};

export type ReplayIntegrityVerdict = {
  integrityOk: boolean;
  driftCount: number;
  shouldRollback: boolean;
  integrityScore: number;
};

export function countRankingTopDrift(pre: string[], post: string[], n = 5): number {
  return countDriftFromRegistry(pre, post, n);
}

export function evaluateReplayIntegrity(input: ReplayIntegrityInput): ReplayIntegrityVerdict {
  const driftLimit = input.driftLimit ?? DEFAULT_HARD_ROLLBACK_DRIFT;
  const driftCount = countRankingTopDrift(input.preOrderLinks, input.postOrderLinks);
  const integrityOk = input.integrityScore >= DEFAULT_REPLAY_INTEGRITY_FLOOR;
  const shouldRollback = !integrityOk || driftCount > driftLimit;
  return {
    integrityOk,
    driftCount,
    shouldRollback,
    integrityScore: input.integrityScore,
  };
}

export function linksFromProducts(
  products: { link?: string; title?: string }[],
  n = 5
): string[] {
  return products.slice(0, n).map((p) => p.link || p.title || "");
}

/** Deterministic replay trace entry for orchestration observability. */
export type DeterministicReplayTrace = {
  layerId: string;
  preLinks: string[];
  postLinks: string[];
  drift: number;
  integrityScore: number;
  rolledBack: boolean;
  skipped: boolean;
  skipReason?: string;
};

export function buildReplayTrace(args: {
  layerId: string;
  preProducts: { link?: string; title?: string }[];
  postProducts: { link?: string; title?: string }[];
  integrityScore?: number;
  rolledBack?: boolean;
  skipped?: boolean;
  skipReason?: string;
}): DeterministicReplayTrace {
  const preLinks = linksFromProducts(args.preProducts);
  const postLinks = linksFromProducts(args.postProducts);
  return {
    layerId: args.layerId,
    preLinks,
    postLinks,
    drift: countRankingTopDrift(preLinks, postLinks),
    integrityScore: args.integrityScore ?? 100,
    rolledBack: args.rolledBack ?? false,
    skipped: args.skipped ?? false,
    skipReason: args.skipReason,
  };
}
