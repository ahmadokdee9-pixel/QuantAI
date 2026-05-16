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
import { buildConsensusDecision, type ConsensusFinalAction, type ConsensusDecision } from "./consensusEngine";
import {
  buildCommerceTimingSupportLine,
  buildNeutralCommerceChips,
  resolveCommerceBrainSurface,
  type CommerceBrainFinalCode,
} from "./commerceDecisionBrain";

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
  /** Full consensus payload (hidden from layout; available for analytics / future use). */
  consensus: ConsensusDecision;
};

function mapConsensusToFinalAction(a: ConsensusFinalAction): FinalCommerceAction {
  if (a === "avoid") return "avoid";
  if (a === "wait" || a === "watch") return "wait";
  if (a === "buy_now" || a === "strong_buy") return "buy_now";
  return "compare";
}

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

  const mappedAction = mapConsensusToFinalAction(consensus.finalAction);
  const trust = getStoreTrustScore(p.store);
  const weak = p.qiRealityTrust?.weakRetailer ?? trust < 56;

  const brain = resolveCommerceBrainSurface({
    finalAction: consensus.finalAction,
    qiRounded: qi,
    trustScore: trust,
    weakRetailer: weak,
    buyStanceLabel: buy.stanceLabel,
    buyStanceDetail: buy.stanceDetail,
    pred: p.qiPredictive,
  });

  const primaryVerdict = mapCommerceCodeToLegacyVerdict(brain.code);
  const secondaryChips = buildNeutralCommerceChips(consensus.badgeSet);
  const supportingTimingLine = buildCommerceTimingSupportLine({
    code: brain.code,
    deal,
    pred: p.qiPredictive,
    market,
  });

  const strategist = analystQueryStrategistSuffix(humanSearchIntent ?? null);
  let analystLine = `${consensus.analystLine}${strategist}`.trim();
  if (supportingTimingLine) {
    analystLine = `${analystLine} ${supportingTimingLine}`.slice(0, 280);
  } else {
    analystLine = analystLine.slice(0, 280);
  }

  return {
    finalAction: mappedAction,
    primaryVerdict,
    commerceBrainCode: brain.code,
    commerceBrainChipLabel: brain.chipLabel,
    secondaryChips,
    predictiveBadge: consensus.timingBadge,
    contextChip: null,
    blockedChips: [],
    decisionReason: consensus.consensusReason,
    buySurface: {
      stance: brain.stance,
      stanceLabel: brain.stanceLabel,
      stanceDetail: brain.stanceDetail,
    },
    analystLine,
    consensus,
  };
}
