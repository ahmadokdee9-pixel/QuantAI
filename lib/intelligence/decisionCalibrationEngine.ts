/**
 * Phase 43 — Decision Calibration Engine.
 * Evidence-based promotion and safety caps — no confidence inflation.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";

export type DecisionCalibrationDistribution = {
  wait: number;
  compare: number;
  buyReady: number;
  strongBuy: number;
  bestDeal: number;
};

export type DecisionCalibrationInput = {
  link: string;
  rankIndex: number;
  traySize: number;
  coveragePct: number;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
  merchantScore: number;
  discountVerified: boolean;
  fakeDiscount: boolean;
  valueAboveMedian: boolean;
  marketLeading: boolean;
  majorRiskFlags: boolean;
  compositeScore: number;
};

export type DecisionCalibrationResult = {
  version: 1;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
  promotionApplied: string | null;
  capApplied: string | null;
  reasoning: string;
};

const DISTRIBUTION_TARGET = {
  bestDealMaxPct: 0.03,
  strongBuyMaxPct: 0.15,
  buyReadyMaxPct: 0.3,
  compareMaxPct: 0.45,
  waitMaxPct: 0.25,
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function tierToVerdict(tier: CommerceDecisionTier): PrimaryVerdict {
  if (tier === "WAIT") return "WAIT";
  if (tier === "COMPARE") return "COMPARE";
  return "BUY READY";
}

function calibrateConfidence(args: {
  confidence: number;
  tier: CommerceDecisionTier;
  exceptional: boolean;
  coveragePct: number;
}): number {
  let c = args.confidence;

  if (args.coveragePct < 40) {
    c = Math.round(c * 0.88);
  }

  if (!args.exceptional && c > 94) c = 94;
  if (args.exceptional && c > 98) c = 98;

  if (args.tier === "BUY READY" && c < 70) c = 70;
  if (args.tier === "STRONG BUY" && c < 85) c = 85;
  if (args.tier === "BEST DEAL" && c < 90) c = 90;
  if (args.tier === "WAIT" && c > 68) c = 68;
  if (args.tier === "COMPARE" && c > 82) c = 82;

  return clamp(c, 45, args.exceptional ? 98 : 94);
}

function buildReasoning(args: {
  tier: CommerceDecisionTier;
  promotionApplied: string | null;
  capApplied: string | null;
}): string {
  if (args.capApplied === "risky_merchant_cap") {
    return "Merchant trust below threshold — maximum recommendation is compare until trust improves.";
  }
  if (args.capApplied === "fake_discount_cap") {
    return "Discount authenticity failed verification — promotion blocked.";
  }
  if (args.capApplied === "low_coverage_no_best_deal") {
    return "Market coverage is thin — best-deal tier withheld until more merchants are scanned.";
  }
  if (args.capApplied === "low_confidence_wait") {
    return "Confidence too low for purchase — patience advised.";
  }
  if (args.promotionApplied === "compare_to_buy_ready") {
    return "Verified discount, trusted merchant, and strong confidence — calibrated to buy ready.";
  }
  if (args.promotionApplied === "buy_ready_to_strong_buy") {
    return "Verified discount, trusted merchant, coverage, and above-median value — calibrated to strong buy.";
  }
  if (args.promotionApplied === "strong_buy_to_best_deal") {
    return "Rare market-leading opportunity with elite merchant trust and verified discount — best deal.";
  }
  if (args.tier === "BEST DEAL") return "Calibrated best deal — exceptional evidence across trust, discount, and market position.";
  if (args.tier === "STRONG BUY") return "Calibrated strong buy — high-confidence purchase path with verified evidence.";
  if (args.tier === "BUY READY") return "Calibrated buy ready — confident checkout path with balanced evidence.";
  if (args.tier === "WAIT") return "Calibrated wait — insufficient confidence or unfavorable market signals.";
  return "Calibrated compare — good option but alternatives deserve review before checkout.";
}

function deriveEvidenceConfidence(input: DecisionCalibrationInput): number {
  let c = input.confidence;

  if (input.discountVerified) c = Math.max(c, 72);
  if (input.merchantScore >= 75 && input.discountVerified) c = Math.max(c, 80);
  if (input.merchantScore >= 85) c = Math.max(c, 82);
  if (
    input.compositeScore >= 72 &&
    input.merchantScore >= 75 &&
    input.discountVerified &&
    !input.majorRiskFlags
  ) {
    c = Math.max(c, Math.round(input.compositeScore * 0.9));
  }

  return clamp(c, 45, 94);
}

/** Apply Phase 43 calibration rules to a single product decision. */
export function calibrateProductDecision(input: DecisionCalibrationInput): DecisionCalibrationResult {
  let tier = input.tier;
  let verdict = input.verdict;
  let confidence = deriveEvidenceConfidence(input);
  let promotionApplied: string | null = null;
  let capApplied: string | null = null;

  // Rule 8 — fake discount blocks promotion
  if (input.fakeDiscount && tier !== "WAIT") {
    tier = "COMPARE";
    verdict = "COMPARE";
    capApplied = "fake_discount_cap";
  }

  // Rule 4 — risky merchant caps at COMPARE
  if (input.merchantScore < 60 && tier !== "WAIT") {
    tier = "COMPARE";
    verdict = "COMPARE";
    capApplied = "risky_merchant_cap";
  }

  // Rule 7 — strong discount from risky merchant is never BEST DEAL (reinforced)
  if (input.merchantScore < 75 && tier === "BEST DEAL") {
    tier = input.discountVerified && input.merchantScore >= 60 ? "COMPARE" : "WAIT";
    verdict = tierToVerdict(tier);
    capApplied = "risky_merchant_cap";
  }

  // Rule 6 — thin coverage reduces confidence weighting and blocks BEST DEAL
  if (input.coveragePct < 40) {
    confidence = Math.round(confidence * 0.88);
    if (tier === "BEST DEAL") {
      tier = "STRONG BUY";
      verdict = "BUY READY";
      capApplied = capApplied ?? "low_coverage_no_best_deal";
    }
  }

  // Rule 3 — COMPARE → BUY READY when evidence supports
  if (
    tier === "COMPARE" &&
    !input.majorRiskFlags &&
    !input.fakeDiscount &&
    input.discountVerified &&
    ((input.merchantScore >= 75 && confidence >= 80) ||
      (input.merchantScore >= 70 && input.compositeScore >= 70 && confidence >= 75))
  ) {
    tier = "BUY READY";
    verdict = "BUY READY";
    promotionApplied = "compare_to_buy_ready";
  }

  // Rule 1 — BUY READY → STRONG BUY
  if (
    tier === "BUY READY" &&
    input.discountVerified &&
    input.merchantScore >= 75 &&
    confidence >= 85 &&
    input.coveragePct >= 70 &&
    input.valueAboveMedian &&
    !input.majorRiskFlags
  ) {
    tier = "STRONG BUY";
    verdict = "BUY READY";
    promotionApplied = "buy_ready_to_strong_buy";
  }

  // Rule 2 — STRONG BUY → BEST DEAL (extremely rare)
  if (
    tier === "STRONG BUY" &&
    input.discountVerified &&
    input.merchantScore >= 85 &&
    confidence >= 90 &&
    input.coveragePct >= 80 &&
    input.marketLeading &&
    !input.majorRiskFlags &&
    !input.fakeDiscount
  ) {
    tier = "BEST DEAL";
    verdict = "BUY READY";
    promotionApplied = "strong_buy_to_best_deal";
  }

  const exceptional =
    tier === "BEST DEAL" &&
    input.discountVerified &&
    input.merchantScore >= 85 &&
    input.marketLeading;

  confidence = calibrateConfidence({
    confidence,
    tier,
    exceptional,
    coveragePct: input.coveragePct,
  });

  // Rule 5 — low confidence caps at WAIT
  if (confidence < 50) {
    tier = "WAIT";
    verdict = "WAIT";
    capApplied = capApplied ?? "low_confidence_wait";
  }

  return {
    version: 1,
    tier,
    verdict,
    confidence,
    promotionApplied,
    capApplied,
    reasoning: buildReasoning({ tier, promotionApplied, capApplied }),
  };
}

