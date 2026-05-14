import { getStoreTrustScore } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSearchIntents } from "./searchIntentV2";
import { buildProductRelationshipBundle } from "@/lib/intelligence/productRelationshipGraph";
import { classifyDiscoveryProfile } from "@/lib/intelligence/alternativeIntelligence";

function tokenizeCommerce(s: string): Set<string> {
  const raw = s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/gi, " ");
  const set = new Set<string>();
  for (const w of raw.split(/\s+/)) {
    if (w.length >= 3) set.add(w);
  }
  return set;
}

/**
 * When the shopper asks for substitutes / “like X but cheaper”, reward listings that
 * lexically overlap the ask while undercutting the tray median with acceptable trust.
 */
export function alternativeSeekingRankAdjustment(
  query: string,
  product: QuantProduct,
  medianTrayPrice: number,
  intents: CommerceSearchIntents
): number {
  if (!intents.alternativeSeeking || !query.trim()) return 0;
  const q = tokenizeCommerce(query);
  const t = tokenizeCommerce(product.title);
  let overlap = 0;
  for (const w of q) {
    if (t.has(w)) overlap++;
  }
  if (overlap < 2) return 0;

  const trust = getStoreTrustScore(product.store);
  let adj = 0.45 * overlap;
  if (medianTrayPrice > 0 && product.price > 0 && product.price <= medianTrayPrice * 0.93) adj += 1.35;
  if (trust >= 78) adj += 0.55;
  if (trust < 52) adj -= 0.9;
  if (/\b(cheaper|similar|instead|alternative|like)\b/i.test(query) && product.price > 0 && medianTrayPrice > 0) {
    adj += 0.35;
  }
  return Math.min(6.8, adj);
}

/**
 * Relationship graph + discovery-aware rank delta (substitute / “similar to” intelligence).
 */
export function relationshipGraphRankAdjustment(
  query: string,
  product: QuantProduct,
  list: QuantProduct[],
  intents: CommerceSearchIntents
): number {
  if (!intents.substituteSemanticActive && !intents.alternativeSeeking) return 0;
  if (!query.trim() || list.length < 2) return 0;
  const bundle = buildProductRelationshipBundle(product, list, query, intents.alternativeQuery, intents, intents.taste);
  const profile = classifyDiscoveryProfile(product, list, intents, bundle);
  let adj = bundle.universalSimilarity01 * 4.6;
  adj -= bundle.substituteRisk01 * 6.8;
  for (const tag of profile.tags) {
    if (tag === "hidden_gem") adj += 1.65;
    else if (tag === "trusted_substitute") adj += 1.45;
    else if (tag === "low_risk_substitute") adj += 1.15;
    else if (tag === "premium_look_budget") adj += 0.95;
    else if (tag === "underrated") adj += 0.75;
  }
  return Math.min(7.8, Math.max(-6.5, adj));
}
