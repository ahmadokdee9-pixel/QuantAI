/**
 * Deterministic scoring helpers shared by domain adapters.
 * Confidence never rises merely because more text exists.
 */

import type { CanonicalDecisionAction } from "@/lib/universalDecision/types";

export function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function memoryIdentityFor(domain: string, id: string): string {
  return `${domain}:${id}`;
}

export function pickActionFromSignals(args: {
  candidateCount: number;
  bestScore: number | null;
  priceSpreadPct: number | null;
  highRisk: boolean;
  waitSignal: boolean;
  insufficient: boolean;
}): CanonicalDecisionAction {
  if (args.insufficient || args.candidateCount === 0) return "COMPARE";
  if (args.highRisk) return "AVOID";
  if (args.waitSignal) return "WAIT";
  if (args.candidateCount >= 2 && (args.priceSpreadPct ?? 0) < 8 && (args.bestScore ?? 0) < 72) {
    return "COMPARE";
  }
  if ((args.bestScore ?? 0) >= 68 && args.candidateCount >= 1) return "BUY";
  if (args.candidateCount >= 2) return "COMPARE";
  return "WAIT";
}

export function confidenceFromEvidence(args: {
  factCount: number;
  candidateCount: number;
  providerLive: boolean;
  domainConfidence: number;
  partial: boolean;
}): number {
  if (!args.providerLive || args.candidateCount === 0) {
    return clampPct(Math.min(35, args.domainConfidence * 0.4));
  }
  // Cap by facts present — prose volume never boosts score.
  const factFloor = Math.min(args.factCount, 6) * 8;
  const candidateBoost = Math.min(args.candidateCount, 5) * 4;
  const base = 28 + factFloor + candidateBoost;
  const capped = Math.min(base, 55 + args.domainConfidence * 0.35);
  const withDomain = Math.min(capped, args.domainConfidence + 10);
  return clampPct(args.partial ? withDomain * 0.85 : withDomain);
}
