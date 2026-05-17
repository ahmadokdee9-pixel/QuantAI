/**
 * QuantAI Live Commerce Discovery — product feed fusion.
 * Merges internal feed + live external results while keeping only clean, useful rows.
 */

import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { assessUniversalListingIdentity } from "./universalListingIdentity";

function rowKey(p: QuantProduct): string {
  try {
    const u = new URL(p.offerOutboundUrl || p.link);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname}`.toLowerCase();
  } catch {
    return `${p.store}:${p.title}:${p.price}`.toLowerCase();
  }
}

function isWeakRow(p: QuantProduct, query: string): boolean {
  if (!p.title || p.title.length < 4) return true;
  if (p.price <= 0 && !p.displayPrice.trim()) return true;
  const id = p.qiListingIdentity ?? assessUniversalListingIdentity(p, query);
  if (id.listingRisk01 >= 0.84 || id.contaminationRisk01 >= 0.8) return true;
  if (id.semanticMismatchPenalty01 >= 0.72) return true;
  if (getMarketplaceSellerRiskTier(p.store, p.title) === "high" && getStoreTrustScore(p.store) < 42) return true;
  return false;
}

function betterRow(a: QuantProduct, b: QuantProduct): QuantProduct {
  const ta = getStoreTrustScore(a.store);
  const tb = getStoreTrustScore(b.store);
  const da = a.outboundRouteKind === "direct_merchant" ? 10 : a.outboundRouteKind === "merchant_search" ? 4 : 0;
  const db = b.outboundRouteKind === "direct_merchant" ? 10 : b.outboundRouteKind === "merchant_search" ? 4 : 0;
  const pa = a.price > 0 ? a.price : Number.POSITIVE_INFINITY;
  const pb = b.price > 0 ? b.price : Number.POSITIVE_INFINITY;
  const sa = ta + da - Math.min(8, pa / 10000);
  const sb = tb + db - Math.min(8, pb / 10000);
  return sa >= sb ? a : b;
}

export function fuseProductFeeds(args: {
  internal: QuantProduct[];
  external: QuantProduct[];
  query: string;
  maxRows?: number;
}): QuantProduct[] {
  const { internal, external, query, maxRows = 72 } = args;
  const merged: QuantProduct[] = [];
  const byKey = new Map<string, QuantProduct>();
  for (const raw of [...internal, ...external]) {
    if (isWeakRow(raw, query)) continue;
    const p = raw.qiListingIdentity ? raw : { ...raw, qiListingIdentity: assessUniversalListingIdentity(raw, query) };
    const key = rowKey(p);
    const prev = byKey.get(key);
    byKey.set(key, prev ? betterRow(prev, p) : p);
  }
  for (const p of byKey.values()) {
    const dup = merged.find((m) => {
      if (m.store.toLowerCase() !== p.store.toLowerCase()) return false;
      const sim = combinedTitleSimilarity(m.title, p.title);
      if (sim < 0.9) return false;
      if (m.price <= 0 || p.price <= 0) return sim >= 0.94;
      return Math.abs(m.price - p.price) / Math.max(m.price, p.price) < 0.035;
    });
    if (dup) {
      const better = betterRow(dup, p);
      if (better !== dup) merged.splice(merged.indexOf(dup), 1, better);
    } else {
      merged.push(p);
    }
  }
  return merged.slice(0, maxRows).map((p, i) => ({ ...p, id: i + 1 }));
}
