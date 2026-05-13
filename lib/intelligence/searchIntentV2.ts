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
  /** Explicit “best value” / price-to-quality language. */
  explicitBestValue: boolean;
  /** User language skews toward headline markdown depth. */
  dealHunter: boolean;
  /** Cheapest acceptable row from a trusted storefront. */
  cheapestTrusted: boolean;
};

export function parseCommerceSearchIntents(q: string): CommerceSearchIntents {
  const s = q.toLowerCase();
  return {
    budget:
      /\b(cheap|budget|affordable|lowest|under\s+(\$|€|£)|save|discount|clearance|bargain)\b/.test(s),
    premium:
      /\b(premium|flagship|pro\b|max\b|ultra|studio|workstation|oled|luxury tier|high.end)\b/.test(s),
    gaming:
      /\b(gaming|gamer|rtx|geforce|playstation|xbox|nintendo|steam deck|144hz|240hz|esports)\b/.test(s),
    productivity:
      /\b(work|office|business|student|ultrabook|macbook pro|thinkpad|productivity|wfh|remote work)\b/.test(s),
    luxury: /\b(luxury|designer|boutique|haute|limited edition|collector)\b/.test(s),
    trustedOnly:
      /\b(trusted|reputable|safe seller|official store|first.party|authorized|warranty|no marketplace)\b/.test(s),
    explicitBestValue:
      /\b(best value|bang for (the )?buck|price.to.quality|value leader|value\s+pick)\b/.test(s),
    dealHunter:
      /\b(biggest|deepest|largest|steepest)\s+(discount|markdown|sale)|\b(max|highest)\s*%?\s*off|half\s+price|doorbuster|flash\s+sale\b/.test(
        s
      ),
    cheapestTrusted:
      /\b(cheapest\s+trusted|trusted\s+cheapest|lowest\s+.+\s+trusted|cheap(er)?\s+.+\s+trusted)\b/.test(s) ||
      /\btrusted\s+(cheap|cheapest|lowest)\b/.test(s),
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
  if (intents.dealHunter && d != null && d > 0.1) {
    lift += Math.min(0.042, 0.01 + d * 0.055);
  }
  return lift;
}
