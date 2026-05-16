/**
 * QuantAI Commerce Decision Brain v1 — one final verdict + non-contradictory timing context.
 */

import type { QiPredictiveCommerce } from "@/lib/intelligence/commerceAnalysisTypes";
import type { ProductDealIntelligence } from "@/lib/intelligence/dealIntelligenceEngine";
import type { ConsensusFinalAction } from "@/lib/intelligence/consensusEngine";
import type { BuyStance } from "@/lib/intelligence/productBuyDecision";
import type { MarketAwarenessTray } from "@/lib/intelligence/marketAwareness";

export type CommerceBrainFinalCode =
  | "BUY_READY"
  | "STRONG_BUY"
  | "SAFE_BUY"
  | "WAIT"
  | "COMPARE_ALTERNATIVES"
  | "AVOID";

const LABEL: Record<CommerceBrainFinalCode, string> = {
  BUY_READY: "BUY-READY",
  STRONG_BUY: "STRONG BUY",
  SAFE_BUY: "SAFE BUY",
  WAIT: "WAIT",
  COMPARE_ALTERNATIVES: "COMPARE ALTERNATIVES",
  AVOID: "AVOID",
};

export type CommerceBrainSurface = {
  code: CommerceBrainFinalCode;
  /** Uppercase chip label */
  chipLabel: string;
  stance: BuyStance;
  stanceLabel: string;
  stanceDetail: string;
};

function mapActionToCode(action: ConsensusFinalAction, qi: number, trust: number, weak: boolean): CommerceBrainFinalCode {
  if (action === "avoid") return "AVOID";
  if (action === "wait" || action === "watch") return "WAIT";
  if (action === "compare" || action === "review") return "COMPARE_ALTERNATIVES";
  if (action === "strong_buy") return "STRONG_BUY";
  if (action === "buy_now") {
    if (weak || trust < 60) return "SAFE_BUY";
    if (qi >= 76 && trust >= 70) return "BUY_READY";
    return "SAFE_BUY";
  }
  return "COMPARE_ALTERNATIVES";
}

export function resolveCommerceBrainSurface(args: {
  finalAction: ConsensusFinalAction;
  qiRounded: number;
  trustScore: number;
  weakRetailer: boolean;
  buyStanceLabel: string;
  buyStanceDetail: string;
  pred?: QiPredictiveCommerce;
}): CommerceBrainSurface {
  const { finalAction, qiRounded: qi, trustScore: trust, weakRetailer: weak, buyStanceLabel, buyStanceDetail, pred } = args;
  const code = mapActionToCode(finalAction, qi, trust, weak);
  const chipLabel = LABEL[code];

  if (code === "AVOID") {
    return {
      code,
      chipLabel,
      stance: "avoid",
      stanceLabel: "Avoid",
      stanceDetail: buyStanceDetail.slice(0, 280),
    };
  }
  if (code === "WAIT") {
    const label = pred?.predictiveTimingLabel?.trim() || "Wait";
    const detail = (pred?.narrative?.trim() || buyStanceDetail).slice(0, 280);
    return { code, chipLabel, stance: "wait", stanceLabel: label, stanceDetail: detail };
  }
  if (code === "COMPARE_ALTERNATIVES") {
    return {
      code,
      chipLabel,
      stance: "compare",
      stanceLabel: "Compare alternatives",
      stanceDetail: buyStanceDetail.slice(0, 280),
    };
  }
  if (code === "STRONG_BUY") {
    return {
      code,
      chipLabel,
      stance: "buy",
      stanceLabel: "Strong buy",
      stanceDetail: buyStanceDetail.slice(0, 280),
    };
  }
  if (code === "BUY_READY") {
    return {
      code,
      chipLabel,
      stance: "buy",
      stanceLabel: "Buy-ready",
      stanceDetail: buyStanceDetail.slice(0, 280),
    };
  }
  return {
    code,
    chipLabel,
    stance: "buy",
    stanceLabel: buyStanceLabel.toLowerCase().includes("value") ? buyStanceLabel : "Safe buy",
    stanceDetail: buyStanceDetail.slice(0, 280),
  };
}

