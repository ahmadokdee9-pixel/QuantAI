/**
 * Phase 29 — Buy Opportunity Engine.
 * Product intelligence authority for BUY READY — opportunity, not perfect timing.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductIntelligenceSnapshot } from "@/lib/ui/universalProductDecision";
import type { ProductIntelligenceSegment } from "@/lib/ui/universalProductIntelligenceEngine";

export type BuyOpportunityInput = {
  intelligence: UniversalProductIntelligenceSnapshot;
  coherent: CoherentProductDecision;
  store: string;
  priorVerdict: PrimaryVerdict;
  productTitle: string;
  trayBuyLeader?: boolean;
};

export type BuyOpportunityResult = {
  buyOpportunityScore: number;
  buyEligible: boolean;
  finalVerdict: PrimaryVerdict;
  primaryReason: string;
  secondaryReason: string;
  buyOpportunityFlags: string[];
};

function clipLine(text: string, max = 112): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function productCompositeScore(intelligence: UniversalProductIntelligenceSnapshot): number {
  return clampScore(
    (safeScore(intelligence.productQualityScore) +
      safeScore(intelligence.categoryFitScore) +
      safeScore(intelligence.valueScore)) /
      3
  );
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeScore(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/** buyOpportunityScore = productQuality + categoryFit + valueScore - alternativePressure */
export function computeBuyOpportunityScore(intelligence: UniversalProductIntelligenceSnapshot): number {
  return Math.round(
    safeScore(intelligence.productQualityScore) +
      safeScore(intelligence.categoryFitScore) +
      safeScore(intelligence.valueScore) -
      safeScore(intelligence.alternativePressure)
  );
}

function topDimensionLabels(
  intelligence: UniversalProductIntelligenceSnapshot,
  count = 2
): string[] {
  return [...intelligence.dimensions]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((row) => row.label.toLowerCase());
}

function buildBuyReason(
  segment: ProductIntelligenceSegment | null,
  intelligence: UniversalProductIntelligenceSnapshot,
  store: string,
  buyOpportunityScore: number
): { primary: string; secondary: string } {
  const dims = topDimensionLabels(intelligence, 3);
  const pressure = intelligence.alternativePressure;

  if (segment === "phones") {
    return {
      primary: clipLine(
        `${store}: Strong ecosystem, storage and performance combination with limited competitive pressure — buy opportunity ${buyOpportunityScore}.`
      ),
      secondary: clipLine(
        `Product quality ${intelligence.productQualityScore}/100, fit ${intelligence.categoryFitScore}/100 — pricing does not need to hit historical low.`
      ),
    };
  }

  if (segment === "laptops") {
    return {
      primary: clipLine(
        `${store}: CPU, RAM and longevity profile justify current price — buy opportunity ${buyOpportunityScore}.`
      ),
      secondary: clipLine(
        `Value ${intelligence.valueScore}/100 with alternative pressure ${pressure}/100 — product intelligence supports checkout.`
      ),
    };
  }

  if (segment === "sofas") {
    return {
      primary: clipLine(
        `${store}: Comfort, dimensions and construction quality offer strong value — buy opportunity ${buyOpportunityScore}.`
      ),
      secondary: clipLine(
        `Category fit ${intelligence.categoryFitScore}/100 — opportunity driven by product substance, not discount timing.`
      ),
    };
  }

  if (segment === "headphones") {
    return {
      primary: clipLine(
        `${store}: Sound, ANC and comfort profile justify purchase with limited competitive pressure — buy opportunity ${buyOpportunityScore}.`
      ),
      secondary: clipLine(
        `Product quality ${intelligence.productQualityScore}/100 — strong ${dims.slice(0, 2).join(" and ")} combination.`
      ),
    };
  }

  return {
    primary: clipLine(
      `${store}: Strong ${dims.slice(0, 2).join(" and ") || "product"} profile with limited competitive pressure — buy opportunity ${buyOpportunityScore}.`
    ),
    secondary: clipLine(
      `Quality ${intelligence.productQualityScore}/100, fit ${intelligence.categoryFitScore}/100, value ${intelligence.valueScore}/100.`
    ),
  };
}

function isAvoidProfile(intelligence: UniversalProductIntelligenceSnapshot, coherent: CoherentProductDecision): boolean {
  const risk = safeScore(coherent.trustRisk.riskScore, 50);
  return (
    intelligence.productQualityScore < 38 ||
    intelligence.trustScore < 38 ||
    risk >= 68 ||
    (intelligence.productQualityScore < 45 && intelligence.trustScore < 50)
  );
}

export function isCoreProductListing(title: string, segment: ProductIntelligenceSegment | null): boolean {
  const blob = title.toLowerCase();
  if (
    /\b(case|charger|cable|screen protector|accessory bundle|bundle only)\b/i.test(blob) &&
    !/\b(iphone|macbook|sofa|couch|headphone|earbud|airpods)\b/i.test(blob)
  ) {
    return false;
  }
  if (segment === "phones") return /\b(iphone|galaxy|pixel|smartphone|\bphone\b)/i.test(blob);
  if (segment === "laptops") return /\b(macbook|laptop|notebook|ultrabook)/i.test(blob);
  if (segment === "sofas") return /\b(sofa|couch|sectional|modular)/i.test(blob);
  if (segment === "headphones") return /\b(headphone|earbud|airpods|headset|wh-1000)/i.test(blob);
  return blob.trim().length >= 18;
}

