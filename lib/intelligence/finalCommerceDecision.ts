/**
 * Single arbiter for visible commerce chips vs deal engine + stance + predictive + market + reality/trust v1.
 * Priority: Reality > Trust > Timing > Value > Discount (encoded in deriveFinalAction / verdict gates).
 */

import type { PredictiveTimingSignalTone, QiPredictiveCommerce } from "./commerceAnalysisTypes";
import type { QuantAIDealVerdict, ProductDealIntelligence } from "./dealIntelligenceEngine";
import type { LiveShelfLabel } from "./dealIntelligenceEngine";
import type { MarketAwarenessTray } from "./marketAwareness";
import type { ProductBuyDecision } from "./productBuyDecision";
import type { BuyStance } from "./productBuyDecision";
import type { QuantAIRealityTrustLayer } from "./realityTrustTypes";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type FinalCommerceAction = "buy_now" | "wait" | "compare" | "avoid";

export type FinalCommerceDecision = {
  finalAction: FinalCommerceAction;
  primaryVerdict: QuantAIDealVerdict;
  secondaryChips: { label: string; cls: string }[];
  predictiveBadge: { text: string; tone: PredictiveTimingSignalTone } | null;
  /** Single accent slot: reality insight wins over market when present. */
  contextChip: { label: string; cls: string } | null;
  blockedChips: string[];
  decisionReason: string;
  buySurface: { stance: BuyStance; stanceLabel: string; stanceDetail: string };
  analystLine: string;
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

function realityWarnChipCls(): string {
  return "border-amber-400/32 bg-amber-500/[0.11] text-amber-50/92";
}

function realityGoodChipCls(): string {
  return "border-teal-400/28 bg-teal-500/[0.1] text-teal-50/92";
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
  priceVsMed: number,
  weakRetailer: boolean,
  realityScore: number
): boolean {
  if (weakRetailer) return false;
  if (realityScore < 78) return false;
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
  weakRetailer: boolean;
  realityScore: number;
}): { verdict: QuantAIDealVerdict; blocked: string[] } {
  const blocked: string[] = [];
  const { action, dealVerdict, trust, qi, pred, priceVsMed, weakRetailer, realityScore } = args;

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

  if (action === "buy_now" && weakRetailer && dealVerdict === "Strong Buy") {
    blocked.push("Strong Buy");
    return { verdict: trust >= 70 && realityScore >= 66 ? "Trusted Discount" : "Safe Buy", blocked };
  }

  if (trust < 52) {
    blocked.push(dealVerdict);
    return { verdict: "Trusted Discount", blocked };
  }
  if (trust < 62 && qi >= 66) {
    if (dealVerdict === "Strong Buy") blocked.push("Strong Buy");
    return { verdict: "Safe Buy", blocked };
  }
  if (
    dealVerdict === "Strong Buy" &&
    !canUseStrongBuy(trust, qi, pred, priceVsMed, weakRetailer, realityScore)
  ) {
    blocked.push("Strong Buy");
    if (trust >= 70 && qi >= 72) return { verdict: "Trusted Discount", blocked };
    return { verdict: "Safe Buy", blocked };
  }
  if (isWaitVerdict(dealVerdict) || dealVerdict === "Avoid Fake Sale") {
    blocked.push(dealVerdict);
    return { verdict: qi >= 74 && trust >= 70 ? "Trusted Discount" : "Safe Buy", blocked };
  }
  if (dealVerdict === "Strong Buy" && canUseStrongBuy(trust, qi, pred, priceVsMed, weakRetailer, realityScore)) {
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

function pickRealityChip(
  action: FinalCommerceAction,
  rt: QuantAIRealityTrustLayer | undefined,
  deal: ProductDealIntelligence
): { label: string; cls: string } | null {
  if (!rt) return null;
  if (deal.fakeDiscountRisk === "high" || rt.fakeDiscountProbability >= 0.52) {
    return { label: "SUSPICIOUS DISCOUNT", cls: realityWarnChipCls() };
  }
  if (rt.discountManipulationRisk >= 0.54) {
    return { label: "PRICE MANIPULATION RISK", cls: realityWarnChipCls() };
  }
  if (rt.marketplaceRisk01 >= 0.58) {
    return { label: "MARKETPLACE RISK", cls: realityWarnChipCls() };
  }
  if (rt.weakRetailer) {
    return { label: "LOW TRUST SELLER", cls: realityWarnChipCls() };
  }
  if (
    action === "buy_now" &&
    rt.realityScore >= 88 &&
    rt.fakeDiscountProbability < 0.36 &&
    !rt.weakRetailer &&
    deal.fakeDiscountRisk === "low"
  ) {
    return { label: "VERIFIED VALUE", cls: realityGoodChipCls() };
  }
  return null;
}

function mergeContextChip(
  action: FinalCommerceAction,
  rt: QuantAIRealityTrustLayer | undefined,
  deal: ProductDealIntelligence,
  market: MarketAwarenessTray
): { label: string; cls: string } | null {
  return pickRealityChip(action, rt, deal) ?? pickMarketChip(market, action);
}

function buildSecondaries(args: {
  action: FinalCommerceAction;
  deal: ProductDealIntelligence;
  trust: number;
  qi: number;
  rank: number;
  blocked: Set<string>;
  weakRetailer: boolean;
}): { label: string; cls: string }[] {
  const { action, deal, trust, qi, rank, blocked, weakRetailer } = args;
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
      ...(weakRetailer ? [] : ["BEST TRUSTED OPTION"]),
      "BEST PRICE-TO-QUALITY",
      "LOW RISK",
      ...(weakRetailer ? [] : ["BUY-READY"]),
    ]);
    tryShelf(allow);
    if (!weakRetailer && rank <= 2 && qi >= 64 && trust >= 58 && out.length < 2) {
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
  rt?: QuantAIRealityTrustLayer;
  market: MarketAwarenessTray;
}): { action: FinalCommerceAction; reason: string } {
  const { stance, trust, qi, risk, pred, priceVsMed, dealVerdict, rt, market } = args;
  const reality = rt?.realityScore ?? 74;
  const fakeP = rt?.fakeDiscountProbability ?? 0.28;
  const manip = rt?.discountManipulationRisk ?? 0.26;
  const emotional = rt?.emotionalTrapScore ?? 0;
  const weakR = rt?.weakRetailer ?? trust < 56;

  if (stance === "avoid" || trust < 40 || qi < 38 || risk >= 74) {
    return { action: "avoid", reason: "Trust, risk, or composite floor triggered avoid posture." };
  }

  if (reality < 48) {
    return { action: "compare", reason: "Reality score reads this row as thin versus trustworthy peers." };
  }
  if (reality < 58 && (fakeP > 0.55 || manip > 0.58)) {
    return {
      action: "compare",
      reason: "Reality layer flags discount or anchor hygiene — cross-check before treating as clean value.",
    };
  }
  if (reality < 52 && dealVerdict === "Suspicious Discount") {
    return { action: "compare", reason: "Suspicious discount posture reinforced by low reality confidence." };
  }

  if (market.buyerMomentum === "strong" && emotional > 0.42 && reality < 82) {
    return {
      action: "compare",
      reason: "Tray momentum plus emotional pressure cues — QuantAI prefers a cooler compare pass.",
    };
  }
  if (emotional > 0.58 && reality < 80) {
    return trust < 62
      ? { action: "wait", reason: "Emotional-trap pattern with thinner trust — pause beats impulse." }
      : { action: "compare", reason: "Emotional-trap pattern detected — widen the comparison set first." };
  }
  if (emotional > 0.48 && weakR) {
    return { action: "compare", reason: "Urgency framing on a weaker retailer profile — verify seller footing." };
  }

  if (weakR && reality < 78 && trust < 62) {
    return { action: "compare", reason: "Retailer reliability sits under QuantAI buy-now thresholds." };
  }
  if (weakR && reality < 70) {
    return { action: "compare", reason: "Weak retailer + softer reality read — default to compare." };
  }
  if (fakeP > 0.62 && trust < 68) {
    return { action: "compare", reason: "Fake-discount probability elevated without compensating seller proof." };
  }

  const drop = pred?.likelyPriceMove === "drop";
  const rise = pred?.likelyPriceMove === "rise";
  const extreme = extremeValueHold(pred, trust, qi, priceVsMed);

  if (drop && !extreme) {
    const realityOkForHold = reality >= 88 && trust >= 76 && fakeP < 0.35;
    if (!realityOkForHold) {
      return { action: "wait", reason: "Predictive tray read favors a brief wait vs peer pricing." };
    }
  }

  if (stance === "wait") {
    return { action: "wait", reason: "Stance engine favors patience on this row." };
  }

  if (rise && (trust < 72 || qi < 68 || reality < 72)) {
    return { action: "compare", reason: "Rising-price read without sufficient trust, QI, or reality for a buy chip." };
  }

  if (stance === "buy") {
    if (trust < 52 || qi < 58) {
      return { action: "compare", reason: "Buy stance softened—trust or QI too thin for buy-now chips." };
    }
    if (qi < 70 && dealVerdict === "Strong Buy") {
      return { action: "compare", reason: "QI under strong-buy marketing threshold." };
    }
    if (reality < 62 && !extreme) {
      return { action: "compare", reason: "Reality confidence under buy-now bar without an exceptional value hold." };
    }
    return { action: "buy_now", reason: "Reality, trust, timing, and value gates cleared for buy-now surface." };
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

function composeAnalystRealityLine(args: {
  deal: ProductDealIntelligence;
  trust: number;
  qi: number;
  action: FinalCommerceAction;
  pred?: QiPredictiveCommerce;
  rt?: QuantAIRealityTrustLayer;
  priceVsMed: number;
  market: MarketAwarenessTray;
}): string {
  const { deal, trust, qi, action, pred, rt, priceVsMed, market } = args;
  const reality = rt?.realityScore ?? 74;
  const fakeP = rt?.fakeDiscountProbability ?? 0.28;
  const manip = rt?.discountManipulationRisk ?? 0.26;
  const emotional = rt?.emotionalTrapScore ?? 0;
  const vol = rt?.stockVolatility01 ?? 0.22;
  const weak = rt?.weakRetailer ?? trust < 58;
  const badge = pred?.timingSignalBadge?.toLowerCase() ?? "";

  if (action === "avoid") {
    return "We would pause here — authenticity and seller proof look too thin to endorse outright.";
  }
  if (reality < 55 || deal.fakeDiscountRisk === "high") {
    return "Strong value on the ask is hard to square with the discount story versus peers — verify anchors.";
  }
  if (fakeP > 0.52 && manip > 0.48) {
    return "Strong value but inflated original pricing is a real risk on this feed snapshot.";
  }
  if (weak && action === "wait") {
    return "Attractive pricing with unstable seller signals — cross-check fulfillment and returns.";
  }
  if (qi < 64 && reality < 72 && action === "compare") {
    return "Composite reads soft versus field leaders — widen the compare set before committing.";
  }
  if (weak && action === "compare") {
    return "Attractive pricing with unstable seller signals — line up a higher-trust alternative before checkout.";
  }
  if (pred?.likelyPriceMove === "rise" && (badge.includes("stock") || badge.includes("inventory"))) {
    return "Good timing before expected stock tightening versus comparable listings.";
  }
  if (vol > 0.44 && action === "wait") {
    return "Fair market positioning with moderate volatility — patience may improve your edge.";
  }
  if (market.categoryVolatility === "high" && reality >= 68 && reality < 82) {
    return "Fair market positioning with moderate volatility — keep seller terms in view.";
  }
  if (emotional > 0.45) {
    return "Marketing urgency is loud — slow the checkout clock and verify specs.";
  }
  if (market.seasonalOpportunity && deal.dealStrength >= 64 && reality < 72) {
    return "Strong value despite weak seasonal timing — worth a deliberate compare pass.";
  }
  if (priceVsMed <= 0.92 && trust >= 72 && reality >= 80) {
    return "Clean positioning under the tray median with credible seller footing.";
  }
  if (deal.dealStrength >= 74 && reality >= 78 && !weak) {
    return "Tray-relative value looks solid with disciplined pricing versus peers.";
  }
  if (action === "buy_now") {
    return "Value, trust, and realism align enough for a buy-ready read on this snapshot.";
  }
  return "Fair market positioning with moderate volatility — verify seller terms if you proceed.";
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
  const rt = p.qiRealityTrust;
  const weakR = rt?.weakRetailer ?? trust < 56;
  const realityScore = rt?.realityScore ?? 74;

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
    rt,
    market,
  });

  const { verdict: primaryVerdict, blocked } = pickPrimaryVerdict({
    action,
    dealVerdict: deal.aiDealVerdict,
    trust,
    qi,
    pred,
    priceVsMed,
    weakRetailer: weakR,
    realityScore,
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
    weakRetailer: weakR,
  });

  const predictiveBadge = filterPredictiveBadge(action, pred);
  const contextChip = mergeContextChip(action, rt, deal, market);
  const buySurface = buildBuySurface(action, buy, pred);
  const analystLine = composeAnalystRealityLine({
    deal,
    trust,
    qi,
    action,
    pred,
    rt,
    priceVsMed,
    market,
  });

  return {
    finalAction: action,
    primaryVerdict,
    secondaryChips: secondaries,
    predictiveBadge,
    contextChip,
    blockedChips: [...blocked],
    decisionReason: reason,
    buySurface,
    analystLine,
  };
}