function countTier(map: Map<string, CommerceDecisionTier>, tier: CommerceDecisionTier): number {
  return [...map.values()].filter((t) => t === tier).length;
}

/** Tray-level caps to keep BEST DEAL rare and distribution balanced. */
export function enforceCalibrationDistributionCaps(args: {
  rankedLinks: string[];
  tierByLink: Map<string, CommerceDecisionTier>;
}): Map<string, CommerceDecisionTier> {
  const { rankedLinks, tierByLink } = args;
  const traySize = rankedLinks.length;
  if (traySize === 0) return tierByLink;

  const next = new Map(tierByLink);
  const maxBestDeal = Math.max(1, Math.ceil(traySize * DISTRIBUTION_TARGET.bestDealMaxPct));
  const maxStrongBuy = Math.ceil(traySize * DISTRIBUTION_TARGET.strongBuyMaxPct);
  const maxBuyReady = Math.ceil(traySize * DISTRIBUTION_TARGET.buyReadyMaxPct);

  let bestDeal = countTier(next, "BEST DEAL");
  let strongBuy = countTier(next, "STRONG BUY");
  let buyReady = countTier(next, "BUY READY");

  if (bestDeal > maxBestDeal) {
    for (const link of rankedLinks) {
      if (bestDeal <= maxBestDeal) break;
      if (next.get(link) === "BEST DEAL") {
        next.set(link, "STRONG BUY");
        bestDeal -= 1;
        strongBuy += 1;
      }
    }
  }

  if (strongBuy > maxStrongBuy) {
    for (const link of [...rankedLinks].reverse()) {
      if (strongBuy <= maxStrongBuy) break;
      if (next.get(link) === "STRONG BUY") {
        next.set(link, "BUY READY");
        strongBuy -= 1;
        buyReady += 1;
      }
    }
  }

  if (buyReady > maxBuyReady) {
    for (const link of [...rankedLinks].reverse()) {
      if (buyReady <= maxBuyReady) break;
      if (next.get(link) === "BUY READY") {
        next.set(link, "COMPARE");
        buyReady -= 1;
      }
    }
  }

  return next;
}

