/**
 * Phase 1 — Unified replay / drift primitives for controlled layers (DRY governance kernel).
 */

import { countRankingTopDrift } from "@/lib/governance/controlledStackRegistry";

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
