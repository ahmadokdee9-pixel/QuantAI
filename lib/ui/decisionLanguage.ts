/**

 * Unified QuantAI decision vocabulary — presentation layer only.

 * TRUST → VALUE → single primary verdict (no conflicting labels).

 */



import type { PrimaryDealAction } from "@/lib/deals/types";

import type { DealClusterDTO } from "@/lib/deals/types";

import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";

import type { QuantProduct } from "@/lib/shoppingScore";



export type PrimaryVerdict = "BUY READY" | "WAIT" | "COMPARE" | "AVOID" | "INSUFFICIENT DATA";



export type UnifiedDecision =

  | PrimaryVerdict

  | "STRONG BUY"

  | "CAUTION"

  | "HIGH TRUST"

  | "LOW TRUST"

  | "UNDERVALUED"

  | "OVERPRICED";



export type ValueTier = "undervalued" | "fair" | "overpriced";

export type TrustTier = "high" | "medium" | "low";



function norm(s: string): string {

  return s.replace(/-/g, " ").replace(/\s+/g, " ").trim().toUpperCase();

}



export function toPrimaryVerdict(label: string | UnifiedDecision): PrimaryVerdict {

  const u = norm(String(label));

  if (u.includes("AVOID")) return "AVOID";

  if (u.includes("WAIT")) return "WAIT";

  if (u.includes("COMPARE") || u.includes("CAUTION")) return "COMPARE";

  if (u.includes("BUY") || u.includes("STRONG")) return "BUY READY";

  return "COMPARE";

}



/** Map engine / chip labels to unified decision language. */

export function toUnifiedDecision(label: string): UnifiedDecision | string {

  const u = norm(label);

  if (u.includes("STRONG BUY") || u === "STRONG_BUY") return "STRONG BUY";

  if (u.includes("BUY READY") || u === "BUY_READY" || u.includes("SAFE BUY")) return "BUY READY";

  if (u.includes("AVOID")) return "AVOID";

  if (u.includes("WAIT")) return "WAIT";

  if (u.includes("COMPARE") || u.includes("CAUTION")) return "COMPARE";

  if (u.includes("OVERPRICED")) return "OVERPRICED";

  if (u.includes("UNDERVALUED") || u.includes("HIDDEN VALUE")) return "UNDERVALUED";

  return u.length <= 24 ? u : u.slice(0, 22).trimEnd() + "…";

}



export function trustTierFromScore(trustScore: number, weakRetailer?: boolean): TrustTier {

  if (weakRetailer || trustScore < 52) return "low";

  if (trustScore >= 78) return "high";

  return "medium";

}



export function valueTierFromPosture(posture: string): ValueTier {

  const u = norm(posture);

  if (u.includes("ABOVE") || u.includes("OVERPRICED") || u.includes("WEAK")) return "overpriced";

  if (u.includes("BELOW") || u.includes("UNDER") || u.includes("CREDIBLE MARKDOWN")) return "undervalued";

  if (u.includes("WAIT") || u.includes("MOVE") || u.includes("VERIFY") || u.includes("HYGIENE")) {

    return "overpriced";

  }

  return "fair";

}



/** Single primary verdict from trust + value — no contradictions. */

export function derivePrimaryVerdict(args: {

  trustScore: number;

  weakRetailer?: boolean;

  pricePosture: string;

  suspiciousPrice?: boolean;

  peerCount?: number;

}): PrimaryVerdict {

  const trust = trustTierFromScore(args.trustScore, args.weakRetailer);

  const value = valueTierFromPosture(args.pricePosture);



  if (args.suspiciousPrice || trust === "low") return "AVOID";



  if (trust === "high") {

    if (value === "overpriced") return "WAIT";

    return "BUY READY";

  }



  if (trust === "medium") {

    if (value === "overpriced") return "WAIT";

    if (value === "undervalued") return "COMPARE";

    if ((args.peerCount ?? 0) >= 3) return "COMPARE";

    return "WAIT";

  }



  return "AVOID";

}



export function primaryVerdictReason(

  verdict: PrimaryVerdict,

  trust: TrustTier,

  value: ValueTier

): string {

  switch (verdict) {

    case "BUY READY":
      return value === "undervalued"
        ? "Best value among trusted sellers in this scan."
        : "Price and seller trust support a confident checkout.";

    case "WAIT":
      return value === "overpriced"
        ? "Current price remains above the market average for this tray."
        : "Price timing favors patience — recheck before you commit.";

    case "COMPARE":
      return trust === "medium" && value === "undervalued"
        ? "Strong price from a mixed-trust seller — compare checkout paths."
        : "Multiple competitive offers available — compare before buying.";

    case "AVOID":
      return trust === "low"
        ? "Seller trust score below acceptable threshold for checkout."
        : "Listing quality or pricing is too weak to recommend.";

    case "INSUFFICIENT DATA":
      return "Not enough verified market data yet — compare trusted listings before checkout.";

  }

}



export function trustMicroLabel(trust: TrustTier): string {

  if (trust === "high") return "High trust";

  if (trust === "low") return "Low trust";

  return "Medium trust";

}



/** @deprecated Phase 27+ — legacy tray binding only; display uses confidenceAuthority. */
export function primaryVerdictAlignment(verdict: PrimaryVerdict): number {

  switch (verdict) {

    case "BUY READY":

      return 88;

    case "WAIT":

      return 48;

    case "COMPARE":

      return 62;

    case "AVOID":

      return 24;

    case "INSUFFICIENT DATA":

      return 40;

  }

}

