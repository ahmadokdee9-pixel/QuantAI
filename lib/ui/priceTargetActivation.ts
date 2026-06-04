/**
 * Phase 18.0 — Price Target Intelligence Activation Layer.
 * Extends buy/wait timing with target price and savings estimates (presentation only).
 */

import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { QuantProduct } from "@/lib/shoppingScore";

export type PriceTargetContributions = {
  recentTrendContribution: number;
  merchantCompetitionContribution: number;
  discountTruthContribution: number;
};

export type ActivatedPriceTarget = {
  targetBuyPrice: number;
  targetBuyPriceLabel: string;
  potentialSavings: number;
  potentialSavingsLabel: string;
  opportunityScore: number;
  reason: string;
  explanation: string;
  cardLine: string;
  chipLabel: string;
  historicalLow: number | null;
  historicalAverage: number | null;
  distanceFromLowPct: number | null;
  distanceFromAveragePct: number | null;
  contributions: PriceTargetContributions;
};

export type PriceTargetInput = {
  product: QuantProduct;
  list: QuantProduct[];
  discountTruth: ActivatedDiscountTruth;
  buyWait: ActivatedBuyWait;
  commerceCoverage?: ActivatedCommerceCoverage | null;
  currencySym?: string;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function formatPrice(price: number, sym = "€"): string {
  if (!Number.isFinite(price) || price <= 0) return "—";
  return `${sym}${Math.round(price)}`;
}

function discountTruthContribution(discountTruth: ActivatedDiscountTruth): number {
  const base = Math.max(0, Math.min(1, discountTruth.confidence / 100));
  if (discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine") {
    return Math.max(0.45, Math.min(1, base + 0.12));
  }
  if (discountTruth.verdict === "Uncertain") return base * 0.55;
  return Math.max(0.1, base * 0.35);
}

function recentTrendContribution(product: QuantProduct): number {
  if (product.priceTrend === "down") return 0.72;
  if (product.priceTrend === "up") return 0.18;
  return 0.45;
}

function resolveTargetBuyPrice(args: {
  currentPrice: number;
  historicalLow: number | null;
  historicalAverage: number | null;
  commerceLowest: number | null;
  contributions: PriceTargetContributions;
}): number {
  const { currentPrice, historicalLow, historicalAverage, commerceLowest, contributions } = args;
  const floor =
    commerceLowest != null && commerceLowest > 0
      ? Math.min(
          historicalLow != null && historicalLow > 0 ? historicalLow : commerceLowest,
          commerceLowest
        )
      : historicalLow;
  if (!floor || floor <= 0 || currentPrice <= 0) return currentPrice;
  if (currentPrice <= floor * 1.03) return Math.round(floor);

  const slack = currentPrice - floor;
  const pull = Math.min(
    0.88,
    contributions.merchantCompetitionContribution * 0.42 +
      contributions.recentTrendContribution * 0.28 +
      contributions.discountTruthContribution * 0.22
  );
  let target = Math.round(floor + slack * (1 - pull));
  if (historicalAverage != null && historicalAverage > 0 && target > historicalAverage) {
    target = Math.round(historicalAverage);
  }
  return Math.max(Math.round(floor), Math.min(currentPrice, target));
}

function resolveOpportunityScore(args: {
  distanceFromLowPct: number | null;
  distanceFromAveragePct: number | null;
  potentialSavings: number;
  currentPrice: number;
  contributions: PriceTargetContributions;
  buyWait: ActivatedBuyWait;
}): number {
  let score = 0;
  if (args.distanceFromLowPct != null) {
    score += Math.min(38, Math.max(0, args.distanceFromLowPct) * 2.1);
  }
  if (args.distanceFromAveragePct != null && args.distanceFromAveragePct > 0) {
    score += Math.min(18, args.distanceFromAveragePct * 0.9);
  }
  score += args.contributions.merchantCompetitionContribution * 24;
  score += args.contributions.recentTrendContribution * 16;
  score += args.contributions.discountTruthContribution * 12;
  if (args.potentialSavings > 0 && args.currentPrice > 0) {
    score += Math.min(16, (args.potentialSavings / args.currentPrice) * 100);
  }
  if (args.buyWait.verdict === "WAIT") score += 8;
  if (args.buyWait.verdict === "BUY NOW") score = Math.max(0, score - 12);
  if (args.distanceFromLowPct != null && args.distanceFromLowPct <= 3) {
    score = Math.max(0, score - 28);
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

function resolvePriceTargetReason(args: {
  distanceFromLowPct: number | null;
  potentialSavings: number;
  potentialSavingsLabel: string;
  merchantCompetitionContribution: number;
  currencySym: string;
}): string {
  const parts: string[] = [];
  if (args.distanceFromLowPct != null && args.distanceFromLowPct <= 3) {
    parts.push("Current price already near historical floor.");
  } else if (args.distanceFromLowPct != null && args.distanceFromLowPct > 0) {
    parts.push(`Current price remains ${args.distanceFromLowPct}% above historical low.`);
  }
  if (args.potentialSavings >= 5) {
    parts.push(`Potential savings estimated at ${args.potentialSavingsLabel}.`);
  }
  if (args.merchantCompetitionContribution >= 0.55) {
    parts.push("Competition suggests additional downside pressure.");
  }
  if (!parts.length) {
    parts.push("Target price aligns with current market signals.");
  }
  return clipLine(parts[0] ?? "Target price aligns with current market signals.");
}

/** Activate price target intelligence for one listing (existing signals only). */
export function activatePriceTarget(input: PriceTargetInput): ActivatedPriceTarget {
  const { product, discountTruth, buyWait, commerceCoverage, currencySym = "€" } = input;
  const currentPrice = product.price > 0 ? product.price : 0;
  const historicalLow =
    discountTruth.metrics.lowestObservedPrice ??
    (commerceCoverage?.lowestPrice != null && commerceCoverage.lowestPrice > 0
      ? commerceCoverage.lowestPrice
      : null);
  const historicalAverage =
    discountTruth.metrics.averageHistoricalPrice ??
    discountTruth.metrics.historicalPriceBaseline ??
    null;
  const distanceFromLowPct =
    historicalLow != null && historicalLow > 0 && currentPrice > 0
      ? Math.round(((currentPrice - historicalLow) / historicalLow) * 100)
      : null;
  const distanceFromAveragePct =
    historicalAverage != null && historicalAverage > 0 && currentPrice > 0
      ? Math.round(((currentPrice - historicalAverage) / historicalAverage) * 100)
      : null;

  const contributions: PriceTargetContributions = {
    recentTrendContribution: Math.round(recentTrendContribution(product) * 100) / 100,
    merchantCompetitionContribution: buyWait.metrics.merchantCompetitionIntensity,
    discountTruthContribution: Math.round(discountTruthContribution(discountTruth) * 100) / 100,
  };

  const targetBuyPrice = resolveTargetBuyPrice({
    currentPrice,
    historicalLow,
    historicalAverage,
    commerceLowest: commerceCoverage?.lowestPrice ?? null,
    contributions,
  });
  const potentialSavings = Math.max(0, Math.round(currentPrice - targetBuyPrice));
  const potentialSavingsLabel = formatPrice(potentialSavings, currencySym);
  const targetBuyPriceLabel = formatPrice(targetBuyPrice, currencySym);
  const opportunityScore = resolveOpportunityScore({
    distanceFromLowPct,
    distanceFromAveragePct,
    potentialSavings,
    currentPrice,
    contributions,
    buyWait,
  });
  const reason = resolvePriceTargetReason({
    distanceFromLowPct,
    potentialSavings,
    potentialSavingsLabel,
    merchantCompetitionContribution: contributions.merchantCompetitionContribution,
    currencySym,
  });
  const explanation = reason;
  const cardLine = clipLine(
    potentialSavings >= 5
      ? `Target ${targetBuyPriceLabel} · save ${potentialSavingsLabel} · ${opportunityScore}% opportunity`
      : `${reason} · ${opportunityScore}% opportunity`
  );
  const chipLabel = clipLine(`Target ${targetBuyPriceLabel} · ${opportunityScore}%`, 42);

  return {
    targetBuyPrice,
    targetBuyPriceLabel,
    potentialSavings,
    potentialSavingsLabel,
    opportunityScore,
    reason,
    explanation,
    cardLine,
    chipLabel,
    historicalLow,
    historicalAverage,
    distanceFromLowPct,
    distanceFromAveragePct,
    contributions,
  };
}

export function mergePriceTargetSummary(
  summaryLines: string[],
  priceTarget: ActivatedPriceTarget | null,
  max = 2
): string[] {
  if (!priceTarget?.explanation) return summaryLines.slice(0, max);
  const line = clipLine(priceTarget.explanation, 96);
  const merged = summaryLines.filter((item) => item !== line);
  if (merged.length < max) {
    merged.push(line);
    return merged.slice(0, max);
  }
  merged[max - 1] = line;
  return merged.slice(0, max);
}

export function mergePriceTargetExpandedLines(
  existingLines: string[],
  priceTarget: ActivatedPriceTarget | null,
  max = 3
): string[] {
  if (!priceTarget) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  const candidates = [
    priceTarget.cardLine,
    priceTarget.reason,
    priceTarget.potentialSavings >= 5
      ? `Potential savings estimated at ${priceTarget.potentialSavingsLabel}.`
      : "",
    priceTarget.contributions.merchantCompetitionContribution >= 0.55
      ? "Competition suggests additional downside pressure."
      : "",
    ...existingLines,
  ];
  for (const value of candidates) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}
