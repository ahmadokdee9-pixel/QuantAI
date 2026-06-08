/**
 * Phase 28 — Universal Product Intelligence Engine.
 * Product understanding runs before pricing dominates verdict reasoning.
 * Same architecture for all categories; no category-specific verdict hardcoding.
 */

import { inferProductCategory } from "@/lib/intelligence/categoryContext";
import type { ProductUnderstanding } from "@/lib/intelligence/productUnderstanding";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ProductIntelligenceSegment = "phones" | "laptops" | "sofas" | "headphones" | "dynamic";

export type ProductDimensionScore = {
  key: string;
  label: string;
  score: number;
  signal: string;
};

export type UniversalProductIntelligenceScores = {
  productQualityScore: number;
  categoryFitScore: number;
  valueScore: number;
  trustScore: number;
  pricingScore: number;
  alternativePressure: number;
};

export type UniversalProductIntelligenceResult = UniversalProductIntelligenceScores & {
  segment: ProductIntelligenceSegment | null;
  segmentLabel: string;
  dimensions: ProductDimensionScore[];
  finalVerdict: PrimaryVerdict;
  primaryReason: string;
  secondaryReason: string;
  productUnderstandingLine: string;
};

export type UniversalProductIntelligenceInput = {
  product: QuantProduct;
  searchQuery: string;
  coherent: CoherentProductDecision;
  alternativePressure: number;
  trayMedianPrice?: number;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeScore(value: number | null | undefined, fallback = 50): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function clipLine(text: string, max = 112): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function listingBlob(product: QuantProduct, searchQuery = ""): string {
  const extensions = product.extensions ?? [];
  return `${searchQuery} ${product.title} ${extensions.join(" ")}`.toLowerCase();
}

function scoreFromSignals(base: number, strongHits: number, weakHits: number): number {
  return clampScore(base + strongHits * 12 - weakHits * 11);
}

function dimension(
  key: string,
  label: string,
  score: number,
  strong: boolean,
  weak: boolean,
  strongSignal: string,
  weakSignal: string
): ProductDimensionScore {
  const signal = strong ? strongSignal : weak ? weakSignal : `${label} profile is moderate for this listing.`;
  return { key, label, score, signal: clipLine(signal, 96) };
}

export function detectProductIntelligenceSegment(
  product: QuantProduct,
  searchQuery = ""
): ProductIntelligenceSegment | null {
  const blob = listingBlob(product, searchQuery);
  const slug = product.qiCategory ?? inferProductCategory(searchQuery, product.title);

  if (/(iphone|pixel|galaxy s|galaxy a|oneplus|smartphone|android phone|\bphone\b)/i.test(blob)) {
    return "phones";
  }
  if (/(macbook|laptop|chromebook|thinkpad|zenbook|notebook|ultrabook|surface laptop)/i.test(blob)) {
    return "laptops";
  }
  if (/(sofa|couch|sectional|corner sofa|modular sofa|loveseat)/i.test(blob) || slug === "home") {
    if (/(sofa|couch|sectional|corner|modular)/i.test(blob)) return "sofas";
  }
  if (/(headphone|earbud|airpods|headset|wh-1000|noise cancelling|anc\b)/i.test(blob)) {
    return "headphones";
  }
  return "dynamic";
}

function segmentLabel(segment: ProductIntelligenceSegment): string {
  if (segment === "phones") return "Phone";
  if (segment === "laptops") return "Laptop";
  if (segment === "sofas") return "Sofa";
  if (segment === "headphones") return "Headphones";
  return "Product";
}

function evaluatePhoneDimensions(blob: string): ProductDimensionScore[] {
  const perfStrong = /a17|a18|a16|snapdragon 8|gen 3|gen 2|tensor g|dimensity 9/i.test(blob);
  const perfWeak = /snapdragon 4|helio|entry[- ]level/i.test(blob);
  const cameraStrong = /(\d{2,3})\s*mp|pro camera|ultrawide|telephoto|48mp|50mp|108mp/i.test(blob);
  const cameraWeak = /single camera|2mp|basic camera/i.test(blob) && !cameraStrong;
  const batteryStrong = /5000\s*mah|6000\s*mah|all[- ]day|long battery/i.test(blob);
  const batteryWeak = /3000\s*mah|3200\s*mah/i.test(blob);
  const storageStrong = /512\s*gb|1\s*tb|256\s*gb/i.test(blob);
  const storageWeak = /64\s*gb|32\s*gb/i.test(blob) && !storageStrong;
  const ecosystemStrong = /iphone|pixel|galaxy s|ios|apple ecosystem|galaxy ecosystem/i.test(blob);
  const ecosystemWeak = /import|grey import|unlocked only/i.test(blob);
  const valueStrong = /128\s*gb|256\s*gb|512\s*gb/i.test(blob) && /pro max|pro\b|ultra/i.test(blob);
  const valueWeak = /64\s*gb|base model/i.test(blob);

  return [
    dimension(
      "performance",
      "Performance",
      scoreFromSignals(54, perfStrong ? 2 : 0, perfWeak ? 1 : 0),
      perfStrong,
      perfWeak,
      "Chipset tier supports strong day-to-day and gaming performance.",
      "Chipset generation looks entry-level for this price band."
    ),
    dimension(
      "camera",
      "Camera",
      scoreFromSignals(52, cameraStrong ? 2 : 0, cameraWeak ? 1 : 0),
      cameraStrong,
      cameraWeak,
      "Camera hardware suggests strong photo and video capability.",
      "Camera stack may be basic relative to premium phone expectations."
    ),
    dimension(
      "battery",
      "Battery",
      scoreFromSignals(50, batteryStrong ? 2 : 0, batteryWeak ? 1 : 0),
      batteryStrong,
      batteryWeak,
      "Battery capacity signals all-day endurance.",
      "Battery size may limit heavy-use endurance."
    ),
    dimension(
      "storage",
      "Storage",
      scoreFromSignals(48, storageStrong ? 2 : 0, storageWeak ? 1 : 0),
      storageStrong,
      storageWeak,
      "Storage tier fits modern app and media libraries.",
      "Storage may feel tight for photos, apps, and offline media."
    ),
    dimension(
      "ecosystem",
      "Ecosystem",
      scoreFromSignals(56, ecosystemStrong ? 2 : 0, ecosystemWeak ? 1 : 0),
      ecosystemStrong,
      ecosystemWeak,
      "Platform ecosystem supports updates, accessories, and resale.",
      "Ecosystem fit or update path needs verification before purchase."
    ),
    dimension(
      "value",
      "Value",
      scoreFromSignals(50, valueStrong ? 1 : 0, valueWeak ? 1 : 0),
      valueStrong,
      valueWeak,
      "Spec mix aligns well with the segment's value expectations.",
      "Spec-to-price balance may skew thin for this tier."
    ),
  ];
}

function evaluateLaptopDimensions(blob: string): ProductDimensionScore[] {
  const cpuStrong = /m3|m2|m1|ultra 7|ultra 9|ryzen 7|ryzen 9|i7|i9|core ultra|snapdragon x/i.test(blob);
  const cpuWeak = /celeron|pentium|n4020|i3\b|ryzen 3/i.test(blob);
  const ramStrong = /32\s*gb|64\s*gb|32gb ram|64gb ram/i.test(blob);
  const ramWeak = /8\s*gb ram|8gb ram|4\s*gb/i.test(blob) && !ramStrong;
  const storageStrong = /1\s*tb|2\s*tb|512\s*gb ssd|1tb ssd/i.test(blob);
  const storageWeak = /256\s*gb|128\s*gb/i.test(blob) && !storageStrong;
  const displayStrong = /retina|oled|4k|120\s*hz|qhd|mini[- ]led/i.test(blob);
  const displayWeak = /hd\b|1366|720p/i.test(blob);
  const portabilityStrong = /air\b|13\.3|13\.6|14 inch|1\.2\s*kg|lightweight|ultrabook/i.test(blob);
  const portabilityWeak = /17 inch|gaming laptop|heavy/i.test(blob);
  const longevityStrong = /m3|m2|32\s*gb|upgradeable|7 years|5 years update/i.test(blob);
  const longevityWeak = /soldered|non[- ]upgradeable|older gen/i.test(blob);

  return [
    dimension(
      "cpu",
      "CPU",
      scoreFromSignals(54, cpuStrong ? 2 : 0, cpuWeak ? 1 : 0),
      cpuStrong,
      cpuWeak,
      "CPU tier supports professional workloads and multitasking.",
      "CPU class may bottleneck creative or dev workloads."
    ),
    dimension(
      "ram",
      "RAM",
      scoreFromSignals(52, ramStrong ? 2 : 0, ramWeak ? 1 : 0),
      ramStrong,
      ramWeak,
      "Memory headroom supports heavy browser and creative tabs.",
      "RAM may limit professional multitasking headroom."
    ),
    dimension(
      "storage",
      "Storage",
      scoreFromSignals(50, storageStrong ? 2 : 0, storageWeak ? 1 : 0),
      storageStrong,
      storageWeak,
      "Storage capacity suits project files and local media.",
      "Storage may fill quickly with projects or media libraries."
    ),
    dimension(
      "display",
      "Display",
      scoreFromSignals(50, displayStrong ? 2 : 0, displayWeak ? 1 : 0),
      displayStrong,
      displayWeak,
      "Panel resolution and quality tier support visual work.",
      "Display spec may feel dated for design or media work."
    ),
    dimension(
      "portability",
      "Portability",
      scoreFromSignals(48, portabilityStrong ? 2 : 0, portabilityWeak ? 1 : 0),
      portabilityStrong,
      portabilityWeak,
      "Form factor favors travel and daily carry.",
      "Weight or size may reduce everyday portability."
    ),
    dimension(
      "longevity",
      "Longevity",
      scoreFromSignals(52, longevityStrong ? 2 : 0, longevityWeak ? 1 : 0),
      longevityStrong,
      longevityWeak,
      "Platform and upgrade path support a longer ownership horizon.",
      "Upgrade path or platform longevity may be limited."
    ),
  ];
}

function evaluateSofaDimensions(blob: string): ProductDimensionScore[] {
  const materialStrong = /leather|velvet|linen|boucle|performance fabric|top grain|solid wood frame/i.test(blob);
  const materialWeak = /pu leather|bonded leather|particle board only/i.test(blob);
  const constructionStrong = /hardwood|solid wood|kiln dried|steel frame|corner blocked/i.test(blob);
  const constructionWeak = /chipboard|particle board|basic frame/i.test(blob);
  const comfortStrong = /deep seat|high density foam|pocket springs|modular|recliner/i.test(blob);
  const comfortWeak = /firm only|thin cushion|basic foam/i.test(blob);
  const dimensionsStrong = /(\d{2,3})\s*cm|l-shape|corner|xl|5-seat|4-seat|modular/i.test(blob);
  const dimensionsWeak = /compact only|2-seat/i.test(blob) && !dimensionsStrong;
  const durabilityStrong = /10 year|10-year|warranty|stain resistant|pet friendly|removable cover/i.test(blob);
  const durabilityWeak = /no warranty|1 year/i.test(blob);
  const styleStrong = /scandi|modern|contemporary|designer|premium/i.test(blob);
  const styleWeak = /basic|budget/i.test(blob);

  return [
    dimension(
      "material",
      "Material quality",
      scoreFromSignals(52, materialStrong ? 2 : 0, materialWeak ? 1 : 0),
      materialStrong,
      materialWeak,
      "Upholstery and frame materials suggest better long-term feel.",
      "Material mix may not match premium furniture expectations."
    ),
    dimension(
      "construction",
      "Construction",
      scoreFromSignals(50, constructionStrong ? 2 : 0, constructionWeak ? 1 : 0),
      constructionStrong,
      constructionWeak,
      "Frame construction signals better structural durability.",
      "Construction details look thin — verify frame quality in-store."
    ),
    dimension(
      "comfort",
      "Comfort",
      scoreFromSignals(52, comfortStrong ? 2 : 0, comfortWeak ? 1 : 0),
      comfortStrong,
      comfortWeak,
      "Cushioning and seating depth support daily lounging.",
      "Comfort profile may feel firm or shallow for extended use."
    ),
    dimension(
      "dimensions",
      "Dimensions",
      scoreFromSignals(48, dimensionsStrong ? 2 : 0, dimensionsWeak ? 1 : 0),
      dimensionsStrong,
      dimensionsWeak,
      "Size and layout cues fit modular or corner room plans.",
      "Dimensions may not fit larger room layouts without verification."
    ),
    dimension(
      "durability",
      "Durability",
      scoreFromSignals(50, durabilityStrong ? 2 : 0, durabilityWeak ? 1 : 0),
      durabilityStrong,
      durabilityWeak,
      "Warranty and wear resistance support household longevity.",
      "Durability claims are limited — inspect stitching and frame in person."
    ),
    dimension(
      "style",
      "Style",
      scoreFromSignals(46, styleStrong ? 2 : 0, styleWeak ? 1 : 0),
      styleStrong,
      styleWeak,
      "Style profile aligns with contemporary living-room aesthetics.",
      "Style execution may read generic versus design-led alternatives."
    ),
  ];
}

function evaluateHeadphoneDimensions(blob: string): ProductDimensionScore[] {
  const soundStrong = /hi[- ]res|ldac|aptx adaptive|studio|balanced armature|planar/i.test(blob);
  const soundWeak = /basic sound|mono/i.test(blob);
  const ancStrong = /anc\b|noise cancelling|adaptive noise|wh-1000|quietcomfort|xm5|xm4/i.test(blob);
  const ancWeak = /passive only|no anc/i.test(blob);
  const comfortStrong = /over[- ]ear|memory foam|lightweight|comfort|soft ear/i.test(blob);
  const comfortWeak = /on[- ]ear only|heavy|clamp/i.test(blob);
  const batteryStrong = /30 hour|40 hour|50 hour|60 hour|long battery/i.test(blob);
  const batteryWeak = /10 hour|12 hour|short battery/i.test(blob);
  const codecStrong = /ldac|aptx adaptive|aptx hd|lossless|hi[- ]res/i.test(blob);
  const codecWeak = /sbc only|basic bluetooth/i.test(blob);

  return [
    dimension(
      "sound",
      "Sound quality",
      scoreFromSignals(54, soundStrong ? 2 : 0, soundWeak ? 1 : 0),
      soundStrong,
      soundWeak,
      "Driver and codec cues suggest strong detail and dynamics.",
      "Audio hardware may underperform versus premium ANC peers."
    ),
    dimension(
      "anc",
      "ANC",
      scoreFromSignals(52, ancStrong ? 2 : 0, ancWeak ? 1 : 0),
      ancStrong,
      ancWeak,
      "Active noise cancelling tier fits travel and office focus.",
      "ANC depth may lag class-leading travel headphones."
    ),
    dimension(
      "comfort",
      "Comfort",
      scoreFromSignals(50, comfortStrong ? 2 : 0, comfortWeak ? 1 : 0),
      comfortStrong,
      comfortWeak,
      "Fit and padding support long listening sessions.",
      "Comfort may fatigue during long flights or workdays."
    ),
    dimension(
      "battery",
      "Battery",
      scoreFromSignals(48, batteryStrong ? 2 : 0, batteryWeak ? 1 : 0),
      batteryStrong,
      batteryWeak,
      "Battery endurance supports multi-day travel without charging.",
      "Battery runtime may require frequent top-ups on travel days."
    ),
    dimension(
      "codec",
      "Codec support",
      scoreFromSignals(50, codecStrong ? 2 : 0, codecWeak ? 1 : 0),
      codecStrong,
      codecWeak,
      "High-resolution codec support preserves source quality on compatible devices.",
      "Codec support may cap wireless fidelity on premium sources."
    ),
  ];
}

function evaluateDynamicDimensions(blob: string, slug: ProductCategorySlug): ProductDimensionScore[] {
  const buildStrong = /premium|pro\b|certified|warranty|official|original/i.test(blob);
  const buildWeak = /generic|no brand|unknown brand|replica/i.test(blob);
  const featureStrong = /\d{2,3}\s*(gb|tb|cm|ml|w|hz)|bluetooth|wireless|waterproof|smart/i.test(blob);
  const featureWeak = blob.trim().length < 24;
  const fitStrong = /size|fit|compatible|universal|adjustable/i.test(blob);
  const fitWeak = /one size|unclear size/i.test(blob);
  const durabilityStrong = /warranty|stainless|steel|solid|reinforced|10 year/i.test(blob);
  const durabilityWeak = /disposable|single use|fragile/i.test(blob);
  const valueStrong = /bundle|kit|set of|multi pack/i.test(blob);
  const valueWeak = /overpriced|luxury only/i.test(blob);

  const categoryLabel =
    slug === "home"
      ? "Home product"
      : slug === "fashion"
        ? "Fashion item"
        : slug === "beauty"
          ? "Beauty product"
          : slug === "sports"
            ? "Sports gear"
            : "Product";

  return [
    dimension(
      "build",
      "Build quality",
      scoreFromSignals(50, buildStrong ? 2 : 0, buildWeak ? 1 : 0),
      buildStrong,
      buildWeak,
      `${categoryLabel} build signals look credible from listing metadata.`,
      `${categoryLabel} build quality needs verification on the retailer page.`
    ),
    dimension(
      "features",
      "Feature depth",
      scoreFromSignals(48, featureStrong ? 2 : 0, featureWeak ? 1 : 0),
      featureStrong,
      featureWeak,
      "Listing exposes meaningful feature detail for this category.",
      "Feature detail is thin — key specs may be missing from the title."
    ),
    dimension(
      "fit",
      "Fit",
      scoreFromSignals(46, fitStrong ? 2 : 0, fitWeak ? 1 : 0),
      fitStrong,
      fitWeak,
      "Fit and compatibility cues align with typical buyer needs.",
      "Fit or compatibility may need manual confirmation before purchase."
    ),
    dimension(
      "durability",
      "Durability",
      scoreFromSignals(48, durabilityStrong ? 2 : 0, durabilityWeak ? 1 : 0),
      durabilityStrong,
      durabilityWeak,
      "Durability cues suggest reasonable long-term use.",
      "Durability signals are weak — treat longevity as unverified."
    ),
    dimension(
      "value",
      "Value",
      scoreFromSignals(46, valueStrong ? 1 : 0, valueWeak ? 1 : 0),
      valueStrong,
      valueWeak,
      "Bundle or spec mix supports category value expectations.",
      "Value profile is unclear without fuller product detail."
    ),
  ];
}

export function evaluateProductDimensions(
  segment: ProductIntelligenceSegment,
  product: QuantProduct,
  searchQuery: string,
  understanding?: ProductUnderstanding | null
): ProductDimensionScore[] {
  const blob = listingBlob(product, searchQuery);
  let dimensions: ProductDimensionScore[];

  switch (segment) {
    case "phones":
      dimensions = evaluatePhoneDimensions(blob);
      break;
    case "laptops":
      dimensions = evaluateLaptopDimensions(blob);
      break;
    case "sofas":
      dimensions = evaluateSofaDimensions(blob);
      break;
    case "headphones":
      dimensions = evaluateHeadphoneDimensions(blob);
      break;
    default:
      dimensions = evaluateDynamicDimensions(
        blob,
        product.qiCategory ?? inferProductCategory(searchQuery, product.title)
      );
      break;
  }

  if (understanding?.specCompleteness != null) {
    const completenessBoost = clampScore((understanding.specCompleteness - 50) * 0.15);
    return dimensions.map((row) => ({
      ...row,
      score: clampScore(row.score + completenessBoost),
    }));
  }

  return dimensions;
}

function safeTrust(coherent: CoherentProductDecision): number {
  const trust = coherent.trustRisk.trustScore;
  if (Number.isFinite(trust) && trust > 0) return clampScore(trust);
  return clampScore(100 - (coherent.trustRisk.riskScore ?? 50));
}

function resolvePricingScore(coherent: CoherentProductDecision): number {
  const opportunity = safeScore(coherent.priceTarget.opportunityScore, 50);
  const discountConfidence = safeScore(coherent.discountTruth.confidence, 50);
  const inflated =
    coherent.discountTruth.verdict === "Inflated" || coherent.discountTruth.verdict === "Likely Inflated"
      ? -18
      : 0;
  return clampScore(Math.max(8, opportunity * 0.65 + discountConfidence * 0.35 + inflated));
}

function resolveValueScore(
  productQuality: number,
  product: QuantProduct,
  trayMedianPrice: number | undefined,
  coherent: CoherentProductDecision
): number {
  const peerPrice = trayMedianPrice && trayMedianPrice > 0 ? trayMedianPrice : product.price;
  const priceRatio = peerPrice > 0 ? product.price / peerPrice : 1;
  const pricePosition = priceRatio <= 0.92 ? 72 : priceRatio <= 1.05 ? 58 : priceRatio <= 1.15 ? 46 : 34;
  const intentValue = safeScore(coherent.intentIntelligence.intentMatchScore, productQuality);
  return clampScore(productQuality * 0.55 + pricePosition * 0.25 + intentValue * 0.2);
}

function resolveCategoryFitScore(coherent: CoherentProductDecision, dimensions: ProductDimensionScore[]): number {
  const dimensionAvg =
    dimensions.length > 0
      ? dimensions.reduce((sum, row) => sum + row.score, 0) / dimensions.length
      : 50;
  const intentRaw = coherent.intentIntelligence.intentMatchScore;
  const intent = Number.isFinite(intentRaw) && intentRaw > 0 ? intentRaw : dimensionAvg;
  const category = coherent.categoryIntelligence.categoryScore;
  const base = category > 0 ? category : dimensionAvg;
  return clampScore(base * 0.45 + intent * 0.55);
}

function resolveProductQualityScore(
  dimensions: ProductDimensionScore[],
  understanding?: ProductUnderstanding | null
): number {
  const dimensionAvg =
    dimensions.length > 0
      ? dimensions.reduce((sum, row) => sum + row.score, 0) / dimensions.length
      : 50;
  if (!understanding) return clampScore(dimensionAvg);
  return clampScore(
    dimensionAvg * 0.62 +
      understanding.specCompleteness * 0.18 +
      understanding.authenticityConfidence * 0.12 +
      (100 - understanding.listingRisk) * 0.08
  );
}

function compositeDecisionScore(scores: UniversalProductIntelligenceScores): number {
  return clampScore(
    scores.productQualityScore * 0.32 +
      scores.categoryFitScore * 0.24 +
      scores.valueScore * 0.18 +
      scores.trustScore * 0.1 +
      scores.pricingScore * 0.08 +
      (100 - scores.alternativePressure) * 0.08
  );
}

function resolveUniversalVerdict(
  scores: UniversalProductIntelligenceScores,
  coherent: CoherentProductDecision
): PrimaryVerdict {
  const composite = compositeDecisionScore(scores);
  const risk = coherent.trustRisk.riskScore ?? 50;

  if (
    scores.productQualityScore < 35 ||
    scores.trustScore < 38 ||
    risk >= 68 ||
    (scores.productQualityScore < 45 && scores.trustScore < 50)
  ) {
    return "AVOID";
  }

  if (
    composite >= 72 &&
    scores.productQualityScore >= 58 &&
    scores.categoryFitScore >= 54 &&
    scores.trustScore >= 52 &&
    risk < 55
  ) {
    return "BUY READY";
  }

  if (
    scores.alternativePressure >= 50 &&
    composite >= 48 &&
    composite < 72 &&
    scores.productQualityScore >= 45
  ) {
    return "COMPARE";
  }

  return "WAIT";
}

function topDimensions(dimensions: ProductDimensionScore[], count = 2): ProductDimensionScore[] {
  return [...dimensions].sort((a, b) => b.score - a.score).slice(0, count);
}

function weakestDimension(dimensions: ProductDimensionScore[]): ProductDimensionScore | null {
  if (!dimensions.length) return null;
  return [...dimensions].sort((a, b) => a.score - b.score)[0] ?? null;
}

export function isPriceDominatedReason(text: string): boolean {
  const lower = text.toLowerCase();
  const priceCue =
    lower.includes("historical low") ||
    lower.includes("above historical") ||
    lower.includes("price sits") ||
    lower.includes("target entry") ||
    lower.includes("distance from") ||
    lower.includes("discount") ||
    lower.includes("trust score") ||
    lower.includes("seller trust");
  const productCue =
    lower.includes("camera") ||
    lower.includes("cpu") ||
    lower.includes("ram") ||
    lower.includes("battery") ||
    lower.includes("anc") ||
    lower.includes("sound") ||
    lower.includes("material") ||
    lower.includes("comfort") ||
    lower.includes("storage") ||
    lower.includes("display") ||
    lower.includes("construction") ||
    lower.includes("ecosystem") ||
    lower.includes("codec") ||
    lower.includes("performance") ||
    lower.includes("durability") ||
    lower.includes("feature");
  return priceCue && !productCue;
}

function buildProductFirstReasons(
  segment: ProductIntelligenceSegment | null,
  segmentLabelText: string,
  product: QuantProduct,
  dimensions: ProductDimensionScore[],
  scores: UniversalProductIntelligenceScores,
  verdict: PrimaryVerdict
): { primary: string; secondary: string; understandingLine: string } {
  const lead = topDimensions(dimensions, 2);
  const weak = weakestDimension(dimensions);
  const store = product.store;

  const leadText =
    lead.length >= 2
      ? `${lead[0]!.label} (${lead[0]!.score}/100) and ${lead[1]!.label} (${lead[1]!.score}/100)`
      : lead[0]
        ? `${lead[0].label} (${lead[0].score}/100)`
        : `${segmentLabelText} profile`;

  let primary = "";
  if (verdict === "BUY READY") {
    primary = clipLine(
      `${store}: ${leadText} make this ${segmentLabelText.toLowerCase()} a strong product match — quality ${scores.productQualityScore}/100.`
    );
  } else if (verdict === "COMPARE") {
    primary = clipLine(
      `${store}: ${leadText} are competitive, but close alternatives remain — compare product specs before choosing.`
    );
  } else if (verdict === "AVOID") {
    primary = clipLine(
      `${store}: ${weak?.label ?? "Product profile"} (${weak?.score ?? scores.productQualityScore}/100) fails safe product checks for this category.`
    );
  } else {
    primary = clipLine(
      `${store}: ${leadText} understood — ${weak ? `${weak.label} (${weak.score}/100) needs verification` : "spec depth is limited"} before checkout.`
    );
  }

  const secondary = clipLine(
    verdict === "BUY READY"
      ? `Category fit ${scores.categoryFitScore}/100 with value ${scores.valueScore}/100 — pricing is supportive, not the primary driver.`
      : verdict === "AVOID"
        ? `Product quality ${scores.productQualityScore}/100 and trust ${scores.trustScore}/100 outweigh price positioning.`
        : `Product quality ${scores.productQualityScore}/100, fit ${scores.categoryFitScore}/100 — market timing is secondary to product understanding.`
  );

  const understandingLine = clipLine(
    lead.map((row) => row.signal).filter(Boolean).slice(0, 2).join(" ")
  );

  return { primary, secondary, understandingLine };
}

/** Universal product intelligence — product-first, pricing as one signal. */
export function resolveUniversalProductIntelligence(
  input: UniversalProductIntelligenceInput
): UniversalProductIntelligenceResult {
  const segment = detectProductIntelligenceSegment(input.product, input.searchQuery);
  const understanding = input.product.qiProductUnderstanding ?? null;
  const dimensions = segment
    ? evaluateProductDimensions(segment, input.product, input.searchQuery, understanding)
    : evaluateProductDimensions("dynamic", input.product, input.searchQuery, understanding);

  const productQualityScore = resolveProductQualityScore(dimensions, understanding);
  const categoryFitScore = resolveCategoryFitScore(input.coherent, dimensions);
  const trustScore = safeTrust(input.coherent);
  const pricingScore = resolvePricingScore(input.coherent);
  const valueScore = resolveValueScore(
    productQualityScore,
    input.product,
    input.trayMedianPrice,
    input.coherent
  );
  const alternativePressure = clampScore(input.alternativePressure);

  const scores: UniversalProductIntelligenceScores = {
    productQualityScore,
    categoryFitScore,
    valueScore,
    trustScore,
    pricingScore,
    alternativePressure,
  };

  const finalVerdict = resolveUniversalVerdict(scores, input.coherent);
  const label = segment ? segmentLabel(segment) : "Product";
  const { primary, secondary, understandingLine } = buildProductFirstReasons(
    segment,
    label,
    input.product,
    dimensions,
    scores,
    finalVerdict
  );

  return {
    ...scores,
    segment,
    segmentLabel: label,
    dimensions,
    finalVerdict,
    primaryReason: primary,
    secondaryReason: secondary,
    productUnderstandingLine: understandingLine,
  };
}
