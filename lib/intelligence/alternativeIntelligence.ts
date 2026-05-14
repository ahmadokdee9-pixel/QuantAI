/**
 * Discovery tags + “why this alternative” narrative lines (tray-local).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { CommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import type { AlternativeQueryContext } from "@/lib/commerce-os/alternativeSemantics";
import type { ProductRelationshipBundle } from "@/lib/intelligence/relationshipTypes";

export type DiscoveryTag =
  | "hidden_gem"
  | "underrated"
  | "premium_look_budget"
  | "low_risk_substitute"
  | "trusted_substitute";

export type DiscoveryProfile = {
  tags: DiscoveryTag[];
  substituteRisk01: number;
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function classifyDiscoveryProfile(
  p: QuantProduct,
  list: QuantProduct[],
  intents: CommerceSearchIntents,
  bundle: ProductRelationshipBundle
): DiscoveryProfile {
  const tags: DiscoveryTag[] = [];
  const comps = list.map((x) => getFinalComposite(x, list));
  const maxC = Math.max(1, ...comps);
  const med = median(comps);
  const qc = getFinalComposite(p, list);
  const trust = getStoreTrustScore(p.store);
  const rev = p.reviewsCount ?? 0;
  const maxRev = Math.max(1, ...list.map((x) => x.reviewsCount ?? 0));
  const stars = ratingValue(p.rating);
  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const medP = prices.length ? median(prices) : 0;

  if (qc >= med + 5 && qc >= maxC - 14 && rev < maxRev * 0.22 && rev < 90 && trust >= 64) {
    tags.push("hidden_gem");
  }
  if (stars >= 4.35 && rev < 45 && qc >= med - 3 && qc < maxC - 4) {
    tags.push("underrated");
  }
  if (
    medP > 0 &&
    p.price > 0 &&
    p.price <= medP * 0.88 &&
    bundle.universalSimilarity01 >= 0.38 &&
    (intents.taste.visualPremiumExpect01 >= 0.42 || intents.aestheticPremium)
  ) {
    tags.push("premium_look_budget");
  }
  if (
    (intents.substituteSemanticActive || intents.alternativeSeeking) &&
    trust >= 72 &&
    bundle.universalSimilarity01 >= 0.32 &&
    bundle.substituteRisk01 < 0.42
  ) {
    tags.push("low_risk_substitute");
  }
  if (trust >= 82 && bundle.universalSimilarity01 >= 0.28 && bundle.substituteRisk01 < 0.35) {
    tags.push("trusted_substitute");
  }

  return { tags: [...new Set(tags)], substituteRisk01: bundle.substituteRisk01 };
}

export function buildAlternativeWhyLine(
  p: QuantProduct,
  list: QuantProduct[],
  intents: CommerceSearchIntents,
  alt: AlternativeQueryContext,
  bundle: ProductRelationshipBundle,
  profile: DiscoveryProfile
): string | undefined {
  if (!intents.substituteSemanticActive && !intents.alternativeSeeking && profile.tags.length === 0) {
    return undefined;
  }

  const parts: string[] = [];
  if (bundle.cheaperAlternative.length && alt.wantsCheaper) {
    parts.push("tray lists cheaper peers with overlapping title tokens—QuantAI treats that as a value substitute lane");
  }
  if (bundle.longTermUpgrade.length && intents.longTermValue) {
    parts.push("a higher-composite neighbor exists if you want a longer-horizon upgrade path");
  }
  if (bundle.aestheticMatch.length && intents.taste.hasTasteLayer) {
    parts.push("taste-graph alignment on this row overlaps peer aesthetics you implied in language");
  }
  if (profile.tags.includes("premium_look_budget")) {
    parts.push("premium-adjacent language matches while price sits under the tray median");
  }
  if (profile.tags.includes("trusted_substitute")) {
    parts.push("trusted-store posture lowers checkout risk versus noisy clone listings");
  }
  if (bundle.substituteRisk01 >= 0.45) {
    parts.push("substitute-risk heuristics are elevated—verify SKU, warranty region, and seller identity");
  }
  if (parts.length === 0 && bundle.universalSimilarity01 >= 0.4) {
    parts.push("universal similarity blends relevance, anchor overlap, taste, trust, and composite shape for this tray");
  }
  if (parts.length === 0) return undefined;
  return parts.join("; ").slice(0, 420);
}
