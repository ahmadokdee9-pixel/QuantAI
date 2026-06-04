/**
 * Phase 16.0 — Discount Truth Activation Layer.
 * Surfaces existing pricing and merchant discount signals into presentation slots only.
 */

import { peerPriceMedianExcluding } from "@/lib/deals/dealAnalysis";
import { detectFakeDiscountSignals } from "@/lib/intelligence/fakeDiscountDetector";
import {
  assessFakeDiscountHardened,
  type Phase93TrustDiscountMeta,
  type ProductTrustDiscountAssessment,
} from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DiscountTruthVerdict =
  | "Genuine"
  | "Likely Genuine"
  | "Uncertain"
  | "Likely Inflated"
  | "Inflated";

export type DiscountTruthMetrics = {
  currentPrice: number;
  historicalPriceBaseline: number | null;
  lowestObservedPrice: number | null;
  averageHistoricalPrice: number | null;
  discountConsistency: number;
  priceIncreaseBeforePromotion: boolean;
  discountConfidence: number;
};

export type ActivatedDiscountTruth = {
  verdict: DiscountTruthVerdict;
  reason: string;
  label: string;
  confidence: number;
  explanation: string;
  cardLine: string;
  chipLabel: string;
  metrics: DiscountTruthMetrics;
};

export type DiscountTruthInput = {
  product: QuantProduct;
  list: QuantProduct[];
  phase93Assessment?: ProductTrustDiscountAssessment | null;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function discountPct(product: QuantProduct): number | null {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return null;
  return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
}

function listingSafe(product: QuantProduct): QuantProduct {
  return product.extensions ? product : { ...product, extensions: [] };
}

function resolveAssessment(
  product: QuantProduct,
  list: QuantProduct[],
  phase93Assessment?: ProductTrustDiscountAssessment | null
): ProductTrustDiscountAssessment {
  const safeProduct = listingSafe(product);
  const safeList = list.map(listingSafe);
  if (phase93Assessment) return phase93Assessment;
  const fake = assessFakeDiscountHardened(safeProduct, safeList);
  return {
    link: product.link,
    store: product.store,
    trustScore: 0,
    retailerConfidence: 0,
    fakeDiscountRisk: fake.risk,
    fakeDiscountProbability: fake.probability,
    discountAuthenticity: fake.authenticity,
    suspiciousSeller: false,
    suspiciousSellerReasons: [],
    priceAnomaly: "none",
    priceAnomalyFlags: [],
  };
}

function computeMetrics(
  product: QuantProduct,
  list: QuantProduct[],
  assessment: ProductTrustDiscountAssessment
): DiscountTruthMetrics {
  const peerMed = peerPriceMedianExcluding(list, product.link);
  const trayPrices = list.map((item) => item.price).filter((price) => price > 0);
  const currentPrice = product.price > 0 ? product.price : 0;
  const historicalPriceBaseline =
    product.oldPrice != null && product.oldPrice > 0
      ? product.oldPrice
      : peerMed > 0
        ? peerMed
        : null;
  const lowestObservedPrice =
    trayPrices.length > 0 ? Math.min(currentPrice || Infinity, ...trayPrices) : currentPrice || null;
  const averageHistoricalPrice =
    historicalPriceBaseline != null && peerMed > 0
      ? Math.round((historicalPriceBaseline + peerMed) / 2)
      : historicalPriceBaseline;
  const hasDiscount = discountPct(product) != null;
  const priceIncreaseBeforePromotion = product.priceTrend === "up" && hasDiscount;
  const signals = detectFakeDiscountSignals(listingSafe(product), list.map(listingSafe));
  const stableBeforePromotion =
    product.priceTrend === "stable" || (!priceIncreaseBeforePromotion && product.priceTrend === "down");
  let discountConsistency = assessment.discountAuthenticity / 100;
  if (stableBeforePromotion) discountConsistency += 0.12;
  if (priceIncreaseBeforePromotion) discountConsistency -= 0.22;
  if (signals.discountManipulationRisk >= 0.55) discountConsistency -= 0.18;
  discountConsistency = Math.max(0, Math.min(1, discountConsistency));

  return {
    currentPrice,
    historicalPriceBaseline,
    lowestObservedPrice: Number.isFinite(lowestObservedPrice ?? NaN) ? lowestObservedPrice : null,
    averageHistoricalPrice,
    discountConsistency: Math.round(discountConsistency * 100) / 100,
    priceIncreaseBeforePromotion,
    discountConfidence: Math.max(0, Math.min(100, assessment.discountAuthenticity)),
  };
}

function nearHistoricalLow(metrics: DiscountTruthMetrics): boolean {
  if (!metrics.lowestObservedPrice || metrics.currentPrice <= 0) return false;
  return metrics.currentPrice <= metrics.lowestObservedPrice * 1.03;
}

function resolveVerdict(
  metrics: DiscountTruthMetrics,
  assessment: ProductTrustDiscountAssessment,
  hasDiscount: boolean
): { verdict: DiscountTruthVerdict; reason: string } {
  if (!hasDiscount && metrics.historicalPriceBaseline == null) {
    return { verdict: "Uncertain", reason: "Insufficient history." };
  }

  if (assessment.fakeDiscountRisk === "high" || metrics.priceIncreaseBeforePromotion) {
    if (metrics.priceIncreaseBeforePromotion) {
      return { verdict: "Inflated", reason: "Price increased shortly before discount." };
    }
    return { verdict: "Inflated", reason: "Discount may be inflated — check the original price." };
  }

  if (assessment.fakeDiscountRisk === "medium" || metrics.discountConsistency < 0.45) {
    return { verdict: "Likely Inflated", reason: "Savings look modest or need verification." };
  }

  if (!hasDiscount) {
    return { verdict: "Uncertain", reason: "Insufficient history." };
  }

  if (nearHistoricalLow(metrics) && metrics.discountConfidence >= 72) {
    return { verdict: "Genuine", reason: "Current price near historical low." };
  }

  if (metrics.priceIncreaseBeforePromotion === false && productStableReason(metrics)) {
    return { verdict: "Likely Genuine", reason: "Price remained stable before promotion." };
  }

  if (metrics.discountConfidence >= 60) {
    return { verdict: "Likely Genuine", reason: "Discount appears reasonable." };
  }

  return { verdict: "Uncertain", reason: "Insufficient history." };
}

function productStableReason(metrics: DiscountTruthMetrics): boolean {
  return metrics.discountConsistency >= 0.55 && !metrics.priceIncreaseBeforePromotion;
}

/** Activate discount truth for one merchant listing (existing signals only). */
export function activateDiscountTruth(input: DiscountTruthInput): ActivatedDiscountTruth {
  const { product, list } = input;
  const assessment = resolveAssessment(product, list, input.phase93Assessment);
  const metrics = computeMetrics(product, list, assessment);
  const hasDiscount = discountPct(product) != null;
  const { verdict, reason } = resolveVerdict(metrics, assessment, hasDiscount);
  const confidence = metrics.discountConfidence;
  const explanation = clipLine(reason);
  const chipLabel = clipLine(`${verdict} · ${confidence}%`, 42);

  return {
    verdict,
    reason,
    label: verdict,
    confidence,
    explanation,
    cardLine: clipLine(`${verdict} — ${explanation}`),
    chipLabel,
    metrics,
  };
}

export function findPhase93AssessmentForProduct(
  phase93: Phase93TrustDiscountMeta | null | undefined,
  product: QuantProduct
): ProductTrustDiscountAssessment | null {
  if (!phase93?.trayAssessments?.length) return null;
  return phase93.trayAssessments.find((item) => item.link === product.link) ?? null;
}

/** Build per-link discount truth for the current tray. */
export function buildDiscountTruthTray(
  products: QuantProduct[],
  phase93: Phase93TrustDiscountMeta | null = null
): Map<string, ActivatedDiscountTruth> {
  const map = new Map<string, ActivatedDiscountTruth>();
  for (const product of products) {
    map.set(
      product.link,
      activateDiscountTruth({
        product,
        list: products,
        phase93Assessment: findPhase93AssessmentForProduct(phase93, product),
      })
    );
  }
  return map;
}

export function mergeDiscountTruthChip(
  chips: Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }>,
  truth: ActivatedDiscountTruth | null,
  max = 2
): Array<{ label: string; tone: "emerald" | "blue" | "violet" | "amber" | "slate" }> {
  if (!truth) return chips.slice(0, max);
  const tone: "emerald" | "blue" | "violet" | "amber" | "slate" =
    truth.verdict === "Genuine" || truth.verdict === "Likely Genuine"
      ? "emerald"
      : truth.verdict === "Uncertain"
        ? "slate"
        : "amber";
  const chip = { label: truth.chipLabel, tone };
  const merged = [chip, ...chips.filter((item) => item.label !== chip.label)];
  return merged.slice(0, max);
}

export function mergeDiscountTruthExpandedLines(
  existingLines: string[],
  truth: ActivatedDiscountTruth | null,
  max = 3
): string[] {
  if (!truth?.explanation) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [truth.cardLine, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}
