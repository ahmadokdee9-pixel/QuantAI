/**
 * Phase 9.3 — Trust & discount intelligence hardening (tray-local signals only).
 * No external APIs, no SerpAPI, no ranking reorder.
 */

import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import { peerPriceMedianExcluding } from "@/lib/deals/dealAnalysis";
import type { FakeDiscountRisk } from "@/lib/deals/types";
import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import {
  buildDiscountIntelligence,
  type DiscountIntelligenceResult,
  type VerifiedDiscountOffer,
} from "@/lib/intelligence/discountIntelligenceLayer";
import { detectFakeDiscountSignals } from "@/lib/intelligence/fakeDiscountDetector";
import { assessPriceSanity } from "@/lib/intelligence/priceSanityEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";

export type ProductTrustDiscountAssessment = {
  link: string;
  store: string;
  trustScore: number;
  retailerConfidence: number;
  fakeDiscountRisk: FakeDiscountRisk;
  fakeDiscountProbability: number;
  discountAuthenticity: number;
  suspiciousSeller: boolean;
  suspiciousSellerReasons: string[];
  priceAnomaly: "none" | "deep_discount" | "premium_outlier" | "suspicious_low";
  priceAnomalyFlags: string[];
};

export type Phase93VerdictConfidence = {
  score: number;
  factors: string[];
  discountAuthentic: boolean;
  trustFloorOk: boolean;
  suspiciousSellerBlocked: boolean;
};

export type Phase93TrustDiscountMeta = {
  version: "phase9.3-v1";
  trayAssessments: ProductTrustDiscountAssessment[];
  suspiciousSellerCount: number;
  fakeDiscountHighCount: number;
  priceAnomalyCount: number;
  averageRetailerConfidence: number;
  averageTrustScore: number;
  discountIntelligence: DiscountIntelligenceResult;
  verdictConfidence: Phase93VerdictConfidence;
};

const AGGREGATOR_RX =
  /\b(fruugo|ubuy|wish|temu|aliexpress|dhgate|banggood|alibaba|joom|lightinthebox)\b/i;
const RENTAL_MARKETPLACE_RX = /\b(grover|rent|lease|huur|subscription)\b/i;