/** Soft timing / market copy — never overrides `code`; omit lines that fight the verdict. */
export function buildCommerceTimingSupportLine(args: {
  code: CommerceBrainFinalCode;
  deal: ProductDealIntelligence;
  pred?: QiPredictiveCommerce;
  market: MarketAwarenessTray;
}): string | null {
  const { code, deal, pred, market } = args;
  if (code === "AVOID") return null;
  const parts: string[] = [];
  const move = pred?.likelyPriceMove;
  if (code === "WAIT" || code === "COMPARE_ALTERNATIVES") {
    if (move === "drop") parts.push("price may soften");
    else if (move === "stable") parts.push("pricing fairly stable");
    else if (move === "rise") parts.push("upside price pressure");
    if (deal.suspiciousDiscountRisk >= 0.45 || deal.fakeDiscountRisk === "high") parts.push("discount may be staged");
    else if (deal.hasDiscount && deal.fakeDiscountRisk === "low") parts.push("markdown looks credible");
    if (market.categoryVolatility === "high") parts.push("volatile category");
    else if (market.marketHeat === "hot" || market.marketHeat === "overheated") parts.push("demand warm");
  } else {
    if (move === "stable") parts.push("price likely stable");
    else if (move === "rise") parts.push("price may firm");
    else if (move === "drop") parts.push("softening possible—still acceptable entry");
    if (deal.hasDiscount) {
      if (deal.fakeDiscountRisk === "high" || deal.suspiciousDiscountRisk >= 0.5) parts.push("verify anchor vs peers");
      else parts.push("discount reads authentic");
    }
    if (market.marketHeat === "hot" || market.marketHeat === "overheated") parts.push("market hot");
    if (market.categoryVolatility === "high") parts.push("pricing volatile");
    else if (market.categoryVolatility === "low") parts.push("low pricing drama");
  }
  if (parts.length === 0) return null;
  return `Context · ${parts.slice(0, 3).join(" · ")}`.slice(0, 118);
}

/** Secondary chips: non-verdict intel only (max 2). */
export function buildNeutralCommerceChips(consensusBadgeUpper: string[]): { label: string; cls: string }[] {
  const allow = /^(MARKET HOT|SEASONAL DEAL SOON|VERIFIED VALUE|LOW RISK)$/;
  const out: { label: string; cls: string }[] = [];
  for (const raw of consensusBadgeUpper) {
    const u = raw.toUpperCase();
    if (!allow.test(u)) continue;
    out.push({ label: u, cls: chipClsNeutral(u) });
    if (out.length >= 2) break;
  }
  return out;
}

function chipClsNeutral(u: string): string {
  if (u === "MARKET HOT" || u === "SEASONAL DEAL SOON") {
    return "border-indigo-400/26 bg-indigo-500/[0.09] text-indigo-50/90";
  }
  if (u === "VERIFIED VALUE") {
    return "border-teal-400/28 bg-teal-500/[0.1] text-teal-50/92";
  }
  return "border-slate-400/22 bg-slate-500/[0.08] text-slate-100/85";
}

/** Chip chrome for the single Commerce Brain verdict (matches prior premium chip weight). */
export function commerceBrainChipClass(code: CommerceBrainFinalCode): string {
  switch (code) {
    case "STRONG_BUY":
      return "border-emerald-400/32 bg-emerald-500/[0.12] text-emerald-50/95 shadow-[0_0_20px_-8px_rgba(52,211,153,0.28)]";
    case "BUY_READY":
      return "border-emerald-400/28 bg-emerald-500/[0.1] text-emerald-50/95";
    case "SAFE_BUY":
      return "border-cyan-400/30 bg-cyan-500/[0.1] text-cyan-50/95";
    case "WAIT":
      return "border-rose-400/32 bg-rose-500/[0.1] text-rose-50/95";
    case "COMPARE_ALTERNATIVES":
      return "border-amber-400/35 bg-amber-500/[0.12] text-amber-50/95";
    case "AVOID":
      return "border-rose-500/40 bg-rose-950/[0.35] text-rose-100/95";
    default:
      return "border-white/[0.1] bg-white/[0.06] text-slate-200/90";
  }
}
