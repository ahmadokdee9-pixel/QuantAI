/**
 * Phase 23.0 — Unified Decision Intelligence Engine.
 * Synthesizes layers 14–22 into one final buying recommendation (presentation only).
 */

import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCategoryIntelligence } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedCommerceCoverage } from "@/lib/ui/commerceCoverageActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { ActivatedIntentIntelligence } from "@/lib/ui/intentIntelligenceActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import type { ActivatedTrustRisk } from "@/lib/ui/trustRiskActivation";

export type FinalDecision = "BUY_NOW" | "WAIT" | "COMPARE" | "AVOID";

export type DecisionFactorSupport = "buy" | "wait" | "compare" | "avoid" | "neutral";

export type DecisionFactor = {
  key: string;
  label: string;
  weight: number;
  support: DecisionFactorSupport;
  line: string;
};

export type ActivatedUnifiedDecision = {
  finalDecision: FinalDecision;
  finalConfidence: number;
  finalReasoning: string;
  decisionFactors: DecisionFactor[];
  decisionSummary: string;
  cardLine: string;
  expandedLines: string[];
};

export type UnifiedDecisionInput = {
  institutionalVerdict: PrimaryVerdict;
  isLeadProduct: boolean;
  rankingRationaleLine?: string;
  commerceCoverage?: ActivatedCommerceCoverage | null;
  discountTruth: ActivatedDiscountTruth;
  buyWait: ActivatedBuyWait;
  priceTarget: ActivatedPriceTarget;
  alternativeAdvantage: ActivatedAlternativeAdvantage;
  categoryIntelligence: ActivatedCategoryIntelligence;
  intentIntelligence: ActivatedIntentIntelligence;
  trustRisk: ActivatedTrustRisk;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function decisionLabel(decision: FinalDecision): string {
  switch (decision) {
    case "BUY_NOW":
      return "Buy now";
    case "WAIT":
      return "Wait";
    case "COMPARE":
      return "Compare";
    case "AVOID":
      return "Avoid";
  }
}

function isGenuineDiscount(discountTruth: ActivatedDiscountTruth): boolean {
  return discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine";
}

function isInflatedDiscount(discountTruth: ActivatedDiscountTruth): boolean {
  return discountTruth.verdict === "Inflated" || discountTruth.verdict === "Likely Inflated";
}

function collectDecisionFactors(input: UnifiedDecisionInput): DecisionFactor[] {
  const factors: DecisionFactor[] = [];
  const {
    institutionalVerdict,
    isLeadProduct,
    rankingRationaleLine,
    commerceCoverage,
    discountTruth,
    buyWait,
    priceTarget,
    alternativeAdvantage,
    categoryIntelligence,
    intentIntelligence,
    trustRisk,
  } = input;

  if (institutionalVerdict === "AVOID") {
    factors.push({
      key: "institutional_avoid",
      label: "Institutional verdict",
      weight: 92,
      support: "avoid",
      line: "Institutional checks flag this listing as unsafe to buy.",
    });
  } else if (institutionalVerdict === "WAIT") {
    factors.push({
      key: "institutional_wait",
      label: "Institutional verdict",
      weight: 78,
      support: "wait",
      line: "Institutional posture recommends waiting before checkout.",
    });
  } else if (institutionalVerdict === "BUY READY" && isLeadProduct) {
    factors.push({
      key: "institutional_buy_ready",
      label: "Institutional verdict",
      weight: 72,
      support: "buy",
      line: "Institutional verdict marks this lead as buy-ready.",
    });
  } else if (institutionalVerdict === "COMPARE" || !isLeadProduct) {
    factors.push({
      key: "institutional_compare",
      label: "Tray posture",
      weight: isLeadProduct ? 48 : 62,
      support: "compare",
      line: isLeadProduct
        ? "Tray posture favors comparing before committing."
        : "This listing is not the lead pick — compare alternatives first.",
    });
  }

  if (rankingRationaleLine?.includes("Ranked first") && isLeadProduct) {
    factors.push({
      key: "ranking_lead",
      label: "Ranking rationale",
      weight: 58,
      support: "buy",
      line: clipLine(rankingRationaleLine, 96),
    });
  }

  if (commerceCoverage && commerceCoverage.merchantCount >= 2) {
    const aboveLowest =
      commerceCoverage.lowestPrice > 0 &&
      priceTarget.targetBuyPrice > 0 &&
      priceTarget.targetBuyPrice <= commerceCoverage.lowestPrice * 1.02;
    factors.push({
      key: "commerce_coverage",
      label: "Commerce coverage",
      weight: aboveLowest ? 44 : 56,
      support: aboveLowest ? "buy" : "compare",
      line: aboveLowest
        ? `${commerceCoverage.merchantCount} merchants tracked — pricing is near the market low.`
        : `${commerceCoverage.merchantCount} merchants tracked — stronger offers may exist nearby.`,
    });
  }

  if (isGenuineDiscount(discountTruth)) {
    factors.push({
      key: "discount_genuine",
      label: "Discount truth",
      weight: clampScore(52 + discountTruth.confidence * 0.35),
      support: "buy",
      line: clipLine(discountTruth.reason || discountTruth.explanation, 96),
    });
  } else if (isInflatedDiscount(discountTruth)) {
    factors.push({
      key: "discount_inflated",
      label: "Discount truth",
      weight: clampScore(58 + discountTruth.confidence * 0.25),
      support: trustRisk.trustScore < 58 ? "avoid" : "wait",
      line: clipLine(discountTruth.reason || discountTruth.explanation, 96),
    });
  } else if (discountTruth.verdict === "Uncertain") {
    factors.push({
      key: "discount_uncertain",
      label: "Discount truth",
      weight: 42,
      support: "wait",
      line: clipLine(discountTruth.reason || "Discount authenticity is uncertain.", 96),
    });
  }

  if (buyWait.verdict === "BUY NOW") {
    factors.push({
      key: "timing_buy_now",
      label: "Buy vs wait",
      weight: clampScore(50 + buyWait.confidence * 0.4),
      support: "buy",
      line: clipLine(buyWait.reason || buyWait.explanation, 96),
    });
  } else if (buyWait.verdict === "WAIT") {
    factors.push({
      key: "timing_wait",
      label: "Buy vs wait",
      weight: clampScore(54 + buyWait.confidence * 0.35),
      support: "wait",
      line: clipLine(buyWait.reason || buyWait.explanation, 96),
    });
  } else {
    factors.push({
      key: "timing_compare",
      label: "Buy vs wait",
      weight: clampScore(46 + buyWait.confidence * 0.3),
      support: "compare",
      line: clipLine(buyWait.reason || buyWait.explanation, 96),
    });
  }

  if (priceTarget.potentialSavings >= 20 && priceTarget.opportunityScore >= 50 && (priceTarget.distanceFromLowPct ?? 0) > 10) {
    factors.push({
      key: "price_target_wait",
      label: "Price target",
      weight: clampScore(48 + priceTarget.opportunityScore * 0.35),
      support: "wait",
      line: clipLine(
        priceTarget.reason ||
          `Target ${priceTarget.targetBuyPriceLabel} could save ${priceTarget.potentialSavingsLabel}.`,
        96
      ),
    });
  } else if ((priceTarget.distanceFromLowPct ?? 99) <= 6 || priceTarget.opportunityScore <= 35) {
    factors.push({
      key: "price_target_buy",
      label: "Price target",
      weight: clampScore(44 + (100 - priceTarget.opportunityScore) * 0.25),
      support: "buy",
      line: clipLine(priceTarget.reason || priceTarget.explanation, 96),
    });
  }

  if (isLeadProduct && alternativeAdvantage.leadAdvantageScore >= 58) {
    factors.push({
      key: "alternative_lead",
      label: "Alternative advantage",
      weight: clampScore(40 + alternativeAdvantage.leadAdvantageScore * 0.35),
      support: "buy",
      line: clipLine(
        alternativeAdvantage.comparisonSummary ||
          alternativeAdvantage.advantageReasons[0] ||
          "Lead advantage is clear versus nearby alternatives.",
        96
      ),
    });
  } else if (!isLeadProduct || alternativeAdvantage.leadAdvantageScore < 42) {
    factors.push({
      key: "alternative_compare",
      label: "Alternative advantage",
      weight: clampScore(46 + (100 - alternativeAdvantage.leadAdvantageScore) * 0.2),
      support: "compare",
      line: clipLine(
        alternativeAdvantage.comparisonSummary ||
          "A stronger nearby alternative may exist in this tray.",
        96
      ),
    });
  }

  if (categoryIntelligence.categoryScore >= 62) {
    factors.push({
      key: "category_strength",
      label: "Category intelligence",
      weight: clampScore(36 + categoryIntelligence.categoryScore * 0.25),
      support: "buy",
      line: clipLine(
        categoryIntelligence.categoryStrengths[0] ||
          `${categoryIntelligence.segment ?? "Category"} fit score ${categoryIntelligence.categoryScore}/100.`,
        96
      ),
    });
  } else if (categoryIntelligence.categoryScore < 45) {
    factors.push({
      key: "category_weakness",
      label: "Category intelligence",
      weight: clampScore(40 + (100 - categoryIntelligence.categoryScore) * 0.2),
      support: "compare",
      line: clipLine(
        categoryIntelligence.categoryWeaknesses[0] ||
          `${categoryIntelligence.segment ?? "Category"} fit is limited for this listing.`,
        96
      ),
    });
  }

  if (intentIntelligence.intentMatchScore >= 62) {
    factors.push({
      key: "intent_strong",
      label: "Intent intelligence",
      weight: clampScore(42 + intentIntelligence.intentMatchScore * 0.35),
      support: "buy",
      line: clipLine(intentIntelligence.matchExplanation || intentIntelligence.cardLine, 96),
    });
  } else if (intentIntelligence.intentMatchScore < 42) {
    factors.push({
      key: "intent_weak",
      label: "Intent intelligence",
      weight: clampScore(38 + (100 - intentIntelligence.intentMatchScore) * 0.2),
      support: "compare",
      line: clipLine(intentIntelligence.matchExplanation || "Search intent fit is limited.", 96),
    });
  }

  if (trustRisk.trustScore >= 68 && trustRisk.riskScore <= 45) {
    factors.push({
      key: "trust_strong",
      label: "Trust & risk",
      weight: clampScore(48 + trustRisk.trustScore * 0.25),
      support: "buy",
      line: clipLine(trustRisk.trustReason, 96),
    });
  } else if (trustRisk.trustScore < 48 || trustRisk.riskScore >= 68) {
    factors.push({
      key: "trust_weak",
      label: "Trust & risk",
      weight: clampScore(56 + trustRisk.riskScore * 0.25),
      support: trustRisk.riskScore >= 72 || trustRisk.trustScore < 42 ? "avoid" : "wait",
      line: clipLine(trustRisk.riskReason || trustRisk.trustReason, 96),
    });
  }

  if (trustRisk.factors.suspiciousOfferRisk >= 72) {
    factors.push({
      key: "suspicious_offer",
      label: "Suspicious offer risk",
      weight: clampScore(60 + trustRisk.factors.suspiciousOfferRisk * 0.3),
      support: "avoid",
      line: "Suspicious offer signals outweigh pricing appeal.",
    });
  }

  return factors;
}

type DirectionTotals = Record<Exclude<DecisionFactorSupport, "neutral">, number>;

function sumDirectionWeights(factors: DecisionFactor[]): DirectionTotals {
  const totals: DirectionTotals = { buy: 0, wait: 0, compare: 0, avoid: 0 };
  for (const factor of factors) {
    if (factor.support === "neutral") continue;
    totals[factor.support] += factor.weight;
  }
  return totals;
}

function supportingFactors(
  factors: DecisionFactor[],
  decision: FinalDecision
): DecisionFactor[] {
  const supportMap: Record<FinalDecision, DecisionFactorSupport[]> = {
    BUY_NOW: ["buy"],
    WAIT: ["wait"],
    COMPARE: ["compare"],
    AVOID: ["avoid"],
  };
  const allowed = new Set(supportMap[decision]);
  return factors
    .filter((factor) => allowed.has(factor.support))
    .sort((a, b) => b.weight - a.weight);
}

function resolveFinalDecision(
  input: UnifiedDecisionInput,
  factors: DecisionFactor[],
  totals: DirectionTotals
): FinalDecision {
  const {
    institutionalVerdict,
    isLeadProduct,
    discountTruth,
    buyWait,
    priceTarget,
    trustRisk,
    intentIntelligence,
    commerceCoverage,
    alternativeAdvantage,
  } = input;

  const hardAvoid =
    institutionalVerdict === "AVOID" ||
    trustRisk.trustScore < 42 ||
    trustRisk.riskScore >= 78 ||
    trustRisk.factors.suspiciousOfferRisk >= 80 ||
    (isInflatedDiscount(discountTruth) &&
      (trustRisk.trustScore < 55 || trustRisk.riskScore >= 62));

  if (hardAvoid) return "AVOID";

  const priceFarAboveTarget =
    priceTarget.potentialSavings >= 20 &&
    priceTarget.opportunityScore >= 50 &&
    (priceTarget.distanceFromLowPct ?? 0) > 10;

  if (priceFarAboveTarget) return "WAIT";

  const hardWait =
    institutionalVerdict === "WAIT" ||
    buyWait.verdict === "WAIT" ||
    (priceTarget.potentialSavings >= 30 &&
      priceTarget.opportunityScore >= 55 &&
      (priceTarget.distanceFromLowPct ?? 0) > 12);

  if (hardWait && totals.wait + 20 >= totals.buy) return "WAIT";

  const strongAlternative =
    !isLeadProduct ||
    (commerceCoverage &&
      commerceCoverage.merchantCount >= 2 &&
      alternativeAdvantage.leadAdvantageScore < 50 &&
      buyWait.verdict === "COMPARE");

  if (
    strongAlternative &&
    (totals.compare >= totals.buy + 8 || institutionalVerdict === "COMPARE" || !isLeadProduct)
  ) {
    return "COMPARE";
  }

  const buyReady =
    isLeadProduct &&
    isGenuineDiscount(discountTruth) &&
    trustRisk.trustScore >= 62 &&
    trustRisk.riskScore <= 50 &&
    intentIntelligence.intentMatchScore >= 55 &&
    (buyWait.verdict === "BUY NOW" ||
      (priceTarget.distanceFromLowPct ?? 99) <= 6 ||
      priceTarget.opportunityScore <= 38);

  if (buyReady && totals.buy >= Math.max(totals.wait, totals.compare, totals.avoid)) {
    return "BUY_NOW";
  }

  const ranked: FinalDecision[] = ["AVOID", "WAIT", "COMPARE", "BUY_NOW"];
  const scoreByDecision: Record<FinalDecision, number> = {
    AVOID: totals.avoid,
    WAIT: totals.wait,
    COMPARE: totals.compare,
    BUY_NOW: totals.buy,
  };

  let winner: FinalDecision = "COMPARE";
  let best = -1;
  for (const decision of ranked) {
    const score = scoreByDecision[decision];
    if (score > best) {
      best = score;
      winner = decision;
    }
  }

  if (winner === "BUY_NOW" && !isLeadProduct) return "COMPARE";

  if (
    winner === "BUY_NOW" &&
    trustRisk.riskScore >= 62 &&
    intentIntelligence.intentMatchScore >= 65 &&
    totals.wait + totals.avoid >= totals.buy * 0.55
  ) {
    return trustRisk.riskScore >= 72 ? "AVOID" : "WAIT";
  }

  return winner;
}

function resolveFinalConfidence(
  decision: FinalDecision,
  factors: DecisionFactor[],
  totals: DirectionTotals
): number {
  const supporters = supportingFactors(factors, decision);
  if (!supporters.length) return 52;

  const supportWeight = supporters.reduce((sum, factor) => sum + factor.weight, 0);
  const supportAvg = supportWeight / supporters.length;
  const directionTotal = totals[decision === "BUY_NOW" ? "buy" : decision.toLowerCase() as keyof DirectionTotals];
  const opposition = Object.entries(totals)
    .filter(([key]) => key !== (decision === "BUY_NOW" ? "buy" : decision.toLowerCase()))
    .reduce((sum, [, value]) => sum + value, 0);
  const conflictPenalty = opposition > directionTotal ? Math.min(28, (opposition - directionTotal) * 0.12) : 0;
  const breadthBonus = Math.min(12, supporters.length * 3);
  return clampScore(supportAvg * 0.55 + Math.min(100, directionTotal * 0.45) + breadthBonus - conflictPenalty);
}

function buildFinalReasoning(decision: FinalDecision, factors: DecisionFactor[]): string {
  const supporters = supportingFactors(factors, decision).slice(0, 3);
  if (!supporters.length) {
    return clipLine(`Unified recommendation: ${decisionLabel(decision)} based on mixed tray signals.`, 280);
  }
  const body = supporters.map((factor) => factor.line).join(" ");
  return clipLine(`Unified recommendation: ${decisionLabel(decision)} — ${body}`, 280);
}

function buildDecisionSummary(decision: FinalDecision, confidence: number, factors: DecisionFactor[]): string {
  const leadFactor = supportingFactors(factors, decision)[0];
  const shortReason = leadFactor
    ? clipLine(leadFactor.line, 72)
    : "Signals synthesized across pricing, trust, intent, and alternatives.";
  return clipLine(`${decisionLabel(decision)} · ${confidence}% — ${shortReason}`, 96);
}

export function activateUnifiedDecision(input: UnifiedDecisionInput): ActivatedUnifiedDecision {
  const factors = collectDecisionFactors(input);
  const totals = sumDirectionWeights(factors);
  const finalDecision = resolveFinalDecision(input, factors, totals);
  const finalConfidence = resolveFinalConfidence(finalDecision, factors, totals);
  const finalReasoning = buildFinalReasoning(finalDecision, factors);
  const decisionSummary = buildDecisionSummary(finalDecision, finalConfidence, factors);
  const expandedLines = supportingFactors(factors, finalDecision)
    .slice(0, 3)
    .map((factor) => clipLine(factor.line, 96));
  const cardLine = clipLine(`${decisionLabel(finalDecision)} · ${finalConfidence}% unified`, 72);

  return {
    finalDecision,
    finalConfidence,
    finalReasoning,
    decisionFactors: factors,
    decisionSummary,
    cardLine,
    expandedLines,
  };
}

export function mergeUnifiedDecisionSummary(
  summaryLines: string[],
  unified: ActivatedUnifiedDecision | null,
  max = 2
): string[] {
  if (!unified?.decisionSummary) return summaryLines.slice(0, max);
  const line = clipLine(unified.decisionSummary, 96);
  const merged = summaryLines.filter((item) => item !== line);
  if (merged.length < max) {
    merged.push(line);
    return merged.slice(0, max);
  }
  merged[max - 1] = line;
  return merged.slice(0, max);
}

export function mergeUnifiedDecisionExpandedSignals(
  existingLines: string[],
  unified: ActivatedUnifiedDecision | null,
  max = 3
): string[] {
  if (!unified?.cardLine) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [unified.cardLine, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}

export function mergeUnifiedDecisionExpandedLines(
  existingLines: string[],
  unified: ActivatedUnifiedDecision | null,
  max = 3
): string[] {
  if (!unified?.finalReasoning) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [unified.finalReasoning, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}
