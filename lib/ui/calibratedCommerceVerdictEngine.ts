/**
 * Phase 39 — Calibrated Commerce Verdict Engine.
 * Buy-first · compare reduction · distribution targeting · confidence alignment.
 */

import { recoverBuyReadyIfMissing, assessTrayValidity } from "@/lib/intelligence/buyReadyRecoveryEngine";
import type { BestDealDominanceResult } from "@/lib/intelligence/bestDealDominanceEngine";
import { calibrateConfidenceForVerdict } from "@/lib/intelligence/confidenceCalibrationEngine";
import type { CalibratedConfidence } from "@/lib/intelligence/confidenceCalibrationEngine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { OpportunityPriorityV2 } from "@/lib/intelligence/opportunityPriorityEngineV2";
import { resolveContradictions } from "@/lib/intelligence/noContradictionEngine";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { ShopperIntentProfile } from "@/lib/intelligence/shopperIntentModeEngine";
import { intentModeBuyBoost } from "@/lib/intelligence/shopperIntentModeEngine";
import { buildWaitExplanation, waitIsJustified } from "@/lib/intelligence/waitExplanationEngine";
import type { WaitExplanation } from "@/lib/intelligence/waitExplanationEngine";
import type { WaitPrediction } from "@/lib/intelligence/waitPredictionEngine";
import type { CommercePriceHistoryIntelligence } from "@/lib/intelligence/commercePriceHistoryEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CommercePriorityLabel } from "@/lib/ui/commerceDominanceVerdictEngine";
import { isLikelyDealPriorityLabel } from "@/lib/truth/truthLanguagePolicy";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

export type CalibratedVerdictRow = {
  link: string;
  verdict: PrimaryVerdict;
  commercePriorityLabel: CommercePriorityLabel;
  calibratedConfidence: CalibratedConfidence;
  opportunityV2: OpportunityPriorityV2;
  realDiscountV3: RealDiscountValidationV3;
  waitExplanation?: WaitExplanation;
  obviousWinner: boolean;
  closeToPeers: boolean;
  spreadScore: number;
  rankIndex: number;
  gapFromTop: number;
  traySize: number;
  buyRecoveryMessage?: string;
};

const PRICE_CLOSE_PCT = 8;
const VALUE_CLOSE_PCT = 10;
const QUALITY_CLOSE_PCT = 10;

function countVerdict(map: Map<string, PrimaryVerdict>, verdict: PrimaryVerdict): number {
  return [...map.values()].filter((v) => v === verdict).length;
}

function pctDiff(a: number, b: number): number {
  if (b <= 0) return 100;
  return Math.abs((a - b) / b) * 100;
}

function isSevereAvoid(args: {
  globalPrice: GlobalPriceIntelligence;
  merchantTrust: MerchantTrustSignal;
  buyOpportunity: GlobalBuyOpportunity;
  hasSuperiorAlternative: boolean;
  realDiscount: RealDiscountValidationV3;
}): boolean {
  return (
    (args.globalPrice.priceLabel === "OVERPRICED" &&
      args.globalPrice.priceAdvantagePct <= -18 &&
      args.merchantTrust.trustScore < 48) ||
    (args.merchantTrust.trustScore < 28 && args.buyOpportunity.sellerScore < 30) ||
    (args.hasSuperiorAlternative &&
      args.globalPrice.priceAdvantagePct <= -12 &&
      args.merchantTrust.trustScore < 50 &&
      args.realDiscount.fakeDiscountScoreHigh)
  );
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
  return missingTitle || missingPrice || missingTrust || !intel;
}

function priorityLabel(
  verdict: PrimaryVerdict,
  isBestDeal: boolean
): CommercePriorityLabel {
  if (verdict === "INSUFFICIENT DATA") return "INSUFFICIENT DATA";
  if (verdict === "AVOID") return "AVOID";
  if (verdict === "WAIT") return "WAIT";
  if (verdict === "COMPARE") return "COMPARE";
  if (isBestDeal && verdict === "BUY READY") return "LIKELY DEAL SIGNAL";
  return "CONFIDENCE-BASED BUY SIGNAL";
}

