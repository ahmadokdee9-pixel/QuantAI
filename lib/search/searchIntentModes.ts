/**
 * Shared intent-mode helpers — when to use strict vs relaxed identity gating.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

/** Alternative, comparison, category browse, taste/budget — prefer tray over empty. */
export function isRelaxedIdentityLane(canonicalQuery?: CanonicalQueryContract): boolean {
  if (!canonicalQuery) return false;
  if (
    canonicalQuery.category === "fragrance" &&
    canonicalQuery.brand &&
    canonicalQuery.model &&
    !canonicalQuery.semantic.alternativeIntent.active
  ) {
    return true;
  }
  const sem = canonicalQuery.semantic;
  if (sem.alternativeIntent.active) return true;
  const primary = canonicalQuery.intent.primary;
  if (primary === "alternative" || primary === "market_compare") return true;
  if (primary === "best_value" && sem.budgetIntent01 >= 0.4) return true;
  if (primary === "premium" && (sem.premiumIntent01 >= 0.5 || sem.aestheticDirection !== "neutral")) return true;
  if (
    canonicalQuery.marketMode === "category_shopping" ||
    canonicalQuery.marketMode === "broad_discovery"
  ) {
    return true;
  }
  return false;
}

export function isProtectedExactSkuQuery(canonicalQuery?: CanonicalQueryContract): boolean {
  if (!canonicalQuery) return false;
  const q = canonicalQuery.originalQuery.toLowerCase();
  return /(iphone\s*\d{1,2}|ايفون|آيفون|airpods?\s*(pro|max|\d)?|adidas\s+samba)\b/i.test(q);
}
