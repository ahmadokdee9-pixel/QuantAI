/**
 * Intent-aware commerce query signals for ranking + scoring (tray-local, no ML).
 */

import type { ProductCategorySlug } from "./types";
import { detectUniversalIntentFlags, type UniversalIntentFlags } from "@/lib/commerce-os";
import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";
import { arabicIntentGlossTokens, latinSkeletonForMatching, normalizeEasternDigitsInString } from "@/lib/search/queryScriptNormalize";

export type CommerceSearchIntents = {
  budget: boolean;
  premium: boolean;
  gaming: boolean;
  productivity: boolean;
  luxury: boolean;
  trustedOnly: boolean;
  /** Explicit “best value” / price-to-quality language. */
  explicitBestValue: boolean;
  /** User language skews toward headline markdown depth. */
  dealHunter: boolean;
  /** Cheapest acceptable row from a trusted storefront. */
  cheapestTrusted: boolean;
  /** Delivery reliability / low-risk shipping language. */
  deliveryCare: boolean;
  /** User wants plausible markdowns, not inflated anchors. */
  realDiscountOnly: boolean;
  /** Time-pressured purchase language. */
  buyNowUrgency: boolean;
  /** “Like X but cheaper”, alternatives, substitutes. */
  alternativeSeeking: boolean;
  /** “Which store”, “best deal now” — retailer outcome focus. */
  storeDealHunter: boolean;
  /** School / student use case. */
  schoolUse: boolean;
  /** Gift-oriented language. */
  giftUse: boolean;
  /** Side-by-side or “vs” style shopping. */
  comparisonIntent: boolean;
  /** Wants durable / credible quality, not junk. */
  qualitySeeking: boolean;
  /** Nervous buyer — bias trust and low marketplace risk. */
  riskAvoidance: boolean;
  /** Desk / aesthetic / “looks premium” framing. */
  aestheticPremium: boolean;
  /** Portable / lightweight hardware preference. */
  portableLight: boolean;
  /** Creator / streamer adjacent workloads. */
  lifestyleCreator: boolean;
} & UniversalIntentFlags;

