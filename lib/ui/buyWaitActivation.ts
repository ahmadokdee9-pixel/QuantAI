/**
 * Phase 17.0 — Buy Now vs Wait Activation Layer.
 * Surfaces existing pricing, discount truth, and merchant signals into presentation slots only.
 */

import { extractProductIdentity } from "@/lib/deals/productIdentity";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { QuantProduct } from "@/lib/shoppingScore";

export type BuyTimingVerdict = "BUY NOW" | "WAIT" | "COMPARE";

export type BuyTimingMetrics = {
  historicalLowDistance: number;
  historicalAverageDistance: number;
  recentPriceDirection: "down" | "up" | "stable";
  discountTruthConfidence: number;
  merchantCompetitionIntensity: number;
  availabilityPressure: number;
  priceStability: number;
};

export type ActivatedBuyWait = {
  verdict: BuyTimingVerdict;
  confidence: number;
  reason: string;
  label: string;
  explanation: string;
  cardLine: string;
  chipLabel: string;
  metrics: BuyTimingMetrics;
};

export type BuyWaitInput = {
  product: QuantProduct;
  list: QuantProduct[];
  discountTruth: ActivatedDiscountTruth;
  commerceCoverage?: ActivatedCommerceCoverage | null;
  institutionalVerdict?: PrimaryVerdict | null;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function listingSafe(product: QuantProduct): QuantProduct {
  return product.extensions ? product : { ...product, extensions: [] };
}

function normalizedTitle(product: QuantProduct): string {
  const safe = listingSafe(product);
  return extractProductIdentity(safe).normalizedTitle?.trim().toLowerCase() || safe.title.trim().toLowerCase();
}

function trayCompetitionIntensity(product: QuantProduct, list: QuantProduct[]): number {
  const title = normalizedTitle(product);
  const safeList = list.map(listingSafe);
  const peers = safeList.filter(
    (item) => item.link !== product.link && normalizedTitle(item) === title && item.price > 0
  );
  const stores = new Set(safeList.map((item) => item.store.trim().toLowerCase()).filter(Boolean));
  const storeFactor = Math.min(1, stores.size / 4);
  if (!peers.length) return storeFactor * 0.35;
  const prices = peers.map((item) => item.price).concat(product.price).filter((price) => price > 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = min > 0 ? (max - min) / min : 0;
  return Math.max(0, Math.min(1, storeFactor * 0.45 + Math.min(1, spread) * 0.55 + peers.length * 0.08));
}

function merchantCompetitionIntensity(
  product: QuantProduct,
  list: QuantProduct[],
  commerceCoverage: ActivatedCommerceCoverage | null | undefined
): number {
  if (commerceCoverage && commerceCoverage.merchantCount > 1) {
    const merchantFactor = Math.min(1, commerceCoverage.merchantCount / 4);
    const listingFactor = Math.min(0.25, commerceCoverage.listingCount * 0.05);
    const spreadFactor =
      commerceCoverage.lowestPrice > 0 && product.price > commerceCoverage.lowestPrice
        ? Math.min(0.35, (product.price - commerceCoverage.lowestPrice) / commerceCoverage.lowestPrice)
        : 0;
    return Math.max(0, Math.min(1, merchantFactor * 0.55 + listingFactor + spreadFactor));
  }
  return trayCompetitionIntensity(product, list);
}

function availabilityPressure(product: QuantProduct): number {
  const raw = (product.availability ?? "").toLowerCase();
  if (/out\s*of\s*stock|unavailable|sold\s*out/.test(raw)) return 0.12;
  if (/only\s*\d+\s*left|limited\s*stock|low\s*stock|few\s*left|almost\s*gone/.test(raw)) return 0.88;
  if (/in\s*stock|available|ready to ship/.test(raw)) return 0.42;
  return 0.3;
}

function computeMetrics(input: BuyWaitInput): BuyTimingMetrics {
  const { product, list, discountTruth, commerceCoverage } = input;
  const currentPrice = product.price > 0 ? product.price : 0;
  const low = discountTruth.metrics.lowestObservedPrice;
  const average =
    discountTruth.metrics.averageHistoricalPrice ?? discountTruth.metrics.historicalPriceBaseline;
  const historicalLowDistance =
    low != null && low > 0 && currentPrice > 0
      ? Math.max(0, Math.min(1, (currentPrice - low) / low))
      : 1;
  const historicalAverageDistance =
    average != null && average > 0 && currentPrice > 0
      ? Math.max(0, Math.min(1, (currentPrice - average) / average))
      : 1;

  return {
    historicalLowDistance: Math.round(historicalLowDistance * 100) / 100,
    historicalAverageDistance: Math.round(historicalAverageDistance * 100) / 100,
    recentPriceDirection: product.priceTrend ?? "stable",
    discountTruthConfidence: discountTruth.confidence,
    merchantCompetitionIntensity: Math.round(
      merchantCompetitionIntensity(product, list, commerceCoverage) * 100
    ) / 100,
    availabilityPressure: Math.round(availabilityPressure(product) * 100) / 100,
    priceStability: Math.round(discountTruth.metrics.discountConsistency * 100) / 100,
  };
}

function resolveBuyTimingVerdict(
  metrics: BuyTimingMetrics,
  discountTruth: ActivatedDiscountTruth,
  institutionalVerdict: PrimaryVerdict | null | undefined
): { verdict: BuyTimingVerdict; reason: string; confidence: number } {
  const inflated =
    discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";

  if (institutionalVerdict === "AVOID" || institutionalVerdict === "WAIT" || inflated) {
    const reason =
      inflated && metrics.recentPriceDirection === "up"
        ? "Price increased shortly before discount."
        : inflated
          ? "Verify pricing before acting on this discount."
          : "Waiting is recommended until market conditions improve.";
    return {
      verdict: "WAIT",
      reason,
      confidence: Math.max(45, Math.min(92, 100 - metrics.discountTruthConfidence / 3)),
    };
  }

  if (
    metrics.historicalLowDistance <= 0.05 &&
    metrics.recentPriceDirection === "down" &&
    metrics.discountTruthConfidence >= 55
  ) {
    return {
      verdict: "BUY NOW",
      reason: "Recent downward trend detected.",
      confidence: Math.max(62, Math.min(94, metrics.discountTruthConfidence + 8)),
    };
  }

  if (metrics.historicalLowDistance <= 0.05 && metrics.discountTruthConfidence >= 60) {
    return {
      verdict: "BUY NOW",
      reason: "Current price near historical low.",
      confidence: Math.max(60, Math.min(92, metrics.discountTruthConfidence + 6)),
    };
  }

  if (
    metrics.merchantCompetitionIntensity >= 0.55 &&
    metrics.historicalLowDistance > 0.06 &&
    metrics.recentPriceDirection !== "down"
  ) {
    return {
      verdict: "WAIT",
      reason: "Merchant competition may reduce price further.",
      confidence: Math.max(
        52,
        Math.min(88, Math.round(metrics.merchantCompetitionIntensity * 100 - metrics.discountTruthConfidence / 4))
      ),
    };
  }

  if (
    metrics.recentPriceDirection === "stable" &&
    metrics.priceStability >= 0.5 &&
    metrics.merchantCompetitionIntensity >= 0.35
  ) {
    return {
      verdict: "COMPARE",
      reason: "Price appears stable.",
      confidence: Math.max(48, Math.min(82, 58 + metrics.merchantCompetitionIntensity * 20)),
    };
  }

  if (metrics.merchantCompetitionIntensity >= 0.4 || institutionalVerdict === "COMPARE") {
    return {
      verdict: "COMPARE",
      reason: "Compare merchant offers before deciding.",
      confidence: Math.max(50, Math.min(80, 55 + metrics.merchantCompetitionIntensity * 15)),
    };
  }

  if (metrics.recentPriceDirection === "stable") {
    return {
      verdict: "COMPARE",
      reason: "Price appears stable.",
      confidence: Math.max(45, Math.min(78, 50 + metrics.priceStability * 20)),
    };
  }

  return {
    verdict: "COMPARE",
    reason: "Compare options before committing.",
    confidence: 52,
  };
}

/** Activate buy-now vs wait timing for one listing (existing signals only). */
export function activateBuyWait(input: BuyWaitInput): ActivatedBuyWait {
  const metrics = computeMetrics(input);
  const { verdict, reason, confidence } = resolveBuyTimingVerdict(
    metrics,
    input.discountTruth,
    input.institutionalVerdict
  );
  const explanation = clipLine(reason);
  const chipLabel = clipLine(`${verdict} · ${confidence}%`, 42);

  return {
    verdict,
    confidence,
    reason,
    label: verdict,
    explanation,
    cardLine: clipLine(`${verdict} — ${explanation}`),
    chipLabel,
    metrics,
  };
}

export function mergeBuyWaitChip(
  chips: Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }>,
  buyWait: ActivatedBuyWait | null,
  max = 2
): Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }> {
  if (!buyWait) return chips.slice(0, max);
  const tone: "emerald" | "blue" | "violet" | "amber" | "slate" =
    buyWait.verdict === "BUY NOW" ? "emerald" : buyWait.verdict === "WAIT" ? "amber" : "blue";
  const chip = { label: buyWait.chipLabel, tone };
  const merged = [chip, ...chips.filter((item) => item.label !== chip.label)];
  return merged.slice(0, max);
}

export function mergeBuyWaitExpandedLines(
  existingLines: string[],
  buyWait: ActivatedBuyWait | null,
  max = 3
): string[] {
  if (!buyWait?.explanation) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [buyWait.cardLine, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}
