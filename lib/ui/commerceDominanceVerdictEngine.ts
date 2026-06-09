/**
 * Phase 38 — Commerce Dominance Verdict Engine.
 * Buy-first philosophy · INSUFFICIENT DATA ≠ WAIT · uncertainty ≠ AVOID.
 */

import { recoverBuyReadyIfMissing, assessTrayValidity } from "@/lib/intelligence/buyReadyRecoveryEngine";
import type { BestDealFoundAssessment } from "@/lib/intelligence/bestDealFoundEngine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { ShopperIntentProfile } from "@/lib/intelligence/shopperIntentModeEngine";
import { intentModeBuyBoost } from "@/lib/intelligence/shopperIntentModeEngine";
import type { WaitPrediction } from "@/lib/intelligence/waitPredictionEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import type { PreferenceVerdictRow } from "@/lib/ui/preferenceVerdictEngine";
import { isLikelyDealPriorityLabel } from "@/lib/truth/truthLanguagePolicy";

export type CommercePriorityLabel =
  | "LIKELY DEAL SIGNAL"
  | "CONFIDENCE-BASED BUY SIGNAL"
  | "BEST DEAL FOUND"
  | "BUY READY"
  | "COMPARE"
  | "WAIT"
  | "INSUFFICIENT DATA"
  | "AVOID";

export type CommerceDominanceVerdictRow = PreferenceVerdictRow & {
  commercePriorityLabel: CommercePriorityLabel;
  buyRecoveryMessage?: string;
};

function countVerdict(map: Map<string, PrimaryVerdict>, verdict: PrimaryVerdict): number {
  return [...map.values()].filter((v) => v === verdict).length;
}

function hasInsufficientData(args: {
  decision: UniversalProductDecision;
  merchantTrust: MerchantTrustSignal;
  globalPrice: GlobalPriceIntelligence;
}): boolean {
  const intel = args.decision.productIntelligence;
  const missingTitle = !args.decision.link;
  const missingPrice = args.globalPrice.medianMarketPrice <= 0 && args.globalPrice.lowestPriceFound <= 0;
  const missingTrust = args.merchantTrust.trustScore <= 0;
  const missingIntel = !intel;
  return missingTitle || missingPrice || missingTrust || missingIntel;
}

function isSevereAvoid(args: {
  globalPrice: GlobalPriceIntelligence;
  merchantTrust: MerchantTrustSignal;
  buyOpportunity: GlobalBuyOpportunity;
  hasSuperiorAlternative: boolean;
}): boolean {
  return (
    (args.globalPrice.priceLabel === "OVERPRICED" &&
      args.globalPrice.priceAdvantagePct <= -15 &&
      args.merchantTrust.trustScore < 50) ||
    (args.merchantTrust.trustScore < 32 && args.buyOpportunity.sellerScore < 35) ||
    (args.hasSuperiorAlternative &&
      args.globalPrice.priceAdvantagePct <= -10 &&
      args.merchantTrust.trustScore < 55)
  );
}

function priorityLabel(
  verdict: PrimaryVerdict,
  bestDeal: BestDealFoundAssessment
): CommercePriorityLabel {
  if (verdict === "INSUFFICIENT DATA") return "INSUFFICIENT DATA";
  if (verdict === "AVOID") return "AVOID";
  if (verdict === "WAIT") return "WAIT";
  if (verdict === "COMPARE") return "COMPARE";
  if (bestDeal.isBestDealFound) return "BEST DEAL FOUND";
  return "BUY READY";
}