function passesBuyQualityGates(intelligence: UniversalProductIntelligenceSnapshot): boolean {
  return (
    intelligence.productQualityScore >= 58 &&
    intelligence.categoryFitScore >= 54 &&
    intelligence.valueScore >= 52 &&
    intelligence.trustScore >= 50
  );
}

function passesBuyPressureGate(
  intelligence: UniversalProductIntelligenceSnapshot,
  buyOpportunityScore: number,
  trayBuyLeader: boolean
): boolean {
  const pressure = intelligence.alternativePressure;
  if (pressure <= 46) return true;
  if (trayBuyLeader && buyOpportunityScore >= 120 && pressure <= 58) return true;
  if (pressure <= 54 && buyOpportunityScore >= 136) return true;
  if (pressure <= 60 && buyOpportunityScore >= 148) return true;
  if (buyOpportunityScore >= 162) return true;
  return false;
}

/** Resolve BUY authority from product intelligence (Phase 29). */
export function resolveBuyOpportunityAuthority(input: BuyOpportunityInput): BuyOpportunityResult {
  const { intelligence, coherent, store, priorVerdict, productTitle, trayBuyLeader = false } = input;
  const buyOpportunityScore = computeBuyOpportunityScore(intelligence);
  const flags: string[] = [];
  const risk = safeScore(coherent.trustRisk.riskScore, 50);

  if (!isCoreProductListing(productTitle, intelligence.segment)) {
    return {
      buyOpportunityScore,
      buyEligible: false,
      finalVerdict: intelligence.finalVerdict,
      primaryReason: "",
      secondaryReason: "",
      buyOpportunityFlags: ["non_core_listing_blocks_buy"],
    };
  }

  if (intelligence.segment === "dynamic" && buyOpportunityScore < 145) {
    return {
      buyOpportunityScore,
      buyEligible: false,
      finalVerdict: intelligence.finalVerdict,
      primaryReason: "",
      secondaryReason: "",
      buyOpportunityFlags: ["dynamic_segment_needs_higher_score"],
    };
  }

  if (isAvoidProfile(intelligence, coherent)) {
    return {
      buyOpportunityScore,
      buyEligible: false,
      finalVerdict: priorVerdict === "AVOID" ? "AVOID" : intelligence.finalVerdict,
      primaryReason: "",
      secondaryReason: "",
      buyOpportunityFlags: ["avoid_profile_blocks_buy"],
    };
  }

  const qualityGates = passesBuyQualityGates(intelligence);
  const composite = productCompositeScore(intelligence);
  const pressureGate = trayBuyLeader
    ? intelligence.alternativePressure <= 72
    : passesBuyPressureGate(intelligence, buyOpportunityScore, false);
  const scoreGate = buyOpportunityScore >= (trayBuyLeader ? 80 : 130);
  const leaderGate = trayBuyLeader && composite >= 58 && qualityGates && risk < 60;
  const standardGate = qualityGates && pressureGate && scoreGate && risk < 60;
  const buyEligible = leaderGate || standardGate;

  if (buyEligible) {
    if (leaderGate) flags.push("tray_buy_leader_opportunity");
    if (standardGate) flags.push("buy_opportunity_promoted");
    if (trayBuyLeader) flags.push("tray_buy_leader");
    if (priorVerdict !== "BUY READY") flags.push("buy_upgraded_from_product_intelligence");
  }

  if (!buyEligible) {
    return {
      buyOpportunityScore,
      buyEligible: false,
      finalVerdict: intelligence.finalVerdict,
      primaryReason: "",
      secondaryReason: "",
      buyOpportunityFlags: flags,
    };
  }

  const { primary, secondary } = buildBuyReason(intelligence.segment, intelligence, store, buyOpportunityScore);

  return {
    buyOpportunityScore,
    buyEligible: true,
    finalVerdict: "BUY READY",
    primaryReason: primary,
    secondaryReason: secondary,
    buyOpportunityFlags: flags,
  };
}

export function verdictDistribution(rows: Array<{ verdict: PrimaryVerdict }>): Record<PrimaryVerdict, number> {
  return {
    "BUY READY": rows.filter((row) => row.verdict === "BUY READY").length,
    WAIT: rows.filter((row) => row.verdict === "WAIT").length,
    COMPARE: rows.filter((row) => row.verdict === "COMPARE").length,
    AVOID: rows.filter((row) => row.verdict === "AVOID").length,
    "INSUFFICIENT DATA": rows.filter((row) => row.verdict === "INSUFFICIENT DATA").length,
  };
}

export function verdictShare(
  distribution: Record<PrimaryVerdict, number>,
  verdict: PrimaryVerdict,
  total: number
): number {
  if (total <= 0) return 0;
  return distribution[verdict] / total;
}
