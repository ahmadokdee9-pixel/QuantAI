/**
 * Card-facing commerce resolution — consensus engine + Commerce Brain v1 (single verdict chip).
 */

import type { PredictiveTimingSignalTone } from "./commerceAnalysisTypes";
import type { QuantAIDealVerdict, ProductDealIntelligence } from "./dealIntelligenceEngine";
import type { MarketAwarenessTray } from "./marketAwareness";
import type { ProductBuyDecision } from "./productBuyDecision";
import type { BuyStance } from "./productBuyDecision";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import { analystQueryStrategistSuffix, type HumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import { buildConsensusDecision, type ConsensusDecision } from "./consensusEngine";
import {
  buildCommerceTimingSupportLine,
  buildNeutralCommerceChips,
  resolveCommerceBrainSurface,
  type CommerceBrainSurface,
  type CommerceBrainFinalCode,
} from "./commerceDecisionBrain";
import type { GlobalCommerceAction } from "./globalCommerceFoundation";
import { resolveLiveCommerceDecision } from "./liveCommerceDecision";

export type FinalCommerceAction = "buy_now" | "wait" | "compare" | "avoid";

export type FinalCommerceDecision = {
  finalAction: FinalCommerceAction;
  /** Legacy deal-verdict family for exports / memo compatibility. */
  primaryVerdict: QuantAIDealVerdict;
  /** Single user-facing verdict (Commerce Brain v1). */
  commerceBrainCode: CommerceBrainFinalCode;
  commerceBrainChipLabel: string;
  secondaryChips: { label: string; cls: string }[];
  predictiveBadge: { text: string; tone: PredictiveTimingSignalTone } | null;
  contextChip: { label: string; cls: string } | null;
  blockedChips: string[];
  decisionReason: string;
  buySurface: { stance: BuyStance; stanceLabel: string; stanceDetail: string };
  analystLine: string;
  marketContextLine: string;
  opportunityScore: number;
  riskReason: string;
  whyThisProduct: string;
  /** Full consensus payload (hidden from layout; available for analytics / future use). */
  consensus: ConsensusDecision;
};

function mapCommerceCodeToLegacyVerdict(code: CommerceBrainFinalCode): QuantAIDealVerdict {
  switch (code) {
    case "STRONG_BUY":
      return "Strong Buy";
    case "BUY_READY":
    case "SAFE_BUY":
      return "Safe Buy";
    case "WAIT":
      return "Wait For Better Price";
    case "COMPARE_ALTERNATIVES":
      return "Best Price-to-Quality";
    case "AVOID":
      return "Avoid Fake Sale";
    default:
      return "Safe Buy";
  }
}

function mapCommerceCodeToFinalAction(code: CommerceBrainFinalCode): FinalCommerceAction {
  if (code === "AVOID") return "avoid";
  if (code === "WAIT") return "wait";
  if (code === "COMPARE_ALTERNATIVES") return "compare";
  return "buy_now";
}

function reconcileWithGlobalFoundation(
  brain: CommerceBrainSurface,
  foundationAction: GlobalCommerceAction | undefined,
  foundationLine: string | undefined
): CommerceBrainSurface {
  if (!foundationAction) return brain;
  const detail = (foundationLine || brain.stanceDetail).slice(0, 280);
  if (foundationAction === "AVOID" && brain.code !== "AVOID") {
    return { code: "AVOID", chipLabel: "AVOID", stance: "avoid", stanceLabel: "Avoid", stanceDetail: detail };
  }
  if (foundationAction === "WAIT" && (brain.code === "BUY_READY" || brain.code === "STRONG_BUY" || brain.code === "SAFE_BUY")) {
    return { code: "WAIT", chipLabel: "WAIT", stance: "wait", stanceLabel: "Wait", stanceDetail: detail };
  }
  if (foundationAction === "COMPARE" && (brain.code === "BUY_READY" || brain.code === "STRONG_BUY")) {
    return {
      code: "COMPARE_ALTERNATIVES",
      chipLabel: "COMPARE ALTERNATIVES",
      stance: "compare",
      stanceLabel: "Compare alternatives",
      stanceDetail: detail,
    };
  }
  return brain;
}

function liveChipClass(label: string): string {
  const u = label.toUpperCase();
  if (u.includes("HIDDEN VALUE") || u.includes("BEST MATCH") || u.includes("BEST TRUSTED")) {
    return "border-emerald-400/28 bg-emerald-500/[0.1] text-emerald-50/92";
  }
  if (u.includes("LIVE DEAL") || u.includes("MARKET MOVING")) {
    return "border-indigo-400/26 bg-indigo-500/[0.09] text-indigo-50/90";
  }
  if (u.includes("LOW RISK")) {
    return "border-teal-400/28 bg-teal-500/[0.1] text-teal-50/92";
  }
  return "border-slate-400/22 bg-slate-500/[0.08] text-slate-100/85";
}

export function resolveFinalCommerceDecision(args: {
  product: QuantProduct;
  list: QuantProduct[];
  dealIntel: ProductDealIntelligence;
  buyDecision: ProductBuyDecision;
  rank: number;
  qiRounded: number;
  market: MarketAwarenessTray;
  humanSearchIntent?: HumanSearchIntent | null;
  searchQuery?: string;
}): FinalCommerceDecision {
  const { product: p, list, dealIntel: deal, buyDecision: buy, rank, qiRounded: qi, market, humanSearchIntent, searchQuery = "" } = args;

  const consensus = buildConsensusDecision({
    product: p,
    list,
    dealIntel: deal,
    buyDecision: buy,
    market,
    rank,
    qiRounded: qi,
    searchQuery,
  });

  const trust = getStoreTrustScore(p.store);
  const weak = p.qiRealityTrust?.weakRetailer ?? trust < 56;

  const brainBase = resolveCommerceBrainSurface({
    finalAction: consensus.finalAction,
    qiRounded: qi,
    trustScore: trust,
    weakRetailer: weak,
    buyStanceLabel: buy.stanceLabel,
    buyStanceDetail: buy.stanceDetail,
    pred: p.qiPredictive,
  });
  const brain = reconcileWithGlobalFoundation(
    brainBase,
    p.qiGlobalCommerce?.decision.action,
    p.qiGlobalCommerce?.decision.analystLine
  );

  const secondaryChips = buildNeutralCommerceChips(consensus.badgeSet);
  const supportingTimingLine = buildCommerceTimingSupportLine({
    code: brain.code,
    deal,
    pred: p.qiPredictive,
    market,
  });

  const strategist = analystQueryStrategistSuffix(humanSearchIntent ?? null);
  let analystLine = `${consensus.analystLine}${strategist}`.trim();
  if (p.qiGlobalCommerce?.decision.action === "AVOID" && brain.code === "AVOID") {
    analystLine = p.qiGlobalCommerce.decision.analystLine;
  }
  if (supportingTimingLine) {
    analystLine = `${analystLine} ${supportingTimingLine}`.slice(0, 280);
  } else {
    analystLine = analystLine.slice(0, 280);
  }

  const live = resolveLiveCommerceDecision({
    brainCode: brain.code,
    consensus,
    productUnderstanding: p.qiProductUnderstanding,
    marketPulse: p.qiMarketPulse,
    discovery: p.qiDiscovery,
    unifiedMarket: null,
    baseAnalystLine: analystLine,
  });

  const liveChipSet = new Set(live.finalChips.map((x) => x.toUpperCase()));
  const liveSecondary = [
    ...live.finalChips.slice(1).map((label) => ({ label, cls: liveChipClass(label) })),
    ...secondaryChips.filter((chip) => !liveChipSet.has(chip.label.toUpperCase())),
  ].slice(0, 3);
  const livePrimary = live.finalChips[0] ?? brain.chipLabel;
  const finalBrainCode =
    live.finalAction === "AVOID"
      ? "AVOID"
      : live.finalAction === "WAIT"
        ? "WAIT"
        : live.finalAction === "COMPARE"
          ? "COMPARE_ALTERNATIVES"
          : live.finalAction === "STRONG_BUY"
            ? "STRONG_BUY"
            : live.finalAction === "BUY_READY"
              ? "BUY_READY"
              : "SAFE_BUY";

  return {
    finalAction: mapCommerceCodeToFinalAction(finalBrainCode),
    primaryVerdict: mapCommerceCodeToLegacyVerdict(finalBrainCode),
    commerceBrainCode: finalBrainCode,
    commerceBrainChipLabel: livePrimary,
    secondaryChips: liveSecondary,
    predictiveBadge: consensus.timingBadge,
    contextChip: null,
    blockedChips: [],
    decisionReason: live.riskReason || consensus.consensusReason,
    buySurface: {
      stance: finalBrainCode === "AVOID" ? "avoid" : finalBrainCode === "WAIT" ? "wait" : finalBrainCode === "COMPARE_ALTERNATIVES" ? "compare" : "buy",
      stanceLabel: finalBrainCode === "AVOID" ? "Avoid" : finalBrainCode === "WAIT" ? "Wait" : finalBrainCode === "COMPARE_ALTERNATIVES" ? "Compare alternatives" : brain.stanceLabel,
      stanceDetail: live.whyThisProduct || brain.stanceDetail,
    },
    analystLine: live.analystLine,
    marketContextLine: live.marketContextLine,
    opportunityScore: live.opportunityScore,
    riskReason: live.riskReason,
    whyThisProduct: live.whyThisProduct,
    consensus,
  };
}