/** Assign buy-first commerce dominance verdicts — product/offer level only. */
export function assignCommerceDominanceVerdicts(args: {
  decisions: Map<string, UniversalProductDecision>;
  buyOpportunityByLink: Map<string, GlobalBuyOpportunity>;
  globalPriceByLink: Map<string, GlobalPriceIntelligence>;
  merchantTrustByLink: Map<string, MerchantTrustSignal>;
  bestDealByLink: Map<string, BestDealFoundAssessment>;
  waitPredictionByLink: Map<string, WaitPrediction>;
  intent: ShopperIntentProfile;
  hasSuperiorAlternativeByLink: Map<string, boolean>;
  productsByLink: Map<string, { product: { title: string; price: number; link: string }; searchQuery: string }>;
}): Map<string, CommerceDominanceVerdictRow> {
  const {
    decisions,
    buyOpportunityByLink,
    globalPriceByLink,
    merchantTrustByLink,
    bestDealByLink,
    waitPredictionByLink,
    intent,
    hasSuperiorAlternativeByLink,
    productsByLink,
  } = args;

  const ranked = [...decisions.entries()]
    .map(([link, decision]) => {
      const buy = buyOpportunityByLink.get(link);
      const price = globalPriceByLink.get(link);
      const trust = merchantTrustByLink.get(link);
      if (!buy || !price || !trust) {
        return { link, score: 0, avoid: false, insufficient: true, spreadScore: 0, rankIndex: 0, gapFromTop: 0 };
      }

      let score =
        buy.buyOpportunityScore +
        intentModeBuyBoost(intent.primaryMode, {
          priceAdvantagePct: price.priceAdvantagePct,
          qualityScore: buy.qualityScore,
          discountStrength: bestDealByLink.get(link)?.verifiedSavingsPct ?? 0,
          trustScore: trust.trustScore,
        });

      if (buy.valueLedBuy) score += 12;
      if (buy.buyNowEligible) score += 8;
      if (price.priceFairnessScore >= 55 && trust.trustScore >= 58) score += 6;

      const insufficient = hasInsufficientData({ decision, merchantTrust: trust, globalPrice: price });
      const avoid = isSevereAvoid({
        globalPrice: price,
        merchantTrust: trust,
        buyOpportunity: buy,
        hasSuperiorAlternative: hasSuperiorAlternativeByLink.get(link) ?? false,
      });

      return { link, score, avoid, insufficient, spreadScore: score, rankIndex: 0, gapFromTop: 0 };
    })
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score ?? 0;
  ranked.forEach((row, i) => {
    row.rankIndex = i;
    row.gapFromTop = topScore - row.score;
  });

  const assignments = new Map<string, PrimaryVerdict>();
  const actionable = ranked.filter((r) => !r.avoid && !r.insufficient);
  const insufficientRows = ranked.filter((r) => r.insufficient);
  const avoidRows = ranked.filter((r) => r.avoid);

  for (const row of insufficientRows) assignments.set(row.link, "INSUFFICIENT DATA");
  for (const row of avoidRows) assignments.set(row.link, "AVOID");

  const actionableCount = actionable.length;
  const maxBuy = actionableCount >= 6 ? Math.min(5, Math.max(2, Math.ceil(actionableCount * 0.28))) : Math.max(1, actionableCount);

  if (actionableCount > 0) {
    const leader = actionable[0]!;
    assignments.set(leader.link, "BUY READY");

    for (const row of actionable.slice(1)) {
      const buy = buyOpportunityByLink.get(row.link)!;
      const price = globalPriceByLink.get(row.link)!;
      const wait = waitPredictionByLink.get(row.link);
      const idx = actionable.indexOf(row);
      const percentile = actionableCount > 1 ? idx / (actionableCount - 1) : 0;

      if (
        countVerdict(assignments, "BUY READY") < maxBuy &&
        (buy.buyNowEligible || buy.valueLedBuy || price.priceFairnessScore >= 52) &&
        row.score >= leader.score * 0.8
      ) {
        assignments.set(row.link, "BUY READY");
      } else if (wait?.waitValid && percentile > 0.65 && countVerdict(assignments, "WAIT") < Math.ceil(actionableCount * 0.15)) {
        assignments.set(row.link, "WAIT");
      } else if (percentile <= 0.7) {
        assignments.set(row.link, "COMPARE");
      } else if (wait?.waitValid) {
        assignments.set(row.link, "WAIT");
      } else {
        assignments.set(row.link, "BUY READY");
      }
    }
  }

  const validity = assessTrayValidity(decisions, productsByLink);
  const recovery = recoverBuyReadyIfMissing({
    assignments,
    rankedLinks: ranked.map((r) => r.link),
    validity,
    opportunityScoreByLink: new Map(ranked.map((r) => [r.link, r.score])),
  });

  const result = new Map<string, CommerceDominanceVerdictRow>();
  for (const row of ranked) {
    const verdict = assignments.get(row.link) ?? (row.avoid ? "AVOID" : row.insufficient ? "INSUFFICIENT DATA" : "COMPARE");
    const bestDeal = bestDealByLink.get(row.link)!;
    result.set(row.link, {
      link: row.link,
      verdict,
      spreadScore: row.spreadScore,
      rankIndex: row.rankIndex,
      gapFromTop: row.gapFromTop,
      traySize: ranked.length,
      buyRecoveryMessage: row.link === recovery.link ? recovery.message : undefined,
      commercePriorityLabel: priorityLabel(verdict, bestDeal),
    });
  }

  return result;
}

export function commerceDominanceVerdictDistribution(
  authority: Map<string, CommerceDominanceVerdictRow>
): Record<PrimaryVerdict, number> & { bestDealFound: number; insufficientData: number } {
  const dist = {
    "BUY READY": 0,
    WAIT: 0,
    COMPARE: 0,
    AVOID: 0,
    "INSUFFICIENT DATA": 0,
    bestDealFound: 0,
    insufficientData: 0,
  } as Record<PrimaryVerdict, number> & { bestDealFound: number; insufficientData: number };

  for (const row of authority.values()) {
    dist[row.verdict] += 1;
    if (isLikelyDealPriorityLabel(row.commercePriorityLabel)) dist.bestDealFound += 1;
    if (row.verdict === "INSUFFICIENT DATA") dist.insufficientData += 1;
  }
  return dist;
}