/** Promote eligible COMPARE rows when tray is over-compare. Evidence gates only. */
export function rebalanceCalibrationPromotions(args: {
  rankedLinks: string[];
  tierByLink: Map<string, CommerceDecisionTier>;
  inputsByLink: Map<string, DecisionCalibrationInput>;
}): Map<string, CommerceDecisionTier> {
  const { rankedLinks, tierByLink, inputsByLink } = args;
  const traySize = rankedLinks.length;
  if (traySize === 0) return tierByLink;

  const next = new Map(tierByLink);
  const maxCompare = Math.ceil(traySize * DISTRIBUTION_TARGET.compareMaxPct);
  let compareCount = countTier(next, "COMPARE");

  for (const link of rankedLinks) {
    if (compareCount <= maxCompare) break;
    if (next.get(link) !== "COMPARE") continue;

    const input = inputsByLink.get(link);
    if (!input) continue;

    const evidenceConfidence = deriveEvidenceConfidence(input);
    const eligible =
      !input.majorRiskFlags &&
      !input.fakeDiscount &&
      input.merchantScore >= 75 &&
      input.discountVerified &&
      evidenceConfidence >= 80;

    if (!eligible) {
      const compositeEligible =
        !input.majorRiskFlags &&
        !input.fakeDiscount &&
        input.merchantScore >= 70 &&
        input.compositeScore >= 70 &&
        input.discountVerified &&
        evidenceConfidence >= 75;
      if (!compositeEligible) continue;
    }

    next.set(link, "BUY READY");
    compareCount -= 1;

    if (
      input.coveragePct >= 70 &&
      input.valueAboveMedian &&
      evidenceConfidence >= 85
    ) {
      next.set(link, "STRONG BUY");
    }
  }

  return next;
}

export function decisionCalibrationDistributionSummary(
  tierByLink: Map<string, CommerceDecisionTier>
): DecisionCalibrationDistribution {
  const dist = { wait: 0, compare: 0, buyReady: 0, strongBuy: 0, bestDeal: 0 };
  for (const tier of tierByLink.values()) {
    if (tier === "WAIT") dist.wait += 1;
    else if (tier === "COMPARE") dist.compare += 1;
    else if (tier === "BUY READY") dist.buyReady += 1;
    else if (tier === "STRONG BUY") dist.strongBuy += 1;
    else if (tier === "BEST DEAL") dist.bestDeal += 1;
  }
  return dist;
}
