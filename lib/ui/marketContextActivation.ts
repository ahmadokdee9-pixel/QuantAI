/**
 * Phase 13.9 — Market Context Activation Layer.
 * Surfaces existing market intelligence into current card and drawer text slots only.
 */

import type { DecisionBriefDTO } from "@/lib/intelligence/decisionBriefEngine";
import type { DecisionReadinessMeta } from "@/lib/intelligence/decisionReadinessEngine";
import type { RealDiscountMeta } from "@/lib/intelligence/realDiscountEngine";
import type { RetailerTrustMeta } from "@/lib/intelligence/retailerTrustEngine";
import type { ReviewCredibilityMeta } from "@/lib/intelligence/reviewCredibilityEngine";
import type { ValueIntelligenceMeta } from "@/lib/intelligence/valueIntelligenceEngine";
import type { ProductTrustDiscountAssessment } from "@/lib/intelligence/phase93TrustDiscountHardening";
import type { VerdictIntelligenceMeta } from "@/lib/intelligence/verdictEngine";
import type { RankingEngineMeta } from "@/lib/ranking/deterministicRankingEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";

export type MarketContextInput = {
  decisionBrief?: DecisionBriefDTO | null;
  valueIntelligence?: ValueIntelligenceMeta | null;
  realDiscount?: RealDiscountMeta | null;
  retailerTrust?: RetailerTrustMeta | null;
  reviewCredibility?: ReviewCredibilityMeta | null;
  decisionReadiness?: DecisionReadinessMeta | null;
  rankingEngine?: RankingEngineMeta | null;
  verdictIntelligence?: VerdictIntelligenceMeta | null;
  /** Phase 14.0 — tray-local listing truth; presentation may filter, not invent. */
  phase93Assessment?: ProductTrustDiscountAssessment | null;
  institutionalVerdict?: PrimaryVerdict | null;
  /** Phase 16.0 — listing discount truth; Phase 93 may override on conflict. */
  discountTruth?: ActivatedDiscountTruth | null;
};

