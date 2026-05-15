/**
 * Single arbiter for visible commerce chips vs deal engine + stance + predictive + market.
 */

import type { PredictiveTimingSignalTone, QiPredictiveCommerce } from "./commerceAnalysisTypes";
import type { QuantAIDealVerdict, ProductDealIntelligence } from "./dealIntelligenceEngine";
import type { LiveShelfLabel } from "./dealIntelligenceEngine";
import type { MarketAwarenessTray } from "./marketAwareness";
import type { ProductBuyDecision } from "./productBuyDecision";
import type { BuyStance } from "./productBuyDecision";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type FinalCommerceAction = "buy_now" | "wait" | "compare" | "avoid";

export type FinalCommerceDecision = {
  finalAction: FinalCommerceAction;
  primaryVerdict: QuantAIDealVerdict;
  secondaryChips: { label: string; cls: string }[];
  predictiveBadge: { text: string; tone: PredictiveTimingSignalTone } | null;
  marketChip: { label: string; cls: string } | null;
  blockedChips: string[];
  decisionReason: string;
  buySurface: { stance: BuyStance; stanceLabel: string; stanceDetail: string };
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

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

function neutralSecondaryCls(): string {
  return "border-slate-400/22 bg-slate-500/[0.08] text-slate-100/85";
}

function marketChipCls(): string {
  return "border-indigo-400/26 bg-indigo-500/[0.09] text-indigo-50/90";
}

function isBuyVerdict(v: QuantAIDealVerdict): boolean {
  return (
    v === "Strong Buy" ||
    v === "Best Deal Today" ||
    v === "Safe Buy" ||
    v === "Trusted Discount" ||
    v === "Premium Pick" ||
    v === "Best Price-to-Quality"
  );
}

function isWaitVerdict(v: QuantAIDealVerdict): boolean {
  return v === "Wait For Better Price";
}

function extremeValueHold(pred: QiPredictiveCommerce | undefined, trust: number, qi: number, priceVsMed: number): boolean {
  if (!pred) return false;
  return trust >= 80 && qi >= 82 && priceVsMed <= 0.92 && pred.timingConfidence >= 55;
}

function canUseStrongBuy(
  trust: number,
  qi: number,
  pred: QiPredictiveCommerce | undefined,
  priceVsMed: number
): boolean {
  if (qi < 70) return false;
  if (trust < 68) return false;
  if (pred?.likelyPriceMove === "drop" && !extremeValueHold(pred, trust, qi, priceVsMed)) return false;
  if (pred?.likelyPriceMove === "rise") {
    const pp = pred.probabilities?.priceManipulation01 ?? 0.5;
    return trust >= 72 && qi >= 68 && pp < 0.48;
  }
  return true;
}

function pickPrimaryVerdict(args: {
  action: FinalCommerceAction;
  dealVerdict: QuantAIDealVerdict;
  trust: number;
  qi: number;
  pred?: QiPredictiveCommerce;
  priceVsMed: number;
}): { verdict: QuantAIDealVerdict; blocked: string[] } {
  const blocked: string[] = [];
  const { action, dealVerdict, trust, qi, pred, priceVsMed } = args;

  if (action === "avoid") {
    if (dealVerdict === "Suspicious Discount" || dealVerdict === "Avoid Fake Sale") {
      return { verdict: dealVerdict, blocked };
    }
    return { verdict: "Avoid Fake Sale", blocked: [...blocked, dealVerdict] };
  }

  if (action === "wait") {
    blocked.push(...(isBuyVerdict(dealVerdict) ? [dealVerdict] : []));
    return { verdict: "Wait For Better Price", blocked };
  }

  if (action === "compare") {
    blocked.push(...(isBuyVerdict(dealVerdict) ? [dealVerdict] : []));
    if (trust < 56) {
      return { verdict: "Best Price-to-Quality", blocked };
    }
    if (qi >= 62 && trust >= 56) {
      return { verdict: "Best Price-to-Quality", blocked };
    }
    return { verdict: "Wait For Better Price", blocked };
  }

  if (trust < 52) {
    blocked.push(dealVerdict);
    return { verdict: "Trusted Discount", blocked };
  }
  if (trust < 62 && qi >= 66) {
    if (dealVerdict === "Strong Buy") blocked.push("Strong Buy");
    return { verdict: "Safe Buy", blocked };
  }
  if (dealVerdict === "Strong Buy" && !canUseStrongBuy(trust, qi, pred, priceVsMed)) {
    blocked.push("Strong Buy");
    if (trust >= 70 && qi >= 72) return { verdict: "Trusted Discount", blocked };
    return { verdict: "Safe Buy", blocked };
  }
  if (isWaitVerdict(dealVerdict) || dealVerdict === "Avoid Fake Sale") {
    blocked.push(dealVerdict);
    return { verdict: qi >= 74 && trust >= 70 ? "Trusted Discount" : "Safe Buy", blocked };
  }
  if (dealVerdict === "Strong Buy" && canUseStrongBuy(trust, qi, pred, priceVsMed)) {
    return { verdict: "Strong Buy", blocked };
  }
  if (isBuyVerdict(dealVerdict)) {
    return { verdict: dealVerdict, blocked };
  }
  return { verdict: trust >= 68 ? "Trusted Discount" : "Safe Buy", blocked: [...blocked, dealVerdict] };
}

function filterPredictiveBadge(
  action: FinalCommerceAction,
  pred?: QiPredictiveCommerce
): { text: string; tone: PredictiveTimingSignalTone } | null {
  if (!pred?.timingSignalBadge?.trim()) return null;
  const raw = pred.timingSignalBadge.trim();
  const tone = pred.timingSignalTone;
  const up = raw.toUpperCase();
  if (action === "buy_now") {
    if (up.includes("PRICE RISING") || up.includes("LOW STOCK")) return { text: raw, tone };
    return null;
  }
  if (action === "wait") {
    if (
      up.includes("PRICE DROPPING") ||
      up.includes("VOLATILE") ||
      up.includes("BETTER DEAL") ||
      up.includes("LOW STOCK")
    ) {
      return { text: raw, tone };
    }
    return null;
  }
  if (action === "compare") {
    if (up.includes("VOLATILE")) return { text: raw, tone };
    return null;
  }
  return null;
}

function pickMarketChip(m: MarketAwarenessTray, action: FinalCommerceAction): { label: string; cls: string } | null {
  if (m.marketHeat === "hot" || m.marketHeat === "overheated") {
    return { label: "MARKET HOT", cls: marketChipCls() };
  }
  if (m.seasonalOpportunity && m.discountWindow === "soon") {
    return { label: "SEASONAL DEAL SOON", cls: marketChipCls() };
  }
  if (m.categoryDemandTrend === "rising") {
    return { label: "DEMAND RISING", cls: marketChipCls() };
  }
  if (m.discountWindow === "soon" && m.categoryDemandTrend === "seasonal") {
    return { label: "CLEARANCE WINDOW", cls: marketChipCls() };
  }
  if (m.categoryVolatility === "high" && action !== "buy_now") {
    return { label: "VOLATILE CATEGORY", cls: marketChipCls() };
  }
  return null;
}

function buildSecondaries(args: {
  action: FinalCommerceAction;
  deal: ProductDealIntelligence;
  trust: number;
  qi: number;
  rank: number;
  blocked: Set<string>;
}): { label: string; cls: string }[] {
  const { action, deal, trust, qi, rank, blocked } = args;
  const out: { label: string; cls: string }[] = [];
  const add = (label: string, cls: string) => {
    const k = label.toUpperCase();
    if (blocked.has(k) || out.some((x) => x.label === k)) return;
    if (out.length >= 2) return;
    out.push({ label: k, cls });
  };

  const tryShelf = (allowed: Set<string>) => {
    for (const sl of deal.shelfLabels) {
      const u = sl.toUpperCase();
      if (!allowed.has(u)) continue;
      add(sl, shelfCls(sl));
      if (out.length >= 2) return;
    }
  };

  if (action === "buy_now") {
    const allow = new Set([
      "BEST VALUE",
      "BEST TRUSTED OPTION",
      "BEST PRICE-TO-QUALITY",
      "LOW RISK",
      "BUY-READY",
    ]);
    tryShelf(allow);
    if (rank <= 2 && qi >= 64 && trust >= 58 && out.length < 2) {
      add("BUY-READY", neutralSecondaryCls());
    }
    if (trust >= 74 && out.length < 2) {
      add("LOW RISK", shelfCls("Safest Buy"));
    }
  } else if (action === "wait") {
    const allow = new Set([
      "WAIT FOR BETTER PRICE",
      "WAIT BEFORE BUYING",
      "COMPARE ALTERNATIVES",
      "PRICE DROP SIGNAL",
    ]);
    tryShelf(allow);
    if (out.length < 2) add("COMPARE ALTERNATIVES", shelfCls("Compare Alternatives"));
  } else if (action === "compare") {
    const allow = new Set(["COMPARE ALTERNATIVES", "BEST PRICE-TO-QUALITY"]);
    tryShelf(allow);
    if (trust < 62 && out.length < 2) add("VERIFY SELLER", neutralSecondaryCls());
    if (trust < 68 && out.length < 2) add("CHECK TRUST", neutralSecondaryCls());
  }

  return out.slice(0, 2);
}

function deriveFinalAction(args: {
  stance: BuyStance;
  trust: number;
  qi: number;
  risk: number;
  pred?: QiPredictiveCommerce;
  priceVsMed: number;
  dealVerdict: QuantAIDealVerdict;
}): { action: FinalCommerceAction; reason: string } {
  const { stance, trust, qi, risk, pred, priceVsMed, dealVerdict } = args;

  if (stance === "avoid" || trust < 40 || qi < 38 || risk >= 74) {
    return { action: "avoid", reason: "Trust, risk, or composite floor triggered avoid posture." };
  }

  const drop = pred?.likelyPriceMove === "drop";
  const rise = pred?.likelyPriceMove === "rise";
  const extreme = extremeValueHold(pred, trust, qi, priceVsMed);

  if (drop && !extreme) {
    return { action: "wait", reason: "Predictive tray read favors a brief wait vs peer pricing." };
  }

  if (stance === "wait") {
    return { action: "wait", reason: "Stance engine favors patience on this row." };
  }

  if (rise && (trust < 72 || qi < 68)) {
    return { action: "compare", reason: "Rising-price read without sufficient trust/QI for a buy chip." };
  }

  if (stance === "buy") {
    if (trust < 52 || qi < 58) {
      return { action: "compare", reason: "Buy stance softened—trust or QI too thin for buy-now chips." };
    }
    if (qi < 70 && dealVerdict === "Strong Buy") {
      return { action: "compare", reason: "QI under strong-buy marketing threshold." };
    }
    return { action: "buy_now", reason: "Stance and predictive gates cleared for buy-now surface." };
  }

  return { action: "compare", reason: "Default compare posture for mixed-field separation." };
}

function buildBuySurface(
  action: FinalCommerceAction,
  buy: ProductBuyDecision,
  pred?: QiPredictiveCommerce
): FinalCommerceDecision["buySurface"] {
  if (action === "avoid") {
    return { stance: "avoid", stanceLabel: "Avoid for now", stanceDetail: buy.stanceDetail };
  }
  if (action === "wait") {
    const label = pred?.predictiveTimingLabel?.trim() || buy.stanceLabel;
    const detail = pred?.narrative?.trim() || buy.stanceDetail;
    return { stance: "wait", stanceLabel: label, stanceDetail: detail.slice(0, 280) };
  }
  if (action === "buy_now") {
    return {
      stance: "buy",
      stanceLabel: /value/i.test(buy.stanceLabel) ? buy.stanceLabel : "Buy-ready",
      stanceDetail: buy.stanceDetail,
    };
  }
  return {
    stance: "compare",
    stanceLabel: "Compare",
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
  const trust = getStoreTrustScore(p.store);
  const risk = p.qiCommerce?.retailerRiskScore ?? 40;
  const pred = p.qiPredictive;
  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const med = median(prices);
  const price = p.price > 0 ? p.price : med;
  const priceVsMed = med > 0 ? price / med : 1;

  const { action, reason } = deriveFinalAction({
    stance: buy.stance,
    trust,
    qi,
    risk,
    pred,
    priceVsMed,
    dealVerdict: deal.aiDealVerdict,
  });

  const { verdict: primaryVerdict, blocked } = pickPrimaryVerdict({
    action,
    dealVerdict: deal.aiDealVerdict,
    trust,
    qi,
    pred,
    priceVsMed,
  });

  const blockedSet = new Set(blocked.map((x) => x.toUpperCase()));
  blockedSet.add(primaryVerdict.toUpperCase());
  if (primaryVerdict !== deal.aiDealVerdict) {
    blockedSet.add(deal.aiDealVerdict.toUpperCase());
  }

  const secondaries = buildSecondaries({
    action,
    deal,
    trust,
    qi,
    rank,
    blocked: blockedSet,
  });

  const predictiveBadge = filterPredictiveBadge(action, pred);
  const marketChip = pickMarketChip(market, action);
  const buySurface = buildBuySurface(action, buy, pred);

  return {
    finalAction: action,
    primaryVerdict,
    secondaryChips: secondaries,
    predictiveBadge,
    marketChip,
    blockedChips: [...blocked],
    decisionReason: reason,
    buySurface,
  };
}
