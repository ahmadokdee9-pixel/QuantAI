/**
 * Phase 45 — Buy Signal Balancing Engine.
 * Preserve BUY READY volume; avoid over-filtering large trays.
 */

import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";

export type BuySignalDistribution = {
  wait: number;
  compare: number;
  buyReady: number;
  strongBuy: number;
  bestDeal: number;
};

export type BuySignalBalancingInput = {
  link: string;
  rankIndex: number;
  currentTier: CommerceDecisionTier;
  trueValueScore: number;
  qualityScore: number;
  merchantReliabilityScore: number;
  discountConfidence: number;
  discountVerified: boolean;
  confidence: number;
};

const TARGET = {
  compareMinPct: 0.5,
  compareMaxPct: 0.7,
  buyReadyMinPct: 0.2,
  buyReadyMaxPct: 0.3,
  strongBuyMinPct: 0.05,
  strongBuyMaxPct: 0.15,
  bestDealMinPct: 0.02,
  bestDealMaxPct: 0.05,
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function tierRank(tier: CommerceDecisionTier): number {
  if (tier === "WAIT") return 0;
  if (tier === "COMPARE") return 1;
  if (tier === "BUY READY") return 2;
  if (tier === "STRONG BUY") return 3;
  return 4;
}

function countTier(map: Map<string, CommerceDecisionTier>, tier: CommerceDecisionTier): number {
  return [...map.values()].filter((t) => t === tier).length;
}

function eligibleForBuyReady(input: BuySignalBalancingInput): boolean {
  return (
    input.currentTier === "COMPARE" &&
    input.trueValueScore >= 62 &&
    input.qualityScore >= 58 &&
    input.merchantReliabilityScore >= 68 &&
    input.discountConfidence >= 55 &&
    input.confidence >= 68
  );
}

function eligibleForStrongBuy(input: BuySignalBalancingInput): boolean {
  return (
    (input.currentTier === "BUY READY" || input.currentTier === "COMPARE") &&
    input.trueValueScore >= 76 &&
    input.qualityScore >= 70 &&
    input.discountVerified &&
    input.merchantReliabilityScore >= 75 &&
    input.discountConfidence >= 70 &&
    input.confidence >= 80
  );
}

function eligibleForBestDeal(input: BuySignalBalancingInput, rankIndex: number, traySize: number): boolean {
  const topPct = rankIndex / Math.max(1, traySize - 1);
  return (
    input.trueValueScore >= 88 &&
    input.qualityScore >= 78 &&
    input.discountVerified &&
    input.merchantReliabilityScore >= 85 &&
    input.discountConfidence >= 82 &&
    input.confidence >= 88 &&
    topPct <= 0.05
  );
}

/** Balance buy signals — promote only, never demote BUY READY. */
export function balanceBuySignals(args: {
  rankedLinks: string[];
  tierByLink: Map<string, CommerceDecisionTier>;
  inputsByLink: Map<string, BuySignalBalancingInput>;
}): Map<string, CommerceDecisionTier> {
  const { rankedLinks, inputsByLink } = args;
  const traySize = rankedLinks.length;
  if (traySize === 0) return new Map(args.tierByLink);

  const next = new Map(args.tierByLink);

  const minBuyReady = Math.max(1, Math.floor(traySize * TARGET.buyReadyMinPct));
  const maxCompare = Math.ceil(traySize * TARGET.compareMaxPct);
  const maxStrongBuy = Math.ceil(traySize * TARGET.strongBuyMaxPct);
  const maxBestDeal = Math.max(1, Math.ceil(traySize * TARGET.bestDealMaxPct));

  let buyReady = countTier(next, "BUY READY");
  let compare = countTier(next, "COMPARE");

  if (buyReady < minBuyReady && compare > maxCompare * 0.85) {
    for (const [link, index] of rankedLinks.map((l, i) => [l, i] as const)) {
      if (buyReady >= minBuyReady) break;
      const input = inputsByLink.get(link);
      if (!input || next.get(link) !== "COMPARE") continue;
      if (!eligibleForBuyReady(input)) continue;
      next.set(link, "BUY READY");
      buyReady += 1;
      compare -= 1;
    }
  }

  for (const [link, index] of rankedLinks.map((l, i) => [l, i] as const)) {
    const input = inputsByLink.get(link);
    if (!input) continue;
    const current = next.get(link) ?? "COMPARE";
    if (tierRank(current) >= tierRank("STRONG BUY")) continue;

    if (eligibleForStrongBuy(input) && countTier(next, "STRONG BUY") < maxStrongBuy) {
      if (tierRank(current) < tierRank("STRONG BUY")) {
        next.set(link, "STRONG BUY");
      }
    } else if (eligibleForBuyReady(input) && current === "COMPARE" && buyReady < Math.ceil(traySize * TARGET.buyReadyMaxPct)) {
      next.set(link, "BUY READY");
      buyReady += 1;
    }
  }

  for (const [link, index] of rankedLinks.map((l, i) => [l, i] as const)) {
    const input = inputsByLink.get(link);
    if (!input) continue;
    if (countTier(next, "BEST DEAL") >= maxBestDeal) break;
    if (eligibleForBestDeal(input, index, traySize)) {
      next.set(link, "BEST DEAL");
    }
  }

  let strongBuy = countTier(next, "STRONG BUY");
  if (strongBuy > maxStrongBuy) {
    for (const link of [...rankedLinks].reverse()) {
      if (strongBuy <= maxStrongBuy) break;
      if (next.get(link) === "STRONG BUY") {
        next.set(link, "BUY READY");
        strongBuy -= 1;
      }
    }
  }

  let bestDeal = countTier(next, "BEST DEAL");
  if (bestDeal > maxBestDeal) {
    for (const link of [...rankedLinks].reverse()) {
      if (bestDeal <= maxBestDeal) break;
      if (next.get(link) === "BEST DEAL") {
        next.set(link, "STRONG BUY");
        bestDeal -= 1;
      }
    }
  }

  const minBuySignals = Math.max(1, Math.floor(traySize * 0.15));
  let buySignals =
    countTier(next, "BUY READY") + countTier(next, "STRONG BUY") + countTier(next, "BEST DEAL");

  if (buySignals < minBuySignals) {
    const candidates = rankedLinks
      .map((link) => ({ link, input: inputsByLink.get(link), tier: next.get(link) }))
      .filter((row) => row.input && row.tier === "COMPARE")
      .sort((a, b) => (b.input?.trueValueScore ?? 0) - (a.input?.trueValueScore ?? 0));

    for (const row of candidates) {
      if (buySignals >= minBuySignals) break;
      if (!row.input) continue;
      if (row.input.trueValueScore >= 52 && row.input.merchantReliabilityScore >= 60) {
        next.set(row.link, "BUY READY");
        buySignals += 1;
      }
    }
  }

  return next;
}

export function buySignalDistributionSummary(
  tierByLink: Map<string, CommerceDecisionTier>
): BuySignalDistribution {
  const dist = { wait: 0, compare: 0, buyReady: 0, strongBuy: 0, bestDeal: 0 };
  for (const tier of tierByLink.values()) {
    if (tier === "WAIT") dist.wait += 1;
    else if (tier === "COMPARE") dist.compare += 1;
    else if (tier === "BUY READY") dist.buyReady += 1;
    else if (tier === "STRONG BUY") dist.strongBuy += 1;
    else if (tier === "BEST DEAL") dist.bestDeal += 1;
  }
  return dist;
}

export function distributionWithinTargets(dist: BuySignalDistribution, traySize: number): boolean {
  if (traySize === 0) return true;
  const comparePct = dist.compare / traySize;
  const buyPct = dist.buyReady / traySize;
  return comparePct >= TARGET.compareMinPct * 0.85 && buyPct >= TARGET.buyReadyMinPct * 0.5;
}
