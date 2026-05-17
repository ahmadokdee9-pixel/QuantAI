/**
 * QuantAI Living Commerce — final live decision reconciler.
 * Merges consensus, product understanding, market pulse, discovery role, and unified market signals.
 */

import type { CommerceBrainFinalCode } from "./commerceDecisionBrain";
import type { ConsensusDecision } from "./consensusEngine";
import type { ProductDiscoveryIntelligence } from "./discoveryEngine";
import type { MarketPulseSnapshot } from "./marketPulseEngine";
import type { ProductUnderstanding } from "./productUnderstanding";
import type { UnifiedCardInsight } from "./unifiedMarketMatching";

export type LiveCommerceFinalAction =
  | "STRONG_BUY"
  | "BUY_READY"
  | "SAFE_BUY"
  | "WAIT"
  | "COMPARE"
  | "AVOID";

export type LiveCommerceDecision = {
  finalAction: LiveCommerceFinalAction;
  finalChips: string[];
  analystLine: string;
  marketContextLine: string;
  opportunityScore: number;
  riskReason: string;
  whyThisProduct: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function actionFromBrain(code: CommerceBrainFinalCode): LiveCommerceFinalAction {
  if (code === "AVOID") return "AVOID";
  if (code === "WAIT") return "WAIT";
  if (code === "COMPARE_ALTERNATIVES") return "COMPARE";
  if (code === "STRONG_BUY") return "STRONG_BUY";
  if (code === "BUY_READY") return "BUY_READY";
  return "SAFE_BUY";
}

function chipForAction(action: LiveCommerceFinalAction): string {
  if (action === "STRONG_BUY") return "STRONG BUY";
  if (action === "BUY_READY") return "BUY-READY";
  if (action === "SAFE_BUY") return "SAFE BUY";
  if (action === "WAIT") return "WAIT";
  if (action === "AVOID") return "AVOID";
  return "COMPARE";
}

function addChip(chips: string[], chip: string): void {
  const c = chip.trim().toUpperCase();
  if (!c || chips.includes(c) || chips.length >= 4) return;
  const hasBuy = chips.some((x) => /BUY|SAFE/.test(x));
  if (c.includes("WAIT") && hasBuy) return;
  if (/BUY|SAFE/.test(c) && chips.some((x) => x.includes("WAIT"))) return;
  chips.push(c);
}

export function resolveLiveCommerceDecision(args: {
  brainCode: CommerceBrainFinalCode;
  consensus: ConsensusDecision;
  productUnderstanding?: ProductUnderstanding;
  marketPulse?: MarketPulseSnapshot;
  discovery?: ProductDiscoveryIntelligence;
  unifiedMarket?: UnifiedCardInsight | null;
  baseAnalystLine: string;
}): LiveCommerceDecision {
  const { brainCode, consensus, productUnderstanding, marketPulse, discovery, unifiedMarket, baseAnalystLine } = args;
  const pulse =
    marketPulse ??
    ({
      trendMomentum: "stable",
      discountMomentum: "normal",
      dailyOpportunityScore: 52,
      retailerDiversity: 50,
      marketFreshness: 52,
      marketPulseReason: "Market pulse is neutral.",
    } as MarketPulseSnapshot);
  const role = discovery?.discoveryRole ?? "alternative";
  const puRisk = productUnderstanding?.listingRisk ?? 32;
  let action = actionFromBrain(brainCode);

  if (role === "avoid" || puRisk >= 78) action = "AVOID";
  else if (role === "watch" && action !== "AVOID") action = "WAIT";
  else if (role === "best_match" && action === "SAFE_BUY" && pulse.dailyOpportunityScore >= 64) action = "BUY_READY";
  else if (role === "best_value" && (action === "COMPARE" || action === "SAFE_BUY") && pulse.discountMomentum !== "weak") {
    action = "BUY_READY";
  }
  if (
    (action === "BUY_READY" || action === "SAFE_BUY" || action === "STRONG_BUY") &&
    pulse.discountMomentum === "weak" &&
    pulse.trendMomentum === "cold" &&
    role !== "best_match"
  ) {
    action = "COMPARE";
  }

  const opportunityScore = clamp(
    pulse.dailyOpportunityScore * 0.38 +
      (discovery?.discoveryScore ?? 58) * 0.32 +
      consensus.confidence * 0.18 +
      (unifiedMarket?.isBestTrustedInFamily ? 8 : 0) +
      (role === "avoid" ? -20 : role === "watch" ? -8 : 4),
    0,
    100
  );

  const chips: string[] = [];
  addChip(chips, chipForAction(action));
  if (role === "best_value") addChip(chips, "HIDDEN VALUE");
  if (role === "best_match") addChip(chips, "BEST MATCH");
  if (role === "safe_pick") addChip(chips, "LOW RISK");
  if (pulse.discountMomentum === "exceptional" || pulse.discountMomentum === "strong") addChip(chips, "LIVE DEAL PULSE");
  if (pulse.trendMomentum === "hot" || pulse.trendMomentum === "rising") addChip(chips, "MARKET MOVING");
  if (unifiedMarket?.isBestTrustedInFamily) addChip(chips, "BEST TRUSTED");

  const riskReason =
    action === "AVOID"
      ? discovery?.discoveryReason || "Risk is too high versus the cleaner products in this tray."
      : role === "watch"
        ? "Peer pricing suggests watching before committing."
        : puRisk >= 58
          ? "Listing quality needs a quick sanity check."
          : "No major live risk dominating the decision.";

  const whyThisProduct =
    discovery?.discoveryReason ||
    (unifiedMarket?.isBestTrustedInFamily
      ? "This is the trusted listing inside the matched product family."
      : "This product remains relevant after live market and trust checks.");

  const marketContextLine = `${pulse.marketPulseReason} Opportunity ${Math.round(opportunityScore)}/100.`.slice(0, 180);
  const analystLine =
    action === "WAIT" || action === "AVOID"
      ? `${riskReason} ${marketContextLine}`.slice(0, 280)
      : `${baseAnalystLine} ${marketContextLine}`.trim().slice(0, 280);

  return {
    finalAction: action,
    finalChips: chips.slice(0, 4),
    analystLine,
    marketContextLine,
    opportunityScore: Math.round(opportunityScore),
    riskReason: riskReason.slice(0, 180),
    whyThisProduct: whyThisProduct.slice(0, 180),
  };
}
