/**
 * Intent-aware commerce query signals for ranking + scoring (tray-local, no ML).
 */

import type { ProductCategorySlug } from "./types";

export type CommerceSearchIntents = {
  budget: boolean;
  premium: boolean;
  gaming: boolean;
  productivity: boolean;
  luxury: boolean;
  trustedOnly: boolean;
};

export function parseCommerceSearchIntents(q: string): CommerceSearchIntents {
  const s = q.toLowerCase();
  return {
    budget:
      /\b(cheap|budget|affordable|lowest|under\s+(\$|€|£)|save|discount|clearance|bargain)\b/.test(s),
    premium:
      /\b(premium|flagship|pro\b|max\b|ultra|studio|workstation|oled|luxury tier)\b/.test(s),
    gaming: /\b(gaming|gamer|rtx|geforce|playstation|xbox|nintendo|steam deck|144hz|240hz)\b/.test(s),
    productivity: /\b(work|office|business|student|ultrabook|macbook pro|thinkpad|productivity)\b/.test(s),
    luxury: /\b(luxury|designer|boutique|haute|limited edition|collector)\b/.test(s),
    trustedOnly:
      /\b(trusted|reputable|safe seller|official store|first.party|authorized|warranty|no marketplace)\b/.test(s),
  };
}

/** Small composite delta from intents (used with category + trust gates in scoring). */
export function intentCompositeLift(
  intents: CommerceSearchIntents,
  category: ProductCategorySlug,
  trustNorm: number,
  /** When set: positive = under median price (budget-friendly). */
  priceVsMedian?: number
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
  return lift;
}
