/**
 * Unified market verdict per product family — complements per-card consensus.
 */

import type { FamilyPriceMap } from "@/lib/intelligence/marketPriceMap";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

export type FamilyMarketVerdict = "best_trusted_value" | "wait_for_better" | "mixed" | "premium_trusted" | "neutral";

export type FamilyMarketConsensus = {
  verdict: FamilyMarketVerdict;
  bestTrustedLink: string | null;
  lowestRiskLink: string | null;
  strongestValueLink: string | null;
  headline: string;
};


export function buildFamilyMarketConsensus(
  members: QuantProduct[],
  priceMap: FamilyPriceMap
): FamilyMarketConsensus {
  const { cheapestTrusted, premiumTrusted, spreadPct, medianPrice, overpricedLinks } = priceMap;
  const bestTrustedLink = cheapestTrusted?.link ?? null;

  let lowestRiskLink: string | null = null;
  let bestTrust = -1;
  for (const p of members) {
    const t = getStoreTrustScore(p.store);
    if (t > bestTrust && p.price > 0) {
      bestTrust = t;
      lowestRiskLink = p.link;
    }
  }

  let strongestValueLink: string | null = bestTrustedLink;
  if (cheapestTrusted) {
    let bestScore = -1;
    for (const p of members) {
      if (p.price <= 0) continue;
      const t = getStoreTrustScore(p.store);
      const r = ratingValue(p.rating);
      if (t < 66) continue;
      if (p.price > cheapestTrusted.price * 1.08) continue;
      const score = r * 18 + t;
      if (score > bestScore) {
        bestScore = score;
        strongestValueLink = p.link;
      }
    }
  }

  let verdict: FamilyMarketVerdict = "neutral";
  let headline = "Family pricing is tight across matched stores.";

  if (spreadPct >= 28 && cheapestTrusted) {
    verdict = "best_trusted_value";
    headline = `Trusted offers diverge — best trusted sits ~${spreadPct}% below the family ceiling.`;
  } else if (overpricedLinks.length >= Math.ceil(members.length / 2) && medianPrice > 0) {
    verdict = "mixed";
    headline = "Wide seller spread — verify the cheapest trusted row before paying a premium.";
  } else if (premiumTrusted && cheapestTrusted && premiumTrusted.link !== cheapestTrusted.link) {
    verdict = "premium_trusted";
    headline = "Premium trusted option exists if you want maximum seller footing over absolute minimum price.";
  }

  const dropSignals = members.filter((p) => p.priceTrend === "down").length;
  if (dropSignals >= Math.max(2, Math.floor(members.length * 0.6)) && spreadPct < 15) {
    verdict = "wait_for_better";
    headline = "Family trend points soft — a short wait may improve entry without changing SKU.";
  }

  return {
    verdict,
    bestTrustedLink,
    lowestRiskLink,
    strongestValueLink,
    headline,
  };
}
