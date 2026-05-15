/**
 * QuantAI Intelligence Consensus Engine v1 — single brain for card-facing commerce posture.
 * Merges predictive, reality/trust, emotional pressure, market tray, deal intel, and category economics.
 */

import type { PredictiveTimingSignalTone, QiPredictiveCommerce } from "./commerceAnalysisTypes";
import type { QuantAIDealVerdict, ProductDealIntelligence } from "./dealIntelligenceEngine";
import type { MarketAwarenessTray } from "./marketAwareness";
import type { ProductBuyDecision } from "./productBuyDecision";
import type { QuantAIRealityTrustLayer } from "./realityTrustTypes";
import type { ProductCategorySlug } from "./types";
import { getCategoryBehaviorProfile } from "./categoryBehaviorProfiles";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type ConsensusFinalAction =
  | "buy_now"
  | "strong_buy"
  | "wait"
  | "watch"
  | "compare"
  | "avoid"
  | "review";

export type ConsensusTrustLevel = "high" | "moderate" | "low";

export type ConsensusTimingQuality = "excellent" | "good" | "neutral" | "poor";

export type ConsensusEmotionalRisk = "low" | "moderate" | "high";

export type ConsensusPricingState = "undervalued" | "fair" | "overpriced";

export type ConsensusDecision = {
  finalAction: ConsensusFinalAction;
  confidence: number;
  consensusReason: string;
  trustLevel: ConsensusTrustLevel;
  timing: ConsensusTimingQuality;
  emotionalRisk: ConsensusEmotionalRisk;
  pricingState: ConsensusPricingState;
  intelligenceSummary: string;
  /** Ordered visible chips: index 0 = primary verdict chip, rest optional secondaries / accent (max 4 total). */
  badgeSet: string[];
  /** Consensus-gated predictive timing row (null = hide predictive chip). */
  timingBadge: { text: string; tone: PredictiveTimingSignalTone } | null;
  /** Natural-language line for the card analyst row. */
  analystLine: string;
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function extremeValueHold(pred: QiPredictiveCommerce | undefined, trust: number, qi: number, priceVsMed: number): boolean {
  if (!pred) return false;
  return trust >= 80 && qi >= 82 && priceVsMed <= 0.92 && pred.timingConfidence >= 55;
}

function trustLevelFrom(trust: number, weak: boolean): ConsensusTrustLevel {
  if (weak || trust < 52) return "low";
  if (trust >= 72) return "high";
  return "moderate";
}

function emotionalRiskFrom(score: number, tolerance: number): ConsensusEmotionalRisk {
  const adj = score * (1 - tolerance * 0.55);
  if (adj < 0.32) return "low";
  if (adj < 0.52) return "moderate";
  return "high";
}

function pricingStateFrom(
  priceVsMed: number,
  deal: ProductDealIntelligence,
  manip: number
): ConsensusPricingState {
  if (deal.overpricedVsTray || priceVsMed > 1.14 || manip > 0.58) return "overpriced";
  if (priceVsMed < 0.88 && !deal.overpricedVsTray) return "undervalued";
  return "fair";
}

function timingQuality(
  pred: QiPredictiveCommerce | undefined,
  market: MarketAwarenessTray,
  vol01: number
): ConsensusTimingQuality {
  const move = pred?.likelyPriceMove;
  const conf = pred?.timingConfidence ?? 48;
  if (move === "rise" && conf >= 58 && market.categoryVolatility !== "high") return "excellent";
  if (move === "stable" && conf >= 52) return "good";
  if (move === "drop") return "poor";
  if (market.categoryVolatility === "high" || vol01 > 0.48) return "poor";
  if (move === "rise") return "good";
  return "neutral";
}

function buildTimingBadge(
  action: ConsensusFinalAction,
  pred?: QiPredictiveCommerce
): { text: string; tone: PredictiveTimingSignalTone } | null {
  if (!pred?.timingSignalBadge?.trim()) return null;
  const raw = pred.timingSignalBadge.trim();
  const tone = pred.timingSignalTone;
  const up = raw.toUpperCase();
  const gateBuy = action === "buy_now" || action === "strong_buy";
  const gateWait = action === "wait" || action === "watch";
  const gateCompare = action === "compare" || action === "review";
  if (gateBuy) {
    if (up.includes("PRICE RISING") || up.includes("LOW STOCK")) return { text: raw, tone };
    return null;
  }
  if (gateWait) {
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
  if (gateCompare) {
    if (up.includes("VOLATILE")) return { text: raw, tone };
    return null;
  }
  return null;
}

function verdictLabel(v: QuantAIDealVerdict): string {
  return v.toUpperCase().replace(/\s+/g, " ");
}

function pickPrimaryVerdict(args: {
  action: ConsensusFinalAction;
  deal: ProductDealIntelligence;
  trust: number;
  qi: number;
  weak: boolean;
  reality: number;
  fakeP: number;
}): QuantAIDealVerdict {
  const { action, deal, trust, qi, weak, reality, fakeP } = args;

  if (action === "avoid") {
    if (deal.aiDealVerdict === "Suspicious Discount" || deal.aiDealVerdict === "Avoid Fake Sale") return deal.aiDealVerdict;
    return "Avoid Fake Sale";
  }
  if (action === "wait" || action === "watch") {
    return "Wait For Better Price";
  }
  if (action === "compare" || action === "review") {
    if (trust < 56) return "Best Price-to-Quality";
    return "Best Price-to-Quality";
  }
  if (action === "strong_buy") {
    return "Strong Buy";
  }

  if (deal.aiDealVerdict === "Best Deal Today" && trust >= 64 && reality >= 72 && !weak) {
    return "Best Deal Today";
  }
  if (trust >= 72 && deal.hasDiscount && deal.fakeDiscountRisk === "low" && reality >= 70 && fakeP < 0.44) {
    return "Trusted Discount";
  }
  if (deal.aiDealVerdict === "Premium Pick" && trust >= 68 && reality >= 74) return "Premium Pick";
  if (qi >= 76 && trust >= 66) return "Best Price-to-Quality";
  return "Safe Buy";
}

function buildBadgeSet(args: {
  primary: QuantAIDealVerdict;
  action: ConsensusFinalAction;
  deal: ProductDealIntelligence;
  trust: number;
  qi: number;
  weak: boolean;
  rt?: QuantAIRealityTrustLayer;
  market: MarketAwarenessTray;
  fakeP: number;
  manip: number;
}): string[] {
  const { primary, action, deal, trust, qi, weak, rt, market, fakeP, manip } = args;
  const badges: string[] = [verdictLabel(primary)];
  const add = (s: string) => {
    const u = s.toUpperCase();
    if (badges.some((b) => b === u)) return;
    if (badges.length >= 4) return;
    if (u.includes("WAIT") && (primary === "Strong Buy" || primary === "Safe Buy" || primary === "Best Deal Today")) {
      return;
    }
    if (
      (u.includes("STRONG BUY") || u === "BUY-READY" || u.includes("BEST TRUSTED")) &&
      (action === "wait" || action === "watch" || action === "compare" || action === "review" || action === "avoid")
    ) {
      return;
    }
    if (u.includes("BEST TRUSTED") && weak) return;
    if (u === "BUY-READY" && weak) return;
    badges.push(u);
  };

  if (action === "buy_now" || action === "strong_buy") {
    const allow = new Set(
      [
        "BEST VALUE",
        "BEST PRICE-TO-QUALITY",
        "LOW RISK",
        ...(weak ? [] : ["BEST TRUSTED OPTION", "BUY-READY"]),
      ].map((x) => x.toUpperCase())
    );
    for (const sl of deal.shelfLabels) {
      const u = sl.toUpperCase();
      if (!allow.has(u)) continue;
      add(sl);
      if (badges.length >= 3) break;
    }
    if (!weak && qi >= 66 && trust >= 60 && badges.length < 3) add("BUY-READY");
    if (trust >= 74 && badges.length < 4) add("LOW RISK");
  } else if (action === "wait" || action === "watch") {
    for (const sl of deal.shelfLabels) {
      const u = sl.toUpperCase();
      if (/WAIT|COMPARE|PRICE DROP|VOLATILE/.test(u)) add(sl);
      if (badges.length >= 3) break;
    }
    if (badges.length < 3) add("COMPARE ALTERNATIVES");
  } else if (action === "compare" || action === "review") {
    for (const sl of deal.shelfLabels) {
      const u = sl.toUpperCase();
      if (/COMPARE|BEST PRICE|VERIFY|CHECK/.test(u)) add(sl);
      if (badges.length >= 3) break;
    }
    if (trust < 62) add("VERIFY SELLER");
  }

  if (rt && badges.length < 4) {
    if (deal.fakeDiscountRisk === "high" || fakeP >= 0.5) add("SUSPICIOUS DISCOUNT");
    else if (manip >= 0.54) add("PRICE MANIPULATION RISK");
    else if (rt.marketplaceRisk01 >= 0.58) add("MARKETPLACE RISK");
    else if (rt.weakRetailer) add("LOW TRUST SELLER");
    else if (
      (action === "buy_now" || action === "strong_buy") &&
      rt.realityScore >= 88 &&
      fakeP < 0.36 &&
      !rt.weakRetailer &&
      deal.fakeDiscountRisk === "low"
    ) {
      add("VERIFIED VALUE");
    }
  }

  if (badges.length < 4 && (market.marketHeat === "hot" || market.marketHeat === "overheated")) {
    add("MARKET HOT");
  } else if (badges.length < 4 && market.seasonalOpportunity && market.discountWindow === "soon") {
    add("SEASONAL DEAL SOON");
  }

  return badges.slice(0, 4);
}

function buildAnalystLine(c: ConsensusDecision, deal: ProductDealIntelligence, priceVsMed: number): string {
  const { finalAction, trustLevel, timing, emotionalRisk, pricingState, confidence } = c;
  if (finalAction === "avoid") {
    return "We would pause — the discount story and seller footing do not meet a confident checkout bar.";
  }
  if (pricingState === "overpriced" && timing === "poor") {
    return "Retail pricing appears inflated versus this tray, and timing favors patience.";
  }
  if (timing === "excellent" && trustLevel === "high" && (finalAction === "buy_now" || finalAction === "strong_buy")) {
    return "Excellent timing with stable seller reliability on this snapshot.";
  }
  if (timing === "poor" && trustLevel !== "low") {
    return "Fair value, but market volatility suggests patience before you lock a price.";
  }
  if (emotionalRisk === "high") {
    return "Pricing pressure and promotional framing look emotionally loaded — widen your compare set.";
  }
  if (finalAction === "strong_buy" || (finalAction === "buy_now" && confidence >= 78)) {
    return "Strong value opportunity from a retailer signal that looks reliable in this field.";
  }
  if (finalAction === "watch") {
    return "Worth tracking — signals are interesting, but we would not rush checkout on this row yet.";
  }
  if (finalAction === "review") {
    return "Specs and seller terms deserve a careful read before this listing earns a clean green light.";
  }
  if (finalAction === "wait") {
    return "Fair value with timing that argues for patience — let the next price move clarify the edge.";
  }
  if (finalAction === "compare") {
    return "Mixed signals across price, trust, and realism — compare alternatives before committing.";
  }
  if (trustLevel === "low") {
    return "Attractive pricing with thinner seller proof — verify fulfillment and authenticity paths.";
  }
  if (pricingState === "undervalued" && priceVsMed <= 0.9) {
    return "You are sitting under the tray median with a credible read on value — still verify terms.";
  }
  if (deal.fakeDiscountRisk === "medium") {
    return "Discount hygiene is mixed — anchor pricing should be checked against trustworthy peers.";
  }
  return "Balanced read across value, trust, and timing — proceed only if checkout protections look solid.";
}

function buildIntelligenceSummary(c: ConsensusDecision, qi: number, reality: number): string {
  return `QI ${qi} · reality ${Math.round(reality)} · trust ${c.trustLevel} · timing ${c.timing} · emotion ${c.emotionalRisk} · price ${c.pricingState} · confidence ${Math.round(c.confidence)}`;
}

export function buildConsensusDecision(args: {
  product: QuantProduct;
  list: QuantProduct[];
  dealIntel: ProductDealIntelligence;
  buyDecision: ProductBuyDecision;
  market: MarketAwarenessTray;
  rank: number;
  qiRounded: number;
}): ConsensusDecision {
  const { product: p, list, dealIntel: deal, buyDecision: buy, market, rank, qiRounded: qi } = args;
  const profile = getCategoryBehaviorProfile((p.qiCategory ?? "general") as ProductCategorySlug);
  const trust = getStoreTrustScore(p.store);
  const risk = p.qiCommerce?.retailerRiskScore ?? 40;
  const pred = p.qiPredictive;
  const rt = p.qiRealityTrust;
  const reality = rt?.realityScore ?? 74;
  const fakeP = rt?.fakeDiscountProbability ?? 0.28;
  const manip = rt?.discountManipulationRisk ?? 0.26;
  const emotionalRaw = rt?.emotionalTrapScore ?? 0;
  const emotionalAdj = emotionalRaw * (1 - profile.emotionalTolerance01 * 0.45);
  const weak = rt?.weakRetailer ?? trust < 56;
  const vol01 = clamp(
    (market.categoryVolatility === "high" ? 0.55 : market.categoryVolatility === "medium" ? 0.32 : 0.18) +
      (rt?.stockVolatility01 ?? 0) * 0.45,
    0,
    1
  );

  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const med = median(prices);
  const price = p.price > 0 ? p.price : med;
  const priceVsMed = med > 0 ? price / med : 1;
  const premium = priceVsMed >= profile.premiumPriceRatio || p.price >= med * profile.premiumPriceRatio;

  const trustLevel = trustLevelFrom(trust, weak);
  const timing = timingQuality(pred, market, rt?.stockVolatility01 ?? 0.2);
  const emotionalRisk = emotionalRiskFrom(emotionalRaw, profile.emotionalTolerance01);
  const pricingState = pricingStateFrom(priceVsMed, deal, manip);

  const drop = pred?.likelyPriceMove === "drop";
  const rise = pred?.likelyPriceMove === "rise";
  const extreme = extremeValueHold(pred, trust, qi, priceVsMed);
  const reviews = p.reviewsCount ?? 0;
  const stars = ratingValue(p.rating);

  let finalAction: ConsensusFinalAction = "compare";
  let consensusReason = "Tray signals land in a mixed band — default compare posture.";
  let fromHardGate = false;
  const stance = buy.stance;

  if (stance === "avoid" || trust < 40 || qi < 38 || risk >= 74) {
    finalAction = "avoid";
    consensusReason = "Hard floor on trust, composite, or explicit avoid stance.";
    fromHardGate = true;
  } else if (reality < 48) {
    finalAction = "compare";
    consensusReason = "Reality confidence is thin versus trustworthy peers.";
    fromHardGate = true;
  } else if (reality < 58 && (fakeP > 0.55 || manip > 0.58)) {
    finalAction = "compare";
    consensusReason = "Discount realism and anchor hygiene need a cross-check.";
    fromHardGate = true;
  } else if (fakeP > 0.62 && trust < 68) {
    finalAction = "compare";
    consensusReason = "Fake-sale probability is elevated without compensating seller proof.";
    fromHardGate = true;
  } else if (market.buyerMomentum === "strong" && emotionalAdj > 0.42 && reality < 82) {
    finalAction = "compare";
    consensusReason = "Momentum plus emotional pressure — QuantAI prefers a wider compare.";
    fromHardGate = true;
  } else if (emotionalAdj > 0.58 && reality < 80) {
    finalAction = trust < 62 ? "wait" : "compare";
    consensusReason = "Emotional manipulation risk tilts away from impulse.";
    fromHardGate = true;
  } else if (emotionalAdj > 0.48 && weak) {
    finalAction = "compare";
    consensusReason = "Urgency cues on a weaker retailer profile.";
    fromHardGate = true;
  } else if (weak && reality < 78 && trust < 62) {
    finalAction = "compare";
    consensusReason = "Retailer reliability sits under buy-now thresholds.";
    fromHardGate = true;
  } else if (weak && reality < 70) {
    finalAction = "compare";
    consensusReason = "Weak retailer with softer reality read.";
    fromHardGate = true;
  } else if (drop && !extreme) {
    const hold = reality >= 88 && trust >= 76 && fakeP < 0.35;
    if (!hold) {
      finalAction = "wait";
      consensusReason = "Predictive read favors a brief wait versus peer pricing.";
      fromHardGate = true;
    }
  }

  if (!fromHardGate) {
    if (stance === "wait") {
      finalAction = "wait";
      consensusReason = "Stance engine prefers patience.";
    } else if (rise && (trust < 72 || qi < 68 || reality < 72)) {
      finalAction = "compare";
      consensusReason = "Rising-price outlook without enough trust, QI, or reality for an aggressive chip.";
    } else if (stance === "buy") {
      const evidenceNeed = premium ? profile.premiumEvidenceMultiplier : 1;
      const qiBar = premium ? 72 : 58;
      if (trust < 52 || qi < qiBar) {
        finalAction = "compare";
        consensusReason = "Trust or composite is shy of a confident buy surface.";
      } else if (qi < 70 && deal.aiDealVerdict === "Strong Buy") {
        finalAction = "compare";
        consensusReason = "QI sits under the marketing bar for a strong-buy label.";
      } else if (reality < 62 * evidenceNeed && !extreme) {
        finalAction = "compare";
        consensusReason = "Reality confidence is under the buy-now bar without an exceptional hold.";
      } else if (drop && !extreme) {
        finalAction = "wait";
        consensusReason = "Timing and depreciation risk outweigh a clean buy-now read.";
      } else {
        const strongGate =
          !weak &&
          qi >= Math.round(74 * evidenceNeed) &&
          reality >= Math.round(82 * evidenceNeed) &&
          trust >= 72 &&
          fakeP < 0.38 * evidenceNeed &&
          emotionalAdj < 0.48 &&
          timing !== "poor" &&
          deal.fakeDiscountRisk !== "high";

        if (strongGate && deal.aiDealVerdict !== "Suspicious Discount") {
          finalAction = "strong_buy";
          consensusReason = "Across timing, trust, and realism, this row clears a premium strong-buy bar.";
        } else {
          finalAction = "buy_now";
          consensusReason = "Value, trust, and realism clear a pragmatic buy-now threshold.";
        }
      }
    }
  }

  if (finalAction === "compare" && reviews < 10 && stars < 4.1 && qi < 64) {
    finalAction = "review";
    consensusReason = "Thin social proof on the listing — review details before leaning in.";
  }
  if (
    finalAction === "compare" &&
    timing === "neutral" &&
    trustLevel === "high" &&
    emotionalRisk === "low" &&
    qi >= 70
  ) {
    finalAction = "watch";
    consensusReason = "Good bones, but we would watch price and stock for a cleaner entry.";
  }

  const primary = pickPrimaryVerdict({
    action: finalAction,
    deal,
    trust,
    qi,
    weak,
    reality,
    fakeP,
  });

  const badgeSet = buildBadgeSet({
    primary,
    action: finalAction,
    deal,
    trust,
    qi,
    weak,
    rt,
    market,
    fakeP,
    manip,
  });

  let confidence = clamp(
    52 +
      (reality - 68) * 0.55 +
      (trust - 62) * 0.35 +
      (qi - 65) * 0.25 -
      fakeP * 28 -
      emotionalAdj * 18 -
      vol01 * profile.volatilityWeight * 14 -
      (weak ? 12 : 0) +
      (timing === "excellent" ? 8 : timing === "poor" ? -10 : 0) +
      (rank <= 2 ? 3 : 0),
    18,
    96
  );
  if (finalAction === "avoid") confidence = clamp(confidence - 20, 12, 40);
  if (finalAction === "strong_buy") confidence = clamp(confidence + 4, 22, 96);

  const timingBadge = buildTimingBadge(finalAction, pred);

  const base: ConsensusDecision = {
    finalAction,
    confidence,
    consensusReason,
    trustLevel,
    timing,
    emotionalRisk,
    pricingState,
    intelligenceSummary: "",
    badgeSet,
    timingBadge,
    analystLine: "",
  };
  base.intelligenceSummary = buildIntelligenceSummary(base, qi, reality);
  base.analystLine = buildAnalystLine(base, deal, priceVsMed);
  return base;
}
