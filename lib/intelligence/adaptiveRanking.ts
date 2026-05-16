/**
 * QuantAI adaptive ranking — tray-level score deltas from human search intent.
 */

import { listingTextQuality01 } from "@/lib/commerce/listingQuality";
import type { HumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";
import type { CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

function medianPrice(list: QuantProduct[]): number {
  const prices = list.map((x) => x.price).filter((n) => n > 0).sort((a, b) => a - b);
  if (!prices.length) return 0;
  const m = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[m]! : (prices[m - 1]! + prices[m]!) / 2;
}

/**
 * Bounded composite delta from buyer posture (used inside search rank ordering).
 * Keeps magnitude modest so base composite + intentCompositeLift remain primary.
 */
export function adaptiveListingScoreDelta(
  p: QuantProduct,
  list: QuantProduct[],
  intents: CommerceSearchIntents,
  human: HumanSearchIntent
): number {
  let d = 0;
  const trust = getStoreTrustScore(p.store);
  const title = `${p.title} ${p.extensions.join(" ")}`.toLowerCase();
  const stars = ratingValue(p.rating);
  const rev = p.reviewsCount ?? 0;
  const mp = getMarketplaceSellerRiskTier(p.store, p.title);
  const med = medianPrice(list);

  if (human.commerce.riskAvoidance || human.profile.riskTolerance < 0.42) {
    d += trust >= 76 ? 1.35 : trust < 52 ? -2.05 : 0;
    if (mp === "high") d -= 1.95;
    else if (mp === "medium") d -= 0.85;
  }

  if (human.luxuryPreference >= 0.55 || human.premiumVsCheapMindset >= 0.35) {
    if (/\b(pro|max|ultra|studio|oled|titanium|heritage|limited)\b/i.test(title)) d += 1.2;
    d += trust >= 70 ? 0.42 : -0.32;
    d += stars >= 4.25 && rev >= 18 ? 0.35 : 0;
  }

  if (human.budgetIntent >= 0.58 && human.premiumVsCheapMindset < 0.28) {
    if (med > 0 && p.price > 0 && p.price <= med * 0.96) d += 1.65;
    if ((intents.dealHunter || intents.realDiscountOnly) && p.oldPrice != null && p.oldPrice > p.price) d += 0.75;
  }

  if (human.usageContext.includes("gaming") && /\b(rtx|gaming|hz|esports|ddr5|vram|geforce)\b/i.test(title)) {
    d += 1.05;
  }
  if (human.usageContext.includes("student") && med > 0 && p.price > 0 && p.price <= med * 1.06 && trust >= 58) {
    d += 0.8;
  }
  if (human.usageContext.includes("travel") && human.commerce.portableLight) {
    if (/\b(air|thin|light|compact|gram|travel)\b/i.test(title)) d += 0.95;
  }

  if (human.aestheticDirection === "minimal") {
    d += (listingTextQuality01(p.title) - 0.52) * 4;
    if (/\b(wireless|compact|slim|mat|aluminum)\b/i.test(title)) d += 0.5;
  }
  if (human.aestheticDirection === "premium_look") {
    if (/\b(leather|brushed|matte|ceramic|premium|designer)\b/i.test(title)) d += 0.7;
  }

  if (human.urgencyIntent >= 0.62) {
    d += (p.qiSignals?.delivery ?? 50) >= 68 ? 0.5 : -0.22;
    d += trust >= 72 ? 0.32 : 0;
  }

  if (human.emotionalIntent >= 0.62 && human.commerce.riskAvoidance) {
    d += stars >= 4.15 && rev >= 12 ? 0.38 : -0.42;
  }

  return Math.min(7.5, Math.max(-7.5, d));
}
