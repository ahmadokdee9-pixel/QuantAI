/**
 * P6.5 — Aggregate market reality detection (deterministic tray telemetry; no user memory).
 */

import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketRealityDetection = {
  fakeDiscountDetected: boolean;
  retailerInstabilityDetected: boolean;
  priceVolatilityDetected: boolean;
  listingQualityDegradationDetected: boolean;
  marketplaceInconsistencyDetected: boolean;
  trustDecayDetected: boolean;
  inventoryInstabilityDetected: boolean;
  unreliableOfferDetected: boolean;
  lowSignalMarketplaceDetected: boolean;
  fakeDiscountScore: number;
  retailerInstabilityScore: number;
  priceVolatilityScore: number;
  listingQualityDegradationScore: number;
  marketplaceInconsistencyScore: number;
  trustDecayScore: number;
  inventoryInstabilityScore: number;
  unreliableOfferScore: number;
  lowSignalMarketplaceScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function variance(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const mean = avg(nums);
  return nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
}

export function detectMarketRealitySignals(args: {
  products: QuantProduct[];
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
}): MarketRealityDetection {
  const { products, intent, multiObjective, strategic, memoryless } = args;
  const tray = products.slice(0, 12);

  const fakeDiscountSignals = tray.map((p) => {
    const rt = p.qiRealityTrust;
    if (!rt) return p.oldPrice && p.price && p.oldPrice > p.price * 1.25 ? 0.45 : 0.08;
    return clamp((rt.fakeDiscountProbability ?? 0) * 0.55 + (rt.discountManipulationRisk ?? 0) * 0.45, 0, 1);
  });
  const fakeDiscountScore = round3(clamp(avg(fakeDiscountSignals), 0, 1));
  const fakeDiscountDetected = fakeDiscountScore >= 0.35 || fakeDiscountSignals.filter((s) => s >= 0.5).length >= 2;

  const retailerSignals = tray.map((p) => {
    const rt = p.qiRealityTrust;
    const storeTrust = getStoreTrustScore(p.store) / 100;
    const weak = rt?.weakRetailer ? 0.35 : 0;
    const reliability = rt ? 1 - (rt.retailerReliability01 ?? storeTrust) : 1 - storeTrust;
    return clamp(reliability * 0.6 + weak + (rt?.marketplaceRisk01 ?? 0) * 0.25, 0, 1);
  });
  const retailerInstabilityScore = round3(clamp(avg(retailerSignals), 0, 1));
  const retailerInstabilityDetected = retailerInstabilityScore >= 0.4 || retailerSignals.filter((s) => s >= 0.55).length >= 2;

  const volatilitySignals = tray.map((p) => {
    let score = p.priceTrend === "up" ? 0.35 : p.priceTrend === "down" ? 0.2 : 0.05;
    if (p.oldPrice && p.price && p.oldPrice > 0) {
      const gap = Math.abs(p.oldPrice - p.price) / Math.max(p.price, 1);
      score += clamp(gap * 0.35, 0, 0.45);
    }
    score += (p.qiRealityTrust?.stockVolatility01 ?? 0) * 0.25;
    return clamp(score, 0, 1);
  });
  const priceVolatilityScore = round3(clamp(avg(volatilitySignals) + Math.sqrt(variance(volatilitySignals)) * 0.15, 0, 1));
  const priceVolatilityDetected = priceVolatilityScore >= 0.38 || volatilitySignals.filter((s) => s >= 0.5).length >= 2;

  const listingSignals = tray.map((p) => {
    const rt = p.qiRealityTrust;
    if (!rt) return p.rating === 0 || p.reviewsCount === 0 ? 0.25 : 0.12;
    return clamp((rt.listingSpecGap01 ?? 0) * 0.45 + (rt.imageTitleMismatchRisk ?? 0) * 0.35 + (rt.tooGoodToBeTrue01 ?? 0) * 0.2, 0, 1);
  });
  const listingQualityDegradationScore = round3(clamp(avg(listingSignals), 0, 1));
  const listingQualityDegradationDetected = listingQualityDegradationScore >= 0.35 || listingSignals.filter((s) => s >= 0.45).length >= 2;

  const marketplaceRisks = tray.map((p) => p.qiRealityTrust?.marketplaceRisk01 ?? (getStoreTrustScore(p.store) < 50 ? 0.35 : 0.1));
  const storeTrusts = tray.map((p) => getStoreTrustScore(p.store) / 100);
  const marketplaceInconsistencyScore = round3(
    clamp(Math.sqrt(variance(marketplaceRisks)) * 0.55 + Math.sqrt(variance(storeTrusts)) * 0.35 + (1 - avg(storeTrusts)) * 0.1, 0, 1)
  );
  const marketplaceInconsistencyDetected = marketplaceInconsistencyScore >= 0.32 || new Set(tray.map((p) => p.store.toLowerCase())).size >= 6;

  const trustDecayScore = round3(
    clamp(
      avg(tray.map((p) => 1 - (p.qiRealityTrust?.retailerReliability01 ?? getStoreTrustScore(p.store) / 100))) * 0.45 +
        (memoryless.trustDegradationDetected ? 0.2 : 0) +
        ((intent.trustIntent ?? 0) < 0.3 ? 0.15 : 0) +
        ((multiObjective.trustObjective ?? 0) < 0.25 ? 0.12 : 0),
      0,
      1
    )
  );
  const trustDecayDetected = trustDecayScore >= 0.35 || memoryless.trustDegradationDetected;

  const inventorySignals = tray.map((p) => {
    let score = p.qiRealityTrust?.stockVolatility01 ?? 0;
    const avail = (p.availability ?? "").toLowerCase();
    if (/limited|few left|low stock/.test(avail)) score += 0.25;
    if (/out of stock|unavailable/.test(avail)) score += 0.35;
    return clamp(score, 0, 1);
  });
  const inventoryInstabilityScore = round3(clamp(avg(inventorySignals), 0, 1));
  const inventoryInstabilityDetected = inventoryInstabilityScore >= 0.35 || inventorySignals.filter((s) => s >= 0.45).length >= 2;

  const offerSignals = tray.map((p) => {
    const rt = p.qiRealityTrust;
    let score = rt?.tooGoodToBeTrue01 ?? 0;
    if (p.outboundRouteKind === "google_fallback") score += 0.2;
    if ((p.qiMerchantConfidence01 ?? 1) < 0.35) score += 0.25;
    return clamp(score, 0, 1);
  });
  const unreliableOfferScore = round3(clamp(avg(offerSignals), 0, 1));
  const unreliableOfferDetected = unreliableOfferScore >= 0.35 || offerSignals.filter((s) => s >= 0.5).length >= 1;

  const lowSignalSignals = tray.map((p) => {
    let score = 0;
    if (!p.qiRealityTrust) score += 0.35;
    if ((p.qiComposite ?? 0) < 35) score += 0.2;
    if (!p.reviewsCount && !p.rating) score += 0.15;
    if (getStoreTrustScore(p.store) < 40) score += 0.15;
    return clamp(score, 0, 1);
  });
  const lowSignalMarketplaceScore = round3(clamp(avg(lowSignalSignals), 0, 1));
  const lowSignalMarketplaceDetected = lowSignalMarketplaceScore >= 0.4 || lowSignalSignals.filter((s) => s >= 0.45).length >= Math.ceil(tray.length / 3);

  return {
    fakeDiscountDetected,
    retailerInstabilityDetected,
    priceVolatilityDetected,
    listingQualityDegradationDetected,
    marketplaceInconsistencyDetected,
    trustDecayDetected,
    inventoryInstabilityDetected,
    unreliableOfferDetected,
    lowSignalMarketplaceDetected,
    fakeDiscountScore,
    retailerInstabilityScore,
    priceVolatilityScore,
    listingQualityDegradationScore,
    marketplaceInconsistencyScore,
    trustDecayScore,
    inventoryInstabilityScore,
    unreliableOfferScore,
    lowSignalMarketplaceScore,
  };
}
