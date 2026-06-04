/**
 * Phase 14.1 — Ranking Rationale Activation Layer.
 * Surfaces existing ranking meta into card and drawer text slots only.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ExecutedRankingMeta } from "@/lib/ranking/controlledRankingExecution";
import type { RankingEngineMeta } from "@/lib/ranking/deterministicRankingEngine";
import type {
  ProductRankingMeta,
  ProductRankingProfile,
} from "@/lib/ranking/productRankingApplication";
import type { RankingSignalsMeta } from "@/lib/ranking/rankingSignalsAggregator";

export type RankingRationaleInput = {
  product: QuantProduct;
  rank: number;
  isLeadProduct: boolean;
  rankingEngine?: RankingEngineMeta | null;
  executedRanking?: ExecutedRankingMeta | null;
  rankingSignals?: RankingSignalsMeta | null;
  productRanking?: ProductRankingMeta | null;
};

export type ActivatedRankingRationale = {
  cardLine: string;
  drawerLine: string;
  expandedLine: string;
};

const ENGINE_REASON_COPY: Record<string, string> = {
  "Trust signals are strong across retailer and review posture.":
    "Ranked first — trust and seller signals lead this tray.",
  "Retailer trust supports confident ranking.":
    "Ranked first — retailer trust supports this order.",
  "Review credibility supports ranking confidence.":
    "Ranked first — review credibility supports this order.",
  "Value signals indicate meaningful value-for-money.":
    "Ranked first — value signals support this order.",
  "Value intelligence supports ranking uplift.":
    "Ranked first — value intelligence supports this order.",
  "Discount posture appears genuine rather than inflated.":
    "Ranked first — discount quality supports this order.",
  "Buyer-fit signals align with the query intent.":
    "Ranked first — buyer-fit signals align with your search.",
  "Brand affinity supports personalized ranking.":
    "Ranked first — brand fit supports this order.",
  "Product attribute affinity is well defined.":
    "Ranked first — product attributes match your search.",
  "Intent confidence is strong enough for ranking.":
    "Ranked first — search confidence supports this order.",
  "Quality signals reinforce ranking readiness.":
    "Ranked first — quality signals support this order.",
  "Trust, value, and confidence signals are aligned.":
    "Ranked first — trust, value, and confidence align.",
  "Composite ranking signal score is strong.":
    "Ranked first — composite ranking signals are strong.",
};

const SIGNAL_STRENGTH_COPY: Record<string, string> = {
  strong_trust_signal: "Trust signals lead the ranking order.",
  trusted_retailer: "Retailer trust supports this ranking position.",
  credible_reviews: "Review credibility supports this ranking position.",
  strong_value_signal: "Value signals support this ranking position.",
  strong_value_intelligence: "Value intelligence supports this ranking position.",
  genuine_discount_signal: "Discount quality supports this ranking position.",
  strong_buyer_fit_signal: "Buyer-fit alignment supports this ranking position.",
  strong_brand_affinity: "Brand fit supports this ranking position.",
  strong_attribute_affinity: "Product attribute fit supports this ranking position.",
  strong_confidence_signal: "Search confidence supports this ranking position.",
  strong_quality_signal: "Quality signals support this ranking position.",
  aligned_ranking_signal_stack: "Trust, value, and confidence align for this order.",
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function humanizeEngineReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) return "";
  if (ENGINE_REASON_COPY[trimmed]) return ENGINE_REASON_COPY[trimmed];
  if (trimmed.toLowerCase().includes("trust signals are strong")) {
    return "Ranked first — trust and seller signals lead this tray.";
  }
  if (trimmed.toLowerCase().includes("trust signals are mixed")) {
    return "Ranked first — compare trust carefully across sellers.";
  }
  return clipLine(trimmed.replace(/\bintelligence\b/gi, "signal"));
}

function humanizeExecutedSummary(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) return "";
  if (/^ranked first/i.test(trimmed)) return clipLine(trimmed);
  return clipLine(`Ranked first — ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`);
}

function humanizeSignalStrength(strength: string): string {
  return clipLine(SIGNAL_STRENGTH_COPY[strength] ?? strength.replace(/_/g, " "));
}

function findProductProfile(
  productRanking: ProductRankingMeta | null | undefined,
  product: QuantProduct
): ProductRankingProfile | null {
  if (!productRanking?.rankingProfile?.length) return null;
  return (
    productRanking.rankingProfile.find(
      (profile) => profile.link === product.link || profile.productId === product.id
    ) ?? null
  );
}

function findRankingChange(
  executedRanking: ExecutedRankingMeta | null | undefined,
  product: QuantProduct
) {
  if (!executedRanking?.rankingChanges?.length) return null;
  return (
    executedRanking.rankingChanges.find(
      (change) => change.link === product.link || change.productId === product.id
    ) ?? null
  );
}

function dominantProfileDimension(profile: ProductRankingProfile): "trust" | "value" | "buyerFit" | "confidence" {
  const scores = [
    { key: "trust" as const, value: profile.trustAdjustment },
    { key: "value" as const, value: profile.valueAdjustment },
    { key: "buyerFit" as const, value: profile.buyerFitAdjustment },
    { key: "confidence" as const, value: profile.confidenceAdjustment },
  ];
  scores.sort((a, b) => b.value - a.value);
  return scores[0]?.key ?? "trust";
}

function buildLeadRankingRationale(input: RankingRationaleInput): string {
  if (input.executedRanking?.executed && input.executedRanking.rankingSummary) {
    return humanizeExecutedSummary(input.executedRanking.rankingSummary);
  }

  const engineReason = input.rankingEngine?.rankingReasons?.[0];
  if (engineReason) return humanizeEngineReason(engineReason);

  const signalStrength = input.rankingSignals?.signalStrengths?.[0];
  if (signalStrength) {
    return clipLine(`Ranked first — ${humanizeSignalStrength(signalStrength)}`);
  }

  const profile = findProductProfile(input.productRanking, input.product);
  if (profile?.rankingReady) {
    const dimension = dominantProfileDimension(profile);
    if (dimension === "trust") return "Ranked first — trust fit leads on this listing.";
    if (dimension === "value") return "Ranked first — value fit leads on this listing.";
    if (dimension === "buyerFit") return "Ranked first — buyer-fit leads on this listing.";
    return "Ranked first — confidence signals lead on this listing.";
  }

  return "";
}

function buildSecondaryRankingRationale(input: RankingRationaleInput): string {
  const change = findRankingChange(input.executedRanking, input.product);
  if (change?.direction === "up" && change.delta > 0) {
    return clipLine(
      `Moved up in order — prepared ranking score is stronger for this listing (${change.delta} place${change.delta === 1 ? "" : "s"}).`
    );
  }
  if (change?.direction === "down" && change.delta > 0) {
    return clipLine(
      "Ranked here — below the tray lead on prepared ranking signals."
    );
  }

  const profile = findProductProfile(input.productRanking, input.product);
  if (profile) {
    const dimension = dominantProfileDimension(profile);
    if (dimension === "trust") {
      return "Ranked here — trust fit is relatively stronger on this listing.";
    }
    if (dimension === "value") {
      return "Ranked here — value fit supports this position in the tray.";
    }
    if (dimension === "buyerFit") {
      return "Ranked here — buyer-fit is relatively stronger on this listing.";
    }
    return "Ranked here — confidence signals support this tray position.";
  }

  const productWarning = input.productRanking?.rankingWarnings?.[0];
  if (productWarning) {
    return clipLine(`Tray position reflects ranking caution — ${productWarning.replace(/\bintelligence\b/gi, "signal")}`);
  }

  if (input.rank > 0) {
    return "Alternative slot — compare this listing against the tray lead before buying.";
  }

  return "";
}

/** Activate existing ranking rationale for card and drawer slots. */
export function activateRankingRationale(input: RankingRationaleInput): ActivatedRankingRationale | null {
  const hasSources = Boolean(
    input.rankingEngine ||
      input.executedRanking ||
      input.rankingSignals ||
      input.productRanking
  );
  if (!hasSources) return null;

  const cardLine = input.isLeadProduct
    ? buildLeadRankingRationale(input)
    : buildSecondaryRankingRationale(input);

  if (!cardLine) return null;

  return {
    cardLine,
    drawerLine: cardLine,
    expandedLine: cardLine,
  };
}

export function mergeRankingRationaleSummary(
  summaryLines: string[],
  rationale: ActivatedRankingRationale | string | null,
  slotCount = 2
): string[] {
  const line =
    typeof rationale === "string"
      ? rationale
      : rationale?.cardLine ?? "";
  const rows = summaryLines.slice(0, slotCount);
  while (rows.length < slotCount) rows.push("");
  if (line) rows[0] = line;
  return rows.slice(0, slotCount);
}

export function mergeRankingRationaleExpandedLines(
  existingLines: string[],
  rationale: ActivatedRankingRationale | null,
  max = 3
): string[] {
  if (!rationale?.expandedLine) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [rationale.expandedLine, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}