function median(nums: number[]): number {
  const s = [...nums].filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function discountPct(p: QuantProduct): number | null {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return null;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function reviewDepth01(p: QuantProduct, maxReviews: number): number {
  const r = p.reviewsCount ?? 0;
  if (maxReviews <= 0) return r > 0 ? 0.45 : 0.2;
  return Math.min(1, Math.log10(r + 1) / Math.log10(maxReviews + 1));
}

export function assessSuspiciousSeller(
  product: QuantProduct,
  list: QuantProduct[]
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const store = `${product.store} ${product.title}`.toLowerCase();
  const trust = getStoreTrustScore(product.store);
  const tier = getMarketplaceSellerRiskTier(product.store, product.title);
  const lq = listingTextQuality01(product.title);
  const disc = discountPct(product);

  if (tier === "high") reasons.push("marketplace_high_risk_tier");
  if (AGGREGATOR_RX.test(store) && trust < 72) reasons.push("aggregator_low_trust");
  if (trust < 52) reasons.push("store_trust_floor");
  if (lq < 0.32 && (product.reviewsCount ?? 0) < 8) reasons.push("thin_listing_proof");
  if (disc != null && disc >= 35 && AGGREGATOR_RX.test(product.store) && trust <= 72) {
    reasons.push("steep_discount_untrusted_aggregator");
  }
  if (RENTAL_MARKETPLACE_RX.test(store) && product.price < 120) reasons.push("rental_subscription_cue");

  const peerMed = peerPriceMedianExcluding(list, product.link);
  if (
    peerMed > 0 &&
    product.price > 0 &&
    product.price < peerMed * 0.42 &&
    trust < 62 &&
    (product.reviewsCount ?? 0) < 15
  ) {
    reasons.push("price_outlier_thin_proof");
  }

  return { suspicious: reasons.length >= 2 || reasons.includes("steep_discount_untrusted_aggregator"), reasons };
}

export function assessFakeDiscountHardened(
  product: QuantProduct,
  list: QuantProduct[]
): { risk: FakeDiscountRisk; probability: number; authenticity: number } {
  const maxReviews = Math.max(0, ...list.map((p) => p.reviewsCount ?? 0));
  const disc = discountPct(product);
  const peerMed = peerPriceMedianExcluding(list, product.link);
  const trust = getStoreTrustScore(product.store);
  const signals = detectFakeDiscountSignals(product, list);
  const inflatedAnchor = product.oldPrice != null && peerMed > 0 && product.oldPrice > peerMed * 1.32;
  const steepVsPeers = peerMed > 0 && product.price > 0 && product.price < peerMed * 0.55 && (disc ?? 0) >= 30;
  const aggregatorSteep =
    AGGREGATOR_RX.test(product.store) && (disc ?? 0) >= 35 && trust <= 72;

  let probability = signals.fakeDiscountProbability;
  if (inflatedAnchor) probability += 0.18;
  if (steepVsPeers) probability += 0.14;
  if (aggregatorSteep) probability += 0.22;
  if (signals.discountManipulationRisk >= 0.62) probability += 0.08;
  probability = Math.min(0.96, probability);

  let risk: FakeDiscountRisk = "low";
  if (probability >= 0.72 || aggregatorSteep || (inflatedAnchor && (disc ?? 0) >= 50)) risk = "high";
  else if (probability >= 0.46 || inflatedAnchor || steepVsPeers) risk = "medium";

  let authenticity = Math.round((1 - probability) * 100);
  if (trust >= 78 && !inflatedAnchor && (disc ?? 0) >= 8 && (disc ?? 0) <= 35) authenticity += 8;
  if (reviewDepth01(product, maxReviews) >= 0.45) authenticity += 6;
  if (risk === "high") authenticity = Math.min(authenticity, 38);
  authenticity = Math.max(0, Math.min(100, authenticity));

  return { risk, probability, authenticity };
}

export function computeRetailerConfidence(product: QuantProduct, list: QuantProduct[]): number {
  const trust = getStoreTrustScore(product.store);
  const maxReviews = Math.max(1, ...list.map((p) => p.reviewsCount ?? 0));
  const reviews = reviewDepth01(product, maxReviews);
  const stars = ratingValue(product.rating) / 5;
  const lq = listingTextQuality01(product.title);
  const tier = getMarketplaceSellerRiskTier(product.store, product.title);
  const tierAdj = tier === "low" ? 8 : tier === "medium" ? 0 : -14;
  const suspicious = assessSuspiciousSeller(product, list);

  let score = trust * 0.52 + reviews * 100 * 0.18 + stars * 100 * 0.12 + lq * 100 * 0.18 + tierAdj;
  if (suspicious.suspicious) score -= 16;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Tray-calibrated trust score for consistent meta exposure. */
export function computeTrustScoreConsistent(product: QuantProduct, list: QuantProduct[]): number {
  const base = getStoreTrustScore(product.store);
  const peerMed = peerPriceMedianExcluding(list, product.link);
  let adj = 0;
  if (peerMed > 0 && product.price > 0 && product.price < peerMed * 0.4) adj -= 8;
  if (peerMed > 0 && product.price > peerMed * 2.2) adj -= 4;
  const suspicious = assessSuspiciousSeller(product, list);
  if (suspicious.suspicious) adj -= 10;
  return Math.max(0, Math.min(100, Math.round(base + adj)));
}

export function assessPriceAnomalyHardened(
  product: QuantProduct,
  list: QuantProduct[],
  query?: string
): ProductTrustDiscountAssessment["priceAnomaly"] {
  const sanity = assessPriceSanity(product, list.map((p) => p.price).filter((n) => n > 0), query);
  if (sanity.pricingModel === "suspicious" || sanity.flags.some((f) => f.startsWith("unrealistic_low"))) {
    return "suspicious_low";
  }
  const peerMed = peerPriceMedianExcluding(list, product.link);
  if (peerMed > 0 && product.price > peerMed * 1.85) return "premium_outlier";
  const disc = discountPct(product);
  const fake = assessFakeDiscountHardened(product, list);
  if ((disc ?? 0) >= 25 && fake.risk !== "low") return "deep_discount";
  if (sanity.flags.includes("tray_outlier_low")) return "suspicious_low";
  return "none";
}

export function assessProductTrustDiscount(
  product: QuantProduct,
  list: QuantProduct[],
  query?: string
): ProductTrustDiscountAssessment {
  const fake = assessFakeDiscountHardened(product, list);
  const suspicious = assessSuspiciousSeller(product, list);
  const sanity = assessPriceSanity(product, list.map((p) => p.price).filter((n) => n > 0), query);

  return {
    link: product.link,
    store: product.store,
    trustScore: computeTrustScoreConsistent(product, list),
    retailerConfidence: computeRetailerConfidence(product, list),
    fakeDiscountRisk: fake.risk,
    fakeDiscountProbability: Math.round(fake.probability * 1000) / 1000,
    discountAuthenticity: fake.authenticity,
    suspiciousSeller: suspicious.suspicious,
    suspiciousSellerReasons: suspicious.reasons,
    priceAnomaly: assessPriceAnomalyHardened(product, list, query),
    priceAnomalyFlags: sanity.flags,
  };
}

export function buildHardenedDiscountIntelligence(
  products: QuantProduct[],
  query: string,
  assessments: Map<string, ProductTrustDiscountAssessment>
): DiscountIntelligenceResult {
  const base = buildDiscountIntelligence(products, query);
  const priced = products.filter((p) => p.price > 0);
  const med = median(priced.map((p) => p.price));
  const trusted = priced.filter((p) => (assessments.get(p.link)?.trustScore ?? getStoreTrustScore(p.store)) >= 68);
  const highestTrusted = trusted.length
    ? Math.max(...trusted.map((p) => p.price))
    : Math.max(...priced.map((p) => p.price), 0);

  const offers: VerifiedDiscountOffer[] = [];
  for (const p of priced) {
    const a = assessments.get(p.link);
    if (!a) continue;
    if (a.fakeDiscountRisk === "high") continue;
    if (a.suspiciousSeller) continue;
    if (a.discountAuthenticity < 58) continue;
    if (a.retailerConfidence < 62) continue;
    if (a.priceAnomaly === "suspicious_low") continue;

    const savingsVsMedian = med > 0 ? Math.max(0, med - p.price) : 0;
    const savingsVsHighest = highestTrusted > 0 ? Math.max(0, highestTrusted - p.price) : 0;
    if (savingsVsMedian < 5 && savingsVsHighest < 8) continue;

    offers.push({
      link: p.link,
      store: p.store,
      title: p.title,
      price: p.price,
      savingsVsMedian,
      savingsVsHighest,
      trustScore: a.trustScore,
      fakeDiscountRisk: a.fakeDiscountRisk === "medium" ? "medium" : "low",
      label: null,
    });
  }

  offers.sort((x, y) => {
    const ax = assessments.get(x.link)!;
    const ay = assessments.get(y.link)!;
    const scoreX =
      x.savingsVsMedian * 0.45 + ax.discountAuthenticity * 0.35 + ax.retailerConfidence * 0.2;
    const scoreY =
      y.savingsVsMedian * 0.45 + ay.discountAuthenticity * 0.35 + ay.retailerConfidence * 0.2;
    return scoreY - scoreX;
  });

  let bestVerifiedDiscount: VerifiedDiscountOffer | null = null;
  const top = offers[0];
  const topAssessment = top ? assessments.get(top.link) : null;
  if (
    top &&
    topAssessment &&
    top.savingsVsMedian >= 8 &&
    topAssessment.retailerConfidence >= 68 &&
    topAssessment.discountAuthenticity >= 72 &&
    topAssessment.fakeDiscountRisk === "low"
  ) {
    bestVerifiedDiscount = { ...top, label: "Strongest Discount Signal" };
    offers[0] = bestVerifiedDiscount;
  }

  return {
    offers: offers.slice(0, 8),
    bestVerifiedDiscount,
    medianPrice: med,
    highestTrustedPrice: highestTrusted,
    clusterCount: base.clusterCount,
  };
}

export function computeVerdictConfidence(args: {
  products: QuantProduct[];
  decisionBrief: DecisionBriefDTO | null;
  discount: DiscountIntelligenceResult;
  assessments: Map<string, ProductTrustDiscountAssessment>;
}): Phase93VerdictConfidence {
  const { products, decisionBrief, discount, assessments } = args;
  if (!decisionBrief || !products.length) {
    return {
      score: 0,
      factors: ["empty_tray"],
      discountAuthentic: false,
      trustFloorOk: false,
      suspiciousSellerBlocked: false,
    };
  }

  const pick = assessments.get(decisionBrief.recommendation.link);
  const factors: string[] = [];
  let score = decisionBrief.confidence;

  if (pick) {
    score = Math.round(score * 0.55 + pick.retailerConfidence * 0.25 + pick.discountAuthenticity * 0.2);
    factors.push(`retailer_confidence_${pick.retailerConfidence}`);
    if (pick.trustScore >= 70) {
      score += 4;
      factors.push("trust_floor_pass");
    }
    if (pick.suspiciousSeller) {
      score -= 18;
      factors.push("suspicious_seller_penalty");
    }
    if (pick.fakeDiscountRisk === "high") {
      score -= 22;
      factors.push("fake_discount_high_penalty");
    } else if (pick.fakeDiscountRisk === "medium") {
      score -= 8;
      factors.push("fake_discount_medium_penalty");
    }
    if (pick.priceAnomaly === "suspicious_low") {
      score -= 14;
      factors.push("price_anomaly_penalty");
    }
  }

  const discountAuthentic =
    Boolean(discount.bestVerifiedDiscount) &&
    (assessments.get(discount.bestVerifiedDiscount!.link)?.discountAuthenticity ?? 0) >= 72;
  if (discountAuthentic) {
    score += 3;
    factors.push("verified_discount_authentic");
  }

  score = Math.max(32, Math.min(96, Math.round(score)));

  return {
    score,
    factors,
    discountAuthentic,
    trustFloorOk: (pick?.trustScore ?? 0) >= 62,
    suspiciousSellerBlocked: Boolean(pick?.suspiciousSeller),
  };
}

function patchProductCommerceSignals(
  product: QuantProduct,
  assessment: ProductTrustDiscountAssessment
): QuantProduct {
  const existing = product.qiCommerce ?? {
    buyingVerdict: "",
    pros: [],
    cons: [],
    risks: [],
    valueForMoney: 50,
    confidence: 50,
    deliveryIntel: null,
    returnsIntel: null,
    trustWeightedNote: null,
    semanticVsQuery: null,
    comparedToFieldNote: null,
    modelId: "phase93-hardening",
    source: "heuristic" as const,
  };

  const risks = [...(existing.risks ?? [])];
  if (assessment.suspiciousSeller && !risks.some((r) => r.code === "suspicious_seller")) {
    risks.push({
      code: "suspicious_seller",
      severity: "medium",
      label: "Seller signals need manual verification before checkout.",
    });
  }
  if (assessment.fakeDiscountRisk === "high" && !risks.some((r) => r.code === "fake_discount")) {
    risks.push({
      code: "fake_discount",
      severity: "high",
      label: "Discount anchor may be inflated versus peer listings in this tray.",
    });
  }

  return {
    ...product,
    qiCommerce: {
      ...existing,
      retailerRiskScore: Math.max(existing.retailerRiskScore ?? 0, 100 - assessment.retailerConfidence),
      retailerRiskNote:
        assessment.suspiciousSellerReasons.length > 0
          ? `Phase 9.3: ${assessment.suspiciousSellerReasons.slice(0, 2).join(", ")}`
          : existing.retailerRiskNote,
      priceAnomaly: assessment.priceAnomaly === "none" ? existing.priceAnomaly ?? "none" : assessment.priceAnomaly,
      confidence: Math.min(existing.confidence, assessment.retailerConfidence),
      needsManualVerification:
        existing.needsManualVerification ||
        assessment.suspiciousSeller ||
        assessment.fakeDiscountRisk === "high",
      risks,
    },
  };
}

export function applyPhase93TrustDiscountHardening(
  products: QuantProduct[],
  query: string,
  opts: {
    decisionBrief: DecisionBriefDTO | null;
    baseDiscount: DiscountIntelligenceResult;
  }
): {
  products: QuantProduct[];
  meta: Phase93TrustDiscountMeta;
  decisionBrief: DecisionBriefDTO | null;
} {
  const priced = products.filter((p) => p.price > 0);
  const assessmentByLink = new Map<string, ProductTrustDiscountAssessment>();
  for (const p of products) {
    assessmentByLink.set(p.link, assessProductTrustDiscount(p, priced.length ? priced : products, query));
  }

  const trayAssessments = products.slice(0, 12).map((p) => assessmentByLink.get(p.link)!);
  const hardenedDiscount = buildHardenedDiscountIntelligence(products, query, assessmentByLink);
  const verdictConfidence = computeVerdictConfidence({
    products,
    decisionBrief: opts.decisionBrief,
    discount: hardenedDiscount,
    assessments: assessmentByLink,
  });

  const patched = products.map((p) => {
    const a = assessmentByLink.get(p.link);
    return a ? patchProductCommerceSignals(p, a) : p;
  });

  let decisionBrief = opts.decisionBrief;
  if (decisionBrief) {
    decisionBrief = {
      ...decisionBrief,
      confidence: verdictConfidence.score,
      discountNote:
        verdictConfidence.discountAuthentic && hardenedDiscount.bestVerifiedDiscount
          ? `Discount signal (authenticity ${assessmentByLink.get(hardenedDiscount.bestVerifiedDiscount.link)?.discountAuthenticity ?? 0}/100) — save ~${Math.round(hardenedDiscount.bestVerifiedDiscount.savingsVsMedian)} vs search-sample median`
          : decisionBrief.discountNote,
    };
  }

  return {
    products: patched,
    decisionBrief,
    meta: {
      version: "phase9.3-v1",
      trayAssessments,
      suspiciousSellerCount: trayAssessments.filter((a) => a.suspiciousSeller).length,
      fakeDiscountHighCount: trayAssessments.filter((a) => a.fakeDiscountRisk === "high").length,
      priceAnomalyCount: trayAssessments.filter((a) => a.priceAnomaly !== "none").length,
      averageRetailerConfidence:
        trayAssessments.length > 0
          ? Math.round(
              trayAssessments.reduce((s, a) => s + a.retailerConfidence, 0) / trayAssessments.length
            )
          : 0,
      averageTrustScore:
        trayAssessments.length > 0
          ? Math.round(trayAssessments.reduce((s, a) => s + a.trustScore, 0) / trayAssessments.length)
          : 0,
      discountIntelligence: hardenedDiscount,
      verdictConfidence,
    },
  };
}