/** Evidence-based fallback confidence when coherence layers are unavailable. */
export function deriveFallbackConfidence(args: {
  trustScore: number;
  peerCount?: number;
  suspiciousPrice?: boolean;
}): number {
  const trust = Math.max(0, Math.min(100, Math.round(args.trustScore)));
  const depth = (args.peerCount ?? 1) >= 4 ? 14 : (args.peerCount ?? 1) >= 2 ? 8 : 4;
  const penalty = args.suspiciousPrice ? 18 : 0;
  return Math.max(8, Math.min(100, Math.round(trust * 0.58 + depth + 12 - penalty)));
}



export function deriveCardDecision(args: {

  trustScore: number;

  weakRetailer?: boolean;

  pricePosture: string;

  suspiciousPrice?: boolean;

  peerCount?: number;

  reasonFallback?: string;

}): {

  verdict: PrimaryVerdict;

  reason: string;

  alignmentScore: number;

  trustMicro: string;

} {

  const trust = trustTierFromScore(args.trustScore, args.weakRetailer);

  const value = valueTierFromPosture(args.pricePosture);

  const verdict = derivePrimaryVerdict(args);

  const reason =

    args.reasonFallback?.trim() ||

    primaryVerdictReason(verdict, trust, value);

  return {

    verdict,

    reason: reason.length > 120 ? `${reason.slice(0, 119).trimEnd()}…` : reason,

    alignmentScore: deriveFallbackConfidence({
      trustScore: args.trustScore,
      peerCount: args.peerCount,
      suspiciousPrice: args.suspiciousPrice,
    }),

    trustMicro: trustMicroLabel(trust),

  };

}



export function confidenceAlignmentLabel(confidence: number): string {

  return `${Math.round(confidence)}% confidence`;

}



export function alignmentVerdictFromScore(score: number): PrimaryVerdict {

  const s = Math.round(Math.min(100, Math.max(0, score)));

  if (s <= 30) return "AVOID";

  if (s <= 55) return "WAIT";

  if (s <= 75) return "COMPARE";

  return "BUY READY";

}



export function winnerStripRiskLabel(confidence: number, weakRetailer?: boolean): string {

  if (weakRetailer || confidence <= 30) return "High";

  if (confidence <= 55) return "Moderate";

  return "Low";

}



export function clusterActionLabel(action: PrimaryDealAction): PrimaryVerdict | string {

  if (action === "buy_now") return "BUY READY";

  if (action === "wait") return "WAIT";

  return "COMPARE";

}



function productByLink(cluster: DealClusterDTO, link: string): QuantProduct | undefined {

  return cluster.listings.find((p) => p.link === link);

}



export function clusterWinner(cluster: DealClusterDTO): { store: string; price: number } | null {

  const link = cluster.picks.bestOverall || cluster.picks.mostTrusted;

  const p = link ? productByLink(cluster, link) : cluster.listings[0];

  if (!p) return null;

  return { store: p.store, price: p.price };

}



export function clusterWhyLine(cluster: DealClusterDTO, max = 120): string {

  const raw =

    cluster.primaryRecommendationReason?.trim() ||

    cluster.advisorSummary?.trim() ||

    "Composite value leads this cluster.";

  if (raw.length <= max) return raw;

  return `${raw.slice(0, max - 1).trimEnd()}…`;

}



export function clusterRiskLine(cluster: DealClusterDTO, max = 100): string {

  if (cluster.suspiciousDiscountCluster) return "Discount anchors unreliable — verify before commit.";

  const raw = cluster.hiddenRisksNote?.trim() || cluster.uncertaintyNote?.trim() || "Standard listing variance.";

  if (raw.length <= max) return raw;

  return `${raw.slice(0, max - 1).trimEnd()}…`;

}



export function dealVerdictUnified(verdict: string): PrimaryVerdict {

  return toPrimaryVerdict(verdict);

}



export function buyingActionToUnified(action?: string): UnifiedDecision | string {

  return toPrimaryVerdict(action ?? "COMPARE");

}



export function trayLeadDecision(products: QuantProduct[]): string {

  const lead = products[0];

  if (!lead) return "SCAN ACTIVE";

  if (lead.qiBuyingDecision?.action) {

    return toPrimaryVerdict(lead.qiBuyingDecision.action);

  }

  return "COMPARE";

}



export function searchIntelActionLabel(

  rec: SearchIntelligenceDTO["finalRecommendation"]

): PrimaryVerdict {

  switch (rec) {

    case "buy_now":

    case "best_trusted_option":

    case "smart_long_term_buy":

      return "BUY READY";

    case "wait":

    case "premium_but_overpriced":

      return "WAIT";

    case "risky_deal":

    case "cheapest_but_risky":

      return "COMPARE";

    default:

      return "COMPARE";

  }

}



/** Read quality signal card copy for analyst tray. */

export function readQualitySignal(args: {

  confidencePct: number;

  uncertainty: number;

  spreadWide?: boolean;

}): { signal: string; confidence: string; reason: string } {

  const pct = Math.round(args.confidencePct);

  const signal = pct >= 72 ? "Strong" : pct >= 48 ? "Medium" : "Thin";

  const reason = args.spreadWide
    ? "Price spread is wide — compare before buying."
    : pct >= 72
      ? "Signals align — confidence is solid for this tray."
      : "Price spread remains wide and seller consistency is weak.";

  return {

    signal,

    confidence: `${pct}/100`,

    reason,

  };

}