function peersAreClose(args: {
  price: number;
  valueScore: number;
  qualityScore: number;
  leaderPrice: number;
  leaderValue: number;
  leaderQuality: number;
}): boolean {
  return (
    pctDiff(args.price, args.leaderPrice) < PRICE_CLOSE_PCT &&
    Math.abs(args.valueScore - args.leaderValue) < VALUE_CLOSE_PCT &&
    Math.abs(args.qualityScore - args.leaderQuality) < QUALITY_CLOSE_PCT
  );
}

function trustedFairPrice(args: {
  globalPrice: GlobalPriceIntelligence;
  merchantTrust: MerchantTrustSignal;
  realDiscount: RealDiscountValidationV3;
}): boolean {
  return (
    args.globalPrice.priceFairnessScore >= 50 &&
    args.merchantTrust.trustScore >= 55 &&
    !args.realDiscount.fakeDiscountScoreHigh
  );
}

/** Assign calibrated buy-first verdicts with compare reduction and distribution targets. */
export function assignCalibratedCommerceVerdicts(args: {
  decisions: Map<string, UniversalProductDecision>;
  buyOpportunityByLink: Map<string, GlobalBuyOpportunity>;
  globalPriceByLink: Map<string, GlobalPriceIntelligence>;
  merchantTrustByLink: Map<string, MerchantTrustSignal>;
  waitPredictionByLink: Map<string, WaitPrediction>;
  priceHistoryByLink: Map<string, CommercePriceHistoryIntelligence>;
  opportunityV2ByLink: Map<string, OpportunityPriorityV2>;
  realDiscountV3ByLink: Map<string, RealDiscountValidationV3>;
  intent: ShopperIntentProfile;
  hasSuperiorAlternativeByLink: Map<string, boolean>;
  productsByLink: Map<string, { product: { title: string; price: number; link: string }; searchQuery: string }>;
  bestDealDominance: BestDealDominanceResult;
}): Map<string, CalibratedVerdictRow> {
  const {
    decisions,
    buyOpportunityByLink,
    globalPriceByLink,
    merchantTrustByLink,
    waitPredictionByLink,
    priceHistoryByLink,
    opportunityV2ByLink,
    realDiscountV3ByLink,
    intent,
    hasSuperiorAlternativeByLink,
    productsByLink,
    bestDealDominance,
  } = args;

  type RankRow = {
    link: string;
    price: number;
    score: number;
    valueScore: number;
    qualityScore: number;
    avoid: boolean;
    insufficient: boolean;
    opportunityV2: OpportunityPriorityV2;
    realDiscount: RealDiscountValidationV3;
    waitExplanation?: WaitExplanation;
    waitJustified: boolean;
    fairTrusted: boolean;
  };

  const ranked: RankRow[] = [];

  for (const [link, decision] of decisions) {
    const buy = buyOpportunityByLink.get(link);
    const price = globalPriceByLink.get(link);
    const trust = merchantTrustByLink.get(link);
    const opportunityV2 = opportunityV2ByLink.get(link);
    const realDiscount = realDiscountV3ByLink.get(link);
    const product = productsByLink.get(link)?.product;

    if (!buy || !price || !trust || !opportunityV2 || !realDiscount || !product) {
      ranked.push({
        link,
        price: product?.price ?? 0,
        score: 0,
        valueScore: 0,
        qualityScore: 0,
        avoid: false,
        insufficient: true,
        opportunityV2: opportunityV2 ?? {
          version: 2,
          opportunityScore: 0,
          priceAdvantageComponent: 0,
          qualityAdvantageComponent: 0,
          merchantTrustComponent: 0,
          discountRealityComponent: 0,
          marketPositionComponent: 0,
          autoBuyReady: false,
          headline: "Insufficient data",
        },
        realDiscount: realDiscount ?? {
          version: 3,
          fakeDiscountScore: 100,
          realDiscountScore: 0,
          fakeDiscountScoreHigh: true,
          reasoning: "Insufficient discount data.",
        },
        waitJustified: false,
        fairTrusted: false,
      });
      continue;
    }

    const wait = waitPredictionByLink.get(link);
    const priceHistory = priceHistoryByLink.get(link);
    const waitExplanation = wait ? buildWaitExplanation(wait) : undefined;
    const waitJustified = wait
      ? waitIsJustified({
          wait,
          medianPrice: price.medianMarketPrice,
          priceHistoryElevated: priceHistory?.label === "Elevated Price",
          seasonalApproaching: Boolean(
            priceHistory?.seasonalHint?.toLowerCase().includes("promo") ||
              priceHistory?.seasonalHint?.toLowerCase().includes("holiday")
          ),
        })
      : false;

    let score =
      opportunityV2.opportunityScore +
      intentModeBuyBoost(intent.primaryMode, {
        priceAdvantagePct: price.priceAdvantagePct,
        qualityScore: buy.qualityScore,
        discountStrength: realDiscount.realDiscountScore,
        trustScore: trust.trustScore,
      });

    if (opportunityV2.autoBuyReady) score += 14;
    if (buy.buyNowEligible || buy.valueLedBuy) score += 10;
    if (trustedFairPrice({ globalPrice: price, merchantTrust: trust, realDiscount })) score += 8;

    ranked.push({
      link,
      price: product.price,
      score,
      valueScore: buy.valueScore,
      qualityScore: buy.qualityScore,
      avoid: isSevereAvoid({
        globalPrice: price,
        merchantTrust: trust,
        buyOpportunity: buy,
        hasSuperiorAlternative: hasSuperiorAlternativeByLink.get(link) ?? false,
        realDiscount,
      }),
      insufficient: hasInsufficientData({ decision, merchantTrust: trust, globalPrice: price }),
      opportunityV2,
      realDiscount,
      waitExplanation,
      waitJustified,
      fairTrusted: trustedFairPrice({ globalPrice: price, merchantTrust: trust, realDiscount }),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const leader = ranked.find((r) => !r.avoid && !r.insufficient);
  const leaderPrice = leader?.price ?? 0;
  const leaderValue = leader?.valueScore ?? 0;
  const leaderQuality = leader?.qualityScore ?? 0;

  const assignments = new Map<string, PrimaryVerdict>();
  for (const row of ranked) {
    if (row.insufficient) assignments.set(row.link, "INSUFFICIENT DATA");
    else if (row.avoid) assignments.set(row.link, "AVOID");
  }

  const actionable = ranked.filter((r) => !r.avoid && !r.insufficient);
  const actionableCount = actionable.length;

  const targetBuyMin = Math.ceil(actionableCount * 0.5);
  const targetBuyMax = Math.ceil(actionableCount * 0.7);
  const targetCompareMax = Math.ceil(actionableCount * 0.3);
  const targetWaitMax = Math.ceil(actionableCount * 0.2);

  if (actionableCount > 0 && leader) {
    assignments.set(leader.link, "BUY READY");

    for (const row of actionable.slice(1)) {
      const closeToPeers = peersAreClose({
        price: row.price,
        valueScore: row.valueScore,
        qualityScore: row.qualityScore,
        leaderPrice,
        leaderValue,
        leaderQuality,
      });

      const buyCount = countVerdict(assignments, "BUY READY");
      const compareCount = countVerdict(assignments, "COMPARE");
      const waitCount = countVerdict(assignments, "WAIT");

      if (row.waitJustified && waitCount < targetWaitMax && buyCount >= targetBuyMin) {
        assignments.set(row.link, "WAIT");
      } else if (
        row.opportunityV2.autoBuyReady ||
        row.fairTrusted ||
        !closeToPeers ||
        buyCount < targetBuyMin
      ) {
        assignments.set(row.link, "BUY READY");
      } else if (closeToPeers && compareCount < targetCompareMax && buyCount >= targetBuyMin) {
        assignments.set(row.link, "COMPARE");
      } else if (buyCount < targetBuyMax) {
        assignments.set(row.link, "BUY READY");
      } else {
        assignments.set(row.link, "COMPARE");
      }
    }
  }

  // Rebalance: promote COMPARE/WAIT to BUY READY if under target
  while (countVerdict(assignments, "BUY READY") < targetBuyMin) {
    const candidate = actionable.find(
      (r) => assignments.get(r.link) === "COMPARE" || assignments.get(r.link) === "WAIT"
    );
    if (!candidate) break;
    assignments.set(candidate.link, "BUY READY");
  }

  const validity = assessTrayValidity(decisions, productsByLink);
  const recovery = recoverBuyReadyIfMissing({
    assignments,
    rankedLinks: ranked.map((r) => r.link),
    validity,
    opportunityScoreByLink: new Map(ranked.map((r) => [r.link, r.score])),
  });

  const result = new Map<string, CalibratedVerdictRow>();

  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i]!;
    let verdict = assignments.get(row.link) ?? (row.avoid ? "AVOID" : row.insufficient ? "INSUFFICIENT DATA" : "BUY READY");

    const closeToPeers = leader
      ? peersAreClose({
          price: row.price,
          valueScore: row.valueScore,
          qualityScore: row.qualityScore,
          leaderPrice,
          leaderValue,
          leaderQuality,
        })
      : false;

    const obviousWinner = Boolean(leader && row.link === leader.link && !closeToPeers && row.score >= topScore * 0.92);

    const strongBuy =
      verdict === "BUY READY" &&
      row.opportunityV2.opportunityScore >= 72 &&
      row.opportunityV2.autoBuyReady &&
      row.realDiscount.realDiscountScore >= 52;

    let calibratedConfidence = calibrateConfidenceForVerdict({
      verdict,
      rawScore: row.score,
      strongBuy,
      rankBoost: Math.max(0, 8 - i),
    });

    const resolved = resolveContradictions({
      verdict,
      confidence: calibratedConfidence,
      waitExplanation: row.waitExplanation,
      hasObviousWinner: obviousWinner && verdict === "COMPARE",
      trustedFairPrice: row.fairTrusted && verdict === "AVOID",
    });

    verdict = resolved.verdict;
    calibratedConfidence = resolved.confidence;

    if (resolved.promoted && verdict === "BUY READY") {
      calibratedConfidence = calibrateConfidenceForVerdict({
        verdict,
        rawScore: row.score,
        strongBuy,
        rankBoost: Math.max(0, 8 - i),
      });
    }

    const isBestDeal =
      bestDealDominance.tiedLinks.includes(row.link) &&
      verdict === "BUY READY" &&
      row.link === bestDealDominance.bestDealLink;

    result.set(row.link, {
      link: row.link,
      verdict,
      commercePriorityLabel: priorityLabel(verdict, isBestDeal),
      calibratedConfidence,
      opportunityV2: row.opportunityV2,
      realDiscountV3: row.realDiscount,
      waitExplanation: verdict === "WAIT" ? row.waitExplanation : undefined,
      obviousWinner,
      closeToPeers,
      spreadScore: row.score,
      rankIndex: i,
      gapFromTop: topScore - row.score,
      traySize: ranked.length,
      buyRecoveryMessage: row.link === recovery.link ? recovery.message : undefined,
    });
  }

  return result;
}

export function calibratedVerdictDistribution(
  authority: Map<string, CalibratedVerdictRow>
): Record<PrimaryVerdict, number> & { bestDealFound: number; strongBuy: number; alignedConfidence: number } {
  const dist = {
    "BUY READY": 0,
    WAIT: 0,
    COMPARE: 0,
    AVOID: 0,
    "INSUFFICIENT DATA": 0,
    bestDealFound: 0,
    strongBuy: 0,
    alignedConfidence: 0,
  } as Record<PrimaryVerdict, number> & { bestDealFound: number; strongBuy: number; alignedConfidence: number };

  for (const row of authority.values()) {
    dist[row.verdict] += 1;
    if (isLikelyDealPriorityLabel(row.commercePriorityLabel)) dist.bestDealFound += 1;
    if (row.calibratedConfidence.band === "STRONG BUY") dist.strongBuy += 1;
    if (row.calibratedConfidence.aligned) dist.alignedConfidence += 1;
  }
  return dist;
}

export function allBuyReadyConfidenceAligned(authority: Map<string, CalibratedVerdictRow>): boolean {
  for (const row of authority.values()) {
    if (row.verdict === "BUY READY" && row.calibratedConfidence.confidence < 70) return false;
  }
  return true;
}