/** Normalized string for regex intent detection (legacy + universal OS). */
export function intentMatchEnvelope(q: string): string {
  const fixed = fixCommonCommerceTypos(q);
  return `${fixed} ${latinSkeletonForMatching(fixed)} ${arabicIntentGlossTokens(normalizeEasternDigitsInString(fixed))}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCommerceSearchIntents(q: string): CommerceSearchIntents {
  const s = intentMatchEnvelope(q);
  return {
    budget:
      /\b(cheap|budget|affordable|lowest|under\s+(\$|€|£|eur|gbp|usd)|less\s+than|up\s+to|at\s+most|around\s+(\$|€|£)|save|discount|clearance|bargain|steal|markdown)\b/.test(
        s
      ),
    premium:
      /\b(premium|flagship|pro\b|max\b|ultra|studio|workstation|oled|luxury tier|high.end|upscale|top\s+of\s+the\s+line|best\s+money\s+can\s+buy)\b/.test(
        s
      ),
    gaming:
      /\b(gaming|gamer|rtx|geforce|playstation|xbox|nintendo|steam deck|144hz|240hz|esports)\b/.test(s),
    productivity:
      /\b(work|office|business|student|ultrabook|macbook pro|thinkpad|productivity|wfh|remote work|everyday\s+tasks)\b/.test(
        s
      ),
    luxury: /\b(luxury|designer|boutique|haute|limited edition|collector|looks?\s+expensive)\b/.test(s),
    trustedOnly:
      /\b(trusted|reputable|safe(r)?\s+seller|safest\s+seller|official store|first.party|authorized|warranty|no marketplace|peace\s+of\s+mind)\b/.test(
        s
      ),
    explicitBestValue:
      /\b(best value|bang for (the )?buck|price.to.quality|value leader|value\s+pick|worth\s+(the\s+)?money|best\s+bang)\b/.test(
        s
      ),
    dealHunter:
      /\b(biggest|deepest|largest|steepest)\s+(discount|markdown|sale)|\b(max|highest)\s*%?\s*off|half\s+price|doorbuster|flash\s+sale|on\s+sale\s+today|deal\s+of\s+the\s+day\b/.test(
        s
      ),
    cheapestTrusted:
      /\b(cheapest\s+trusted|trusted\s+cheapest|lowest\s+.+\s+trusted|cheap(er)?\s+.+\s+trusted)\b/.test(s) ||
      /\btrusted\s+(cheap|cheapest|lowest)\b/.test(s),
    deliveryCare:
      /\b(low\s*risk\s+delivery|safe(r)?\s+delivery|reliable\s+shipping|trusted\s+shipping|delivery\s+risk|insured\s+shipping|track(ed)?\s+shipping|arrive(s)?\s+quickly)\b/.test(
        s
      ),
    realDiscountOnly:
      /\b(real|actual|genuine|true)\s+(discount|deal|markdown|price\s*drop)\b|\bonly\s+(real\s+)?discounts?\b|\bno\s+fake\s+discount|not\s+a\s+fake\s+sale\b/i.test(
        s
      ),
    buyNowUrgency:
      /\b(buy\s+now|purchase\s+today|need\s+it\s+(today|this\s+week)|asap|urgent|order\s+today|ship\s+today|before\s+(the\s+)?weekend|this\s+week\s+only)\b/.test(
        s
      ),
    alternativeSeeking:
      /\b(something\s+like|similar\s+to|instead\s+of|cheaper\s+(than|alternative)|alternative\s+to|comparable\s+to|like\s+a\s+|in\s+the\s+same\s+vein)\b/.test(
        s
      ),
    storeDealHunter:
      /\b(which|what)\s+store\b|\bbest\s+deal\s+now\b|\bcheapest\s+store\b|\blowest\s+price\s+where\b|\bwhere\s+to\s+buy\b|\bwho\s+sells\b/.test(
        s
      ),
    schoolUse:
      /\b(for\s+)?school|uni(versity)?|college(\s+laptop)?|student(\s+school|\s+budget)?\b|for\s+class\b/.test(s),
    giftUse:
      /\bgift\s+for|present\s+for|birthday\s+gift|for\s+my\s+(wife|husband|mom|mother|dad|father|partner|spouse|girlfriend|boyfriend|daughter|son|kid|teen)\b/.test(
        s
      ),
    comparisonIntent:
      /\b(compare|vs\.?|versus|side\s*by\s*side|which\s+is\s+better|stack\s+up|head\s*to\s*head|pick\s+between|weigh\s+up)\b/.test(s) ||
      /\bمقارنة\b/.test(q),
    qualitySeeking:
      /\b(not\s+garbage|no\s+junk|doesn'?t\s+feel\s+cheap|well[\s-]?built|solid\s+build|good\s+quality|reliable\s+quality|lasts?\s+(a\s+)?long|durable|won'?t\s+fall\s+apart|cheap\s+but\s+not\s+garbage)\b/.test(
        s
      ),
    riskAvoidance:
      /\b(avoid\s+scam|worried\s+about|nervous|sketchy|sketch|risk[\s-]?averse|lower\s+risk|no\s+risk|sleep\s+at\s+night|don'?t\s+want\s+to\s+regret)\b/.test(
        s
      ),
    aestheticPremium:
      /\b(luxury\s+looking|looks?\s+premium|clean\s+setup|desk\s+setup|aesthetic|instagrammable|statement\s+piece|setup\s+vibes)\b/.test(
        s
      ),
    portableLight:
      /\b(not\s+too\s+heavy|lightweight|light\s+weight|thin\s+and\s+light|travel[\s-]?friendly|carry\s+everywhere|portable|easy\s+to\s+carry)\b/.test(
        s
      ),
    lifestyleCreator:
      /\b(creator|stream(er|ing)?|youtube|tiktok|content\s+creation|podcast\s+setup)\b/.test(s),
    ...detectUniversalIntentFlags(q, s),
  };
}

export type IntentLiftOpts = {
  /** 0–1 headline markdown depth when old→current exists. */
  headlineDiscount01?: number;
};

/** Small composite delta from intents (used with category + trust gates in scoring). */
export function intentCompositeLift(
  intents: CommerceSearchIntents,
  category: ProductCategorySlug,
  trustNorm: number,
  /** When set: positive = under median price (budget-friendly). */
  priceVsMedian?: number,
  opts?: IntentLiftOpts
): number {
  let lift = 0;
  if (intents.budget && priceVsMedian != null && priceVsMedian > 0.05) {
    lift += Math.min(0.038, 0.012 + Math.min(0.35, priceVsMedian) * 0.09);
  }
  if (intents.gaming && category === "electronics") lift += 0.024;
  if (intents.productivity && (category === "electronics" || category === "general")) lift += 0.018;
  if (intents.luxury && (category === "fashion" || category === "electronics")) lift += 0.016;
  if (intents.premium && trustNorm >= 0.72) lift += 0.014;
  if (intents.trustedOnly) {
    lift += trustNorm >= 0.78 ? 0.028 : trustNorm < 0.62 ? -0.038 : 0.006;
  }
  if (intents.explicitBestValue && priceVsMedian != null && priceVsMedian > 0.02 && trustNorm >= 0.64) {
    lift += 0.015;
  }
  if (intents.cheapestTrusted) {
    lift +=
      trustNorm >= 0.8 && priceVsMedian != null && priceVsMedian > 0.035
        ? 0.024
        : trustNorm < 0.64
          ? -0.022
          : 0.005;
  }
  const d = opts?.headlineDiscount01;
  if ((intents.dealHunter || intents.realDiscountOnly) && d != null && d > 0.1) {
    lift += Math.min(0.042, 0.01 + d * 0.055);
  }
  if (intents.schoolUse && (category === "electronics" || category === "general")) lift += 0.014;
  if (intents.giftUse && (category === "general" || category === "fashion" || category === "electronics")) {
    lift += 0.01;
  }
  if (intents.alternativeSeeking && priceVsMedian != null && priceVsMedian > 0.03 && trustNorm >= 0.58) {
    lift += 0.012;
  }
  if (intents.storeDealHunter && trustNorm >= 0.76) lift += 0.011;
  if (intents.comparisonIntent && trustNorm >= 0.68) lift += 0.009;
  if (intents.qualitySeeking && trustNorm >= 0.66) lift += 0.012;
  if (intents.riskAvoidance) {
    lift += trustNorm >= 0.82 ? 0.022 : trustNorm < 0.58 ? -0.032 : 0.004;
  }
  if (intents.aestheticPremium && (category === "electronics" || category === "fashion" || category === "general")) {
    lift += 0.011;
  }
  if (intents.portableLight && (category === "electronics" || category === "general")) {
    lift += 0.009;
  }
  if (intents.lifestyleCreator && (category === "electronics" || category === "general")) lift += 0.009;

  /* Universal commerce OS — bounded semantic lanes (taste, verticals, psychology). */
  if (intents.wellnessFitness && (category === "sports" || category === "electronics" || category === "general")) {
    lift += 0.009;
  }
  if (intents.homeLifestyle && (category === "home" || category === "general")) lift += 0.01;
  if (intents.fragranceBeauty && (category === "beauty" || category === "fashion" || category === "general")) {
    lift += 0.01;
  }
  if (intents.autoAccessory && category === "general") lift += 0.006;
  if (
    intents.comfortSeeking &&
    (category === "fashion" || category === "beauty" || category === "home" || category === "electronics")
  ) {
    lift += 0.008;
  }
  if (intents.feminineStyle && (category === "fashion" || category === "beauty" || category === "general")) {
    lift += 0.006;
  }
  if (intents.masculineStyle && (category === "fashion" || category === "beauty" || category === "general")) {
    lift += 0.006;
  }
  if (
    intents.minimalistStyle &&
    (category === "home" || category === "electronics" || category === "fashion" || category === "general")
  ) {
    lift += 0.007;
  }
  if (
    intents.quietLuxury &&
    (category === "fashion" || category === "beauty" || category === "electronics" || category === "general")
  ) {
    lift += 0.008;
  }
  if (
    intents.giftingEmotional &&
    !intents.giftUse &&
    (category === "general" || category === "fashion" || category === "beauty")
  ) {
    lift += 0.005;
  }
  if (intents.longTermValue && trustNorm >= 0.7) lift += 0.007;

  return lift;
}