export type ActivatedMarketContext = {
  priceAttractive: string;
  discountReal: string;
  sellerTrustworthy: string;
  timingFavorable: string;
  waitRecommended: string;
  cardLines: string[];
  drawerListingRead: string;
  expandedLines: string[];
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function uniqueLines(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const line = clipLine(value);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

function priceAttractiveLine(value: ValueIntelligenceMeta | null | undefined): string {
  if (!value) return "";
  if (value.valueLevel === "VERY_LOW" || value.valueLevel === "LOW") {
    return "Current price is not attractive enough.";
  }
  if (value.valueLevel === "MEDIUM") {
    return "Price is fair, but not a standout deal.";
  }
  if (value.valueLevel === "HIGH") {
    return "Price looks attractive for what you get.";
  }
  return "Price looks excellent for what you get.";
}

function discountRealLine(realDiscount: RealDiscountMeta | null | undefined): string {
  if (!realDiscount) return "";
  if (realDiscount.fakeDiscountRisk >= 0.45) {
    return "Discount may be inflated — check the original price.";
  }
  if (realDiscount.discountLevel === "VERY_LOW" || realDiscount.discountLevel === "LOW") {
    return "Savings look modest or unclear.";
  }
  if (realDiscount.discountLevel === "MEDIUM") {
    return "Discount appears reasonable.";
  }
  return "Discount appears genuine.";
}

function sellerTrustworthyLine(
  retailerTrust: RetailerTrustMeta | null | undefined,
  reviewCredibility: ReviewCredibilityMeta | null | undefined
): string {
  const trust = retailerTrust?.trustLevel;
  const reviews = reviewCredibility?.credibilityLevel;

  if (trust === "VERY_LOW" || trust === "LOW") {
    return "Seller reputation needs extra verification.";
  }
  if (trust === "MEDIUM") {
    return "Seller reputation is acceptable.";
  }

  if (reviews === "VERY_LOW" || reviews === "LOW") {
    return "Customer feedback may need a closer look.";
  }
  if (trust === "HIGH" || trust === "VERY_HIGH") {
    return "Seller reputation looks reliable.";
  }
  return "Seller reputation looks very reliable.";
}

function timingFavorableLine(
  valueIntelligence: ValueIntelligenceMeta | null | undefined,
  realDiscount: RealDiscountMeta | null | undefined,
  decisionReadiness: DecisionReadinessMeta | null | undefined,
  verdictIntelligence: VerdictIntelligenceMeta | null | undefined
): string {
  if (decisionReadiness?.readinessStatus === "WAIT_FOR_BETTER_DEAL") {
    return "Market timing favors waiting for a better deal.";
  }
  if (verdictIntelligence?.verdict === "WAIT") {
    return "Market timing does not favor buying right now.";
  }
  if ((realDiscount?.urgencyDiscountSignal ?? 0) >= 0.45) {
    return "Sale urgency looks artificial — verify timing before buying.";
  }
  if ((realDiscount?.priceDropSignal ?? 0) >= 0.55) {
    return "Recent price movement looks favorable.";
  }
  if (valueIntelligence && valueIntelligence.longTermValueSignal >= 0.55) {
    return "Long-term value timing looks favorable.";
  }
  if (valueIntelligence && valueIntelligence.longTermValueSignal <= 0.35) {
    return "Market timing favors patience.";
  }
  return "Market timing looks neutral.";
}

function waitRecommendedLine(
  decisionReadiness: DecisionReadinessMeta | null | undefined,
  valueIntelligence: ValueIntelligenceMeta | null | undefined,
  realDiscount: RealDiscountMeta | null | undefined,
  verdictIntelligence: VerdictIntelligenceMeta | null | undefined,
  decisionBrief: DecisionBriefDTO | null | undefined
): string {
  if (decisionReadiness?.readinessStatus === "WAIT_FOR_BETTER_DEAL") {
    return "Waiting may produce a better opportunity.";
  }
  if (verdictIntelligence?.verdict === "WAIT" || verdictIntelligence?.verdict === "AVOID") {
    return "Waiting is recommended until market conditions improve.";
  }
  if (valueIntelligence?.valueLevel === "VERY_LOW" || valueIntelligence?.valueLevel === "LOW") {
    return "Waiting may help you find a better price.";
  }
  if ((realDiscount?.fakeDiscountRisk ?? 0) >= 0.45) {
    return "Waiting may avoid a misleading discount.";
  }
  if (decisionBrief?.marketStatus) {
    const status = decisionBrief.marketStatus.toLowerCase();
    if (status.includes("patience") || status.includes("waiting")) {
      return clipLine(decisionBrief.marketStatus);
    }
  }
  return "";
}

function hasMarketSources(input: MarketContextInput): boolean {
  return Boolean(
    input.valueIntelligence ||
      input.realDiscount ||
      input.retailerTrust ||
      input.reviewCredibility ||
      input.decisionReadiness ||
      input.rankingEngine ||
      input.verdictIntelligence ||
      input.phase93Assessment ||
      input.discountTruth ||
      input.decisionBrief?.marketStatus
  );
}

function applyPhase93Grounding(
  ctx: Omit<ActivatedMarketContext, "cardLines" | "drawerListingRead" | "expandedLines">,
  assessment: ProductTrustDiscountAssessment | null | undefined,
  institutionalVerdict: PrimaryVerdict | null | undefined
): Omit<ActivatedMarketContext, "cardLines" | "drawerListingRead" | "expandedLines"> {
  if (!assessment && !institutionalVerdict) return ctx;

  let priceAttractive = ctx.priceAttractive;
  let discountReal = ctx.discountReal;
  let sellerTrustworthy = ctx.sellerTrustworthy;
  let timingFavorable = ctx.timingFavorable;
  let waitRecommended = ctx.waitRecommended;

  if (assessment) {
    if (assessment.fakeDiscountRisk === "high") {
      discountReal = "Discount may be inflated — check the original price.";
      waitRecommended = waitRecommended || "Waiting may avoid a misleading discount.";
      timingFavorable = "Market timing favors verification before buying.";
    } else if (assessment.fakeDiscountRisk === "medium") {
      discountReal = "Savings look modest or need verification.";
    }

    if (assessment.suspiciousSeller || assessment.trustScore < 52) {
      sellerTrustworthy = "Seller reputation needs extra verification.";
      waitRecommended = waitRecommended || "Waiting may reduce checkout risk.";
      timingFavorable = "Market timing favors patience until seller checks out.";
    }

    if (assessment.priceAnomaly === "suspicious_low" || assessment.priceAnomaly === "premium_outlier") {
      priceAttractive = "Current price may not reflect a fair market level.";
    }
  }

  if (institutionalVerdict === "WAIT" || institutionalVerdict === "AVOID") {
    timingFavorable =
      institutionalVerdict === "AVOID"
        ? "Market timing does not favor buying right now."
        : "Market timing favors waiting for a better deal.";
    waitRecommended = waitRecommended || "Waiting is recommended until market conditions improve.";
  }

  return {
    priceAttractive,
    discountReal,
    sellerTrustworthy,
    timingFavorable,
    waitRecommended,
  };
}

function applyDiscountTruthGrounding(
  ctx: Omit<ActivatedMarketContext, "cardLines" | "drawerListingRead" | "expandedLines">,
  discountTruth: ActivatedDiscountTruth | null | undefined
): Omit<ActivatedMarketContext, "cardLines" | "drawerListingRead" | "expandedLines"> {
  if (!discountTruth) return ctx;
  return {
    ...ctx,
    discountReal: discountTruth.explanation,
  };
}

/** Activate existing market context into buyer-facing copy for current UI slots. */
export function activateMarketContext(input: MarketContextInput): ActivatedMarketContext | null {
  if (!hasMarketSources(input)) return null;

  const baseLines = {
    priceAttractive: priceAttractiveLine(input.valueIntelligence),
    discountReal: discountRealLine(input.realDiscount),
    sellerTrustworthy: sellerTrustworthyLine(input.retailerTrust, input.reviewCredibility),
    timingFavorable: timingFavorableLine(
      input.valueIntelligence,
      input.realDiscount,
      input.decisionReadiness,
      input.verdictIntelligence
    ),
    waitRecommended: waitRecommendedLine(
      input.decisionReadiness,
      input.valueIntelligence,
      input.realDiscount,
      input.verdictIntelligence,
      input.decisionBrief
    ),
  };

  const grounded = applyPhase93Grounding(
    applyDiscountTruthGrounding(baseLines, input.discountTruth),
    input.phase93Assessment,
    input.institutionalVerdict
  );
  const { priceAttractive, discountReal, sellerTrustworthy, timingFavorable, waitRecommended } =
    grounded;

  const expandedLines = uniqueLines([
    priceAttractive,
    discountReal,
    sellerTrustworthy,
    timingFavorable,
    waitRecommended,
    input.decisionBrief?.marketStatus,
  ]).slice(0, 5);

  const cardLines = uniqueLines([
    waitRecommended || timingFavorable,
    priceAttractive,
    discountReal,
    sellerTrustworthy,
  ]).slice(0, 2);

  const drawerListingRead = uniqueLines([
    input.decisionBrief?.marketStatus,
    priceAttractive,
    discountReal,
    sellerTrustworthy,
    timingFavorable,
    waitRecommended,
  ])
    .slice(0, 4)
    .join(" ");

  return {
    priceAttractive,
    discountReal,
    sellerTrustworthy,
    timingFavorable,
    waitRecommended,
    cardLines,
    drawerListingRead,
    expandedLines,
  };
}

export function mergeMarketContextSummary(
  summaryLines: string[],
  market: ActivatedMarketContext | null,
  slotCount = 2
): string[] {
  const rows = summaryLines.slice(0, slotCount);
  while (rows.length < slotCount) rows.push("");

  if (!market) return rows;

  if (market.cardLines[0]) rows[1] = market.cardLines[0];
  if (!rows[0] && market.cardLines[1]) rows[0] = market.cardLines[1];

  return rows.slice(0, slotCount);
}

export function mergeMarketContextExpandedLines(
  existingLines: string[],
  market: ActivatedMarketContext | null,
  max = 3
): string[] {
  if (!market) return existingLines.slice(0, max);
  return uniqueLines([...market.expandedLines, ...existingLines]).slice(0, max);
}
