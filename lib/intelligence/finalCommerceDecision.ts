/**
 * Card-facing commerce resolution — delegates to `consensusEngine` (single brain) and maps to legacy UI shape.
 */

import type { PredictiveTimingSignalTone, QiPredictiveCommerce } from "./commerceAnalysisTypes";
import type { QuantAIDealVerdict, ProductDealIntelligence } from "./dealIntelligenceEngine";
import type { LiveShelfLabel } from "./dealIntelligenceEngine";
import type { MarketAwarenessTray } from "./marketAwareness";
import type { ProductBuyDecision } from "./productBuyDecision";
import type { BuyStance } from "./productBuyDecision";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  buildConsensusDecision,
  type ConsensusFinalAction,
  type ConsensusDecision,
} from "./consensusEngine";

export type FinalCommerceAction = "buy_now" | "wait" | "compare" | "avoid";

export type FinalCommerceDecision = {
  finalAction: FinalCommerceAction;
  primaryVerdict: QuantAIDealVerdict;
  secondaryChips: { label: string; cls: string }[];
  predictiveBadge: { text: string; tone: PredictiveTimingSignalTone } | null;
  contextChip: { label: string; cls: string } | null;
  blockedChips: string[];
  decisionReason: string;
  buySurface: { stance: BuyStance; stanceLabel: string; stanceDetail: string };
  analystLine: string;
  /** Full consensus payload (hidden from layout; available for analytics / future use). */
  consensus: ConsensusDecision;
};

function shelfCls(label: LiveShelfLabel): string {
  switch (label) {
    case "Best Value":
    case "Strong Buy":
    case "Best Discount Today":
    case "Verified Discount":
      return "border-emerald-400/35 bg-emerald-500/[0.12] text-emerald-50/95";
    case "Best Trusted Option":
    case "Safest Buy":
    case "Trusted Discount":
      return "border-cyan-400/30 bg-cyan-500/[0.1] text-cyan-50/95";
    case "Best Price-to-Quality":
      return "border-violet-400/28 bg-violet-500/[0.1] text-violet-50/95";
    case "Compare Alternatives":
      return "border-amber-400/35 bg-amber-500/[0.12] text-amber-50/95";
    case "Wait for Better Price":
    case "Wait Before Buying":
      return "border-rose-400/32 bg-rose-500/[0.1] text-rose-50/95";
    default:
      return "border-white/[0.1] bg-white/[0.06] text-slate-200/90";
  }
}

function marketChipCls(): string {
  return "border-indigo-400/26 bg-indigo-500/[0.09] text-indigo-50/90";
}

function realityWarnChipCls(): string {
  return "border-amber-400/32 bg-amber-500/[0.11] text-amber-50/92";
}

function realityGoodChipCls(): string {
  return "border-teal-400/28 bg-teal-500/[0.1] text-teal-50/92";
}

function neutralSecondaryCls(): string {
  return "border-slate-400/22 bg-slate-500/[0.08] text-slate-100/85";
}

/** Map consensus secondary / accent strings to premium chip styles. */
function chipClsForConsensusLabel(u: string): string {
  if (/SUSPICIOUS|MANIPULATION|MARKETPLACE|LOW TRUST/i.test(u)) return realityWarnChipCls();
  if (/VERIFIED VALUE/i.test(u)) return realityGoodChipCls();
  if (/MARKET HOT|SEASONAL|DEMAND|CLEARANCE|VOLATILE CATEGORY/i.test(u)) return marketChipCls();
  if (/WAIT|PRICE DROP|VOLATILE|COMPARE|VERIFY|CHECK/i.test(u)) return shelfCls("Wait for Better Price");
  if (/BEST VALUE|STRONG|DEAL|DISCOUNT|TRUSTED|SAFE|LOW RISK|BUY-READY/i.test(u)) return shelfCls("Best Value");
  if (/PRICE-TO-QUALITY|PREMIUM/i.test(u)) return shelfCls("Best Price-to-Quality");
  return neutralSecondaryCls();
}

