/**
 * Consensus personality + human-aware analyst voice (card copy only).
 */

import type { ProductDealIntelligence } from "./dealIntelligenceEngine";
import type { HumanIntentProfile } from "./humanIntentEngine";
import type { RegretRiskLevel } from "./regretRisk";
import type { ProductCategorySlug } from "./types";
import type { ProductUnderstanding } from "./productUnderstanding";

type FinalAction = "buy_now" | "strong_buy" | "wait" | "watch" | "compare" | "avoid" | "review";
type TrustLevel = "high" | "moderate" | "low";
type TimingQuality = "excellent" | "good" | "neutral" | "poor";
type EmotionalRisk = "low" | "moderate" | "high";
type PricingState = "undervalued" | "fair" | "overpriced";

export function deriveConsensusPersonality(args: {
  finalAction: FinalAction;
  trustLevel: TrustLevel;
  pricingState: PricingState;
  emotionalRisk: EmotionalRisk;
  human: HumanIntentProfile;
  regretLevel: RegretRiskLevel;
  category: ProductCategorySlug;
  qi: number;
}): string {
  const { finalAction, trustLevel, pricingState, emotionalRisk, human, regretLevel, category, qi } = args;

  if (finalAction === "avoid") return "Hard pause";

  if (regretLevel === "LOW" && trustLevel === "high" && pricingState !== "overpriced" && qi >= 72) {
    return "Safe long-term value";
  }
  if (human.signals.budgetAnxiety > 0.55 && pricingState !== "overpriced" && trustLevel !== "low") {
    return "Budget winner";
  }
  if (human.luxuryPreference > 0.55 && emotionalRisk !== "high" && trustLevel !== "low") {
    return "Premium emotional choice";
  }
  if (human.practicalityWeight > 0.62 && regretLevel !== "HIGH") {
    return "Smart practical pick";
  }
  if (pricingState === "overpriced" && qi >= 68) {
    return "Luxury-flex option";
  }
  if (category === "fashion" && human.signals.aestheticTaste > 0.5 && regretLevel === "MODERATE") {
    return "Trend-driven purchase";
  }
  if (trustLevel === "high" && finalAction === "buy_now") {
    return "High-trust everyday pick";
  }
  if (human.giftingLikelihood > 0.55) {
    return "Gift-grade signal";
  }
  return "Balanced tray read";
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function listingRiskHigh(u: ProductUnderstanding): boolean {
  return u.listingRisk >= 68;
}

/** Premium, short commerce language; coherence guards against trust/regret contradictions. */
export function buildHumanAwareAnalystLine(args: {
  finalAction: FinalAction;
  trustLevel: TrustLevel;
  timing: TimingQuality;
  emotionalRisk: EmotionalRisk;
  pricingState: PricingState;
  confidence: number;
  deal: ProductDealIntelligence;
  priceVsMed: number;
  human: HumanIntentProfile;
  regretLevel: RegretRiskLevel;
  category: ProductCategorySlug;
  trustScore: number;
  qi: number;
  weakRetailer: boolean;
  /** Product understanding v1 — listing depth & query fit (optional). */
  understanding?: ProductUnderstanding | null;
}): string {
  const { deal, priceVsMed, human, regretLevel, category, trustScore, qi, weakRetailer, understanding: u } = args;
  const { finalAction, trustLevel, timing, emotionalRisk, pricingState, confidence } = args;
  const gift = human.giftingLikelihood > 0.48;
  const aesthetic = human.aestheticSensitivity > 0.52;
  const budgetNervous = human.signals.budgetAnxiety > 0.48;
  const luxuryQ = human.luxuryPreference > 0.52;

  // Coherence: never sound ecstatic on HIGH regret + buy posture
  const regretTension = regretLevel === "HIGH" && (finalAction === "buy_now" || finalAction === "strong_buy");
  const trustTension = weakRetailer || trustLevel === "low";
  const premiumTension = luxuryQ && trustTension;

  if (finalAction === "avoid") {
    return clip("We would pause — the story here asks for proof you have not been given yet.", 118);
  }

  if (regretTension) {
    return clip(
      "Strong surface appeal, but regret risk is real — buy only if you will actually use it, not chase the feeling.",
      118
    );
  }

  if (u?.titleQuality === "spammy") {
    return clip("High marketplace noise in the title — price cannot replace missing product clarity.", 118);
  }

  if (u && u.productConfidence < 44 && listingRiskHigh(u)) {
    return clip("Thin product signal on the listing — verify model, condition, and what is actually in the box.", 118);
  }

  if (u && u.specCompleteness >= 82 && u.matchQuality >= 74 && u.authenticityConfidence >= 70) {
    return clip("Strong specification clarity with transparent positioning versus your search.", 118);
  }

  if (u && u.matchQuality >= 78 && aesthetic && human.signals.aestheticTaste > 0.45) {
    return clip("Product positioning lines up with your minimal aesthetic intent on the title evidence.", 118);
  }

  if (u && u.matchQuality >= 74 && human.signals.productivity > 0.48 && category === "electronics") {
    return clip("Good fit for premium productivity-focused buyers — still confirm ports and warranty.", 118);
  }

  if (u && u.authenticityConfidence >= 82 && u.condition !== "unknown" && u.listingRisk < 48) {
    return clip("Transparent listing with stronger long-term confidence on what you are buying.", 118);
  }

  if (premiumTension) {
    return clip("Premium energy in the query, thinner proof on the seller — verify before you romanticize the price.", 118);
  }

  if (trustTension && (finalAction === "strong_buy" || finalAction === "buy_now")) {
    return clip("Interesting value on paper — the retailer layer still deserves a skeptical pass before checkout.", 118);
  }

  if (finalAction === "strong_buy" && regretLevel === "LOW" && trustLevel === "high") {
    if (category === "electronics") {
      return clip("Strong everyday hardware signal with low regret risk if specs match your workload.", 118);
    }
    if (gift) {
      return clip("Reads like a confident gift pick — clear proof, not just pretty packaging.", 118);
    }
    return clip("Strong everyday choice with low regret risk on this snapshot.", 118);
  }

  if (pricingState === "overpriced" && timing === "poor") {
    return clip("Pricing looks overheated versus peers — patience usually beats urgency here.", 118);
  }

  if (aesthetic && pricingState === "fair" && trustLevel !== "low" && category === "fashion") {
    return clip("Aesthetic match is credible — check fit and return policy, then this is a calm yes.", 118);
  }

  if (luxuryQ && category === "beauty" && emotionalRisk !== "high") {
    return clip("Identity-led buy — fine if you want the scent, not the story the discount tells.", 118);
  }

  if (budgetNervous && pricingState !== "overpriced" && trustScore >= 68) {
    return clip("Excellent value if you care more about peace of mind than hype.", 118);
  }

  if (emotionalRisk === "high" && human.urgencySensitivity > 0.5) {
    return clip("Good emotional purchase on paper — weak rational purchase unless you widen the compare set.", 118);
  }

  if (timing === "excellent" && trustLevel === "high" && (finalAction === "buy_now" || finalAction === "strong_buy")) {
    return clip("Timing and seller footing line up — still read warranty and returns like an adult.", 118);
  }

  if (timing === "poor" && trustLevel !== "low") {
    return clip("Looks fine on trust, shaky on timing — let volatility cool before you lock it.", 118);
  }

  if (finalAction === "watch") {
    return clip("Worth a watchlist slot — interesting, not yet a clean commit.", 118);
  }

  if (finalAction === "review") {
    return clip("Specs and seller terms deserve a careful read before this earns a green light.", 118);
  }

  if (finalAction === "wait") {
    return clip("Fair value with timing that argues for patience — let the next move show the edge.", 118);
  }

  if (finalAction === "compare" && qi < 58) {
    return clip("Tray math is lukewarm — fine as a bookmark, not as a love-at-first-sight buy.", 118);
  }

  if (finalAction === "compare") {
    return clip("Mixed signals across price, trust, and realism — compare before you commit.", 118);
  }

  if (deal.fakeDiscountRisk === "medium") {
    return clip("Discount hygiene is mixed — anchor pricing should be checked against trustworthy peers.", 118);
  }

  if (pricingState === "undervalued" && priceVsMed <= 0.9) {
    return clip("Sits under the tray median with a credible read — still verify fulfillment friction.", 118);
  }

  if (confidence >= 78 && finalAction === "buy_now") {
    return clip("Balanced read leaning buy — proceed only if checkout protections look boringly solid.", 118);
  }

  return clip("Balanced read across value, trust, and timing — proceed only if protections look solid.", 118);
}