function mapConsensusToFinalAction(a: ConsensusFinalAction): FinalCommerceAction {
  if (a === "avoid") return "avoid";
  if (a === "wait" || a === "watch") return "wait";
  if (a === "buy_now" || a === "strong_buy") return "buy_now";
  return "compare";
}

function verdictFromBadgePrimary(primaryUpper: string): QuantAIDealVerdict {
  const u = primaryUpper.toUpperCase();
  if (u.includes("STRONG")) return "Strong Buy";
  if (u.includes("BEST DEAL")) return "Best Deal Today";
  if (u.includes("TRUSTED DISCOUNT")) return "Trusted Discount";
  if (u.includes("PREMIUM")) return "Premium Pick";
  if (u.includes("PRICE-TO-QUALITY") || u.includes("PRICE TO QUALITY")) return "Best Price-to-Quality";
  if (u.includes("WAIT")) return "Wait For Better Price";
  if (u.includes("SUSPICIOUS")) return "Suspicious Discount";
  if (u.includes("AVOID")) return "Avoid Fake Sale";
  if (u.includes("SAFE")) return "Safe Buy";
  return "Safe Buy";
}

function buildBuySurface(
  consensusAction: ConsensusFinalAction,
  mapped: FinalCommerceAction,
  buy: ProductBuyDecision,
  pred?: QiPredictiveCommerce
): FinalCommerceDecision["buySurface"] {
  if (mapped === "avoid") {
    return { stance: "avoid", stanceLabel: "Avoid for now", stanceDetail: buy.stanceDetail };
  }
  if (mapped === "wait") {
    const label =
      consensusAction === "watch"
        ? "Watch price movement"
        : pred?.predictiveTimingLabel?.trim() || buy.stanceLabel;
    const detail = pred?.narrative?.trim() || buy.stanceDetail;
    return { stance: "wait", stanceLabel: label, stanceDetail: detail.slice(0, 280) };
  }
  if (mapped === "buy_now") {
    return {
      stance: "buy",
      stanceLabel: /value/i.test(buy.stanceLabel) ? buy.stanceLabel : "Buy-ready",
      stanceDetail: buy.stanceDetail,
    };
  }
  const compareLabel = consensusAction === "review" ? "Review listing" : "Compare";
  return {
    stance: "compare",
    stanceLabel: compareLabel,
    stanceDetail: buy.stanceDetail,
  };
}

export function resolveFinalCommerceDecision(args: {
  product: QuantProduct;
  list: QuantProduct[];
  dealIntel: ProductDealIntelligence;
  buyDecision: ProductBuyDecision;
  rank: number;
  qiRounded: number;
  market: MarketAwarenessTray;
}): FinalCommerceDecision {
  const { product: p, list, dealIntel: deal, buyDecision: buy, rank, qiRounded: qi, market } = args;

  const consensus = buildConsensusDecision({
    product: p,
    list,
    dealIntel: deal,
    buyDecision: buy,
    market,
    rank,
    qiRounded: qi,
  });

  const mappedAction = mapConsensusToFinalAction(consensus.finalAction);
  const primaryVerdict = verdictFromBadgePrimary(consensus.badgeSet[0] ?? "SAFE BUY");

  const secondaryLabels = consensus.badgeSet.slice(1, 3);
  const secondaryChips = secondaryLabels.map((raw) => {
    const label = raw.toUpperCase();
    return { label, cls: chipClsForConsensusLabel(label) };
  });

  const contextRaw = consensus.badgeSet[3];
  const contextChip = contextRaw
    ? { label: contextRaw.toUpperCase(), cls: chipClsForConsensusLabel(contextRaw) }
    : null;

  const buySurface = buildBuySurface(consensus.finalAction, mappedAction, buy, p.qiPredictive);

  return {
    finalAction: mappedAction,
    primaryVerdict,
    secondaryChips,
    predictiveBadge: consensus.timingBadge,
    contextChip,
    blockedChips: [],
    decisionReason: consensus.consensusReason,
    buySurface,
    analystLine: consensus.analystLine,
    consensus,
  };
}
