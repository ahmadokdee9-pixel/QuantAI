/**
 * Phase 42 — Alternative Discovery Engine.
 * Find objectively better options before final ranking.
 */

import type { EquivalentMatchResult } from "@/lib/intelligence/equivalentProductMatchingEngine";
import { findEquivalentMatches } from "@/lib/intelligence/equivalentProductMatchingEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type AlternativeKind =
  | "Same Product"
  | "Equivalent Product"
  | "Better Value Product"
  | "Category Leader"
  | "Budget Alternative"
  | "Premium Alternative";

export type AlternativeDiscovery = {
  version: 1;
  alternatives: Array<{ kind: AlternativeKind; title: string; store: string; price: number; link: string }>;
  betterAlternativeExists: boolean;
  promoteAlternative: boolean;
  promotionTarget: string | null;
  reasoning: string;
};

/** Discover alternatives and flag promotions when objectively better exists. */
export function discoverAlternatives(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  searchQuery: string;
  equivalentMatches?: EquivalentMatchResult;
  valueScore: number;
  categoryLeaderLink?: string | null;
}): AlternativeDiscovery {
  const { product, tray, searchQuery, valueScore } = args;
  const matches = args.equivalentMatches ?? findEquivalentMatches(product, tray, searchQuery);

  const alternatives: AlternativeDiscovery["alternatives"] = [];
  const prices = tray.map((p) => p.price).filter((p) => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (matches.bestSameProductCheaper) {
    alternatives.push({
      kind: "Same Product",
      title: matches.bestSameProductCheaper.title,
      store: matches.bestSameProductCheaper.store,
      price: matches.bestSameProductCheaper.price,
      link: matches.bestSameProductCheaper.link,
    });
  }

  for (const m of matches.equivalentMatches.slice(0, 2)) {
    alternatives.push({
      kind: "Equivalent Product",
      title: m.title,
      store: m.store,
      price: m.price,
      link: m.link,
    });
  }

  if (matches.bestCheaperAlternative) {
    alternatives.push({
      kind: "Better Value Product",
      title: matches.bestCheaperAlternative.title,
      store: matches.bestCheaperAlternative.store,
      price: matches.bestCheaperAlternative.price,
      link: matches.bestCheaperAlternative.link,
    });
  }

  const budgetAlt = tray.find((p) => p.price === minPrice && p.link !== product.link);
  if (budgetAlt) {
    alternatives.push({
      kind: "Budget Alternative",
      title: budgetAlt.title,
      store: budgetAlt.store,
      price: budgetAlt.price,
      link: budgetAlt.link,
    });
  }

  const premiumAlt = [...tray].sort((a, b) => b.price - a.price)[0];
  if (premiumAlt && premiumAlt.link !== product.link) {
    alternatives.push({
      kind: "Premium Alternative",
      title: premiumAlt.title,
      store: premiumAlt.store,
      price: premiumAlt.price,
      link: premiumAlt.link,
    });
  }

  const leader = args.categoryLeaderLink
    ? tray.find((p) => p.link === args.categoryLeaderLink)
    : [...tray].sort((a, b) => (b.rating as number) - (a.rating as number))[0];
  if (leader && leader.link !== product.link) {
    alternatives.push({
      kind: "Category Leader",
      title: leader.title,
      store: leader.store,
      price: leader.price,
      link: leader.link,
    });
  }

  const betterValue = matches.bestCheaperAlternative ?? matches.bestSameProductCheaper;
  const betterAlternativeExists = Boolean(
    betterValue && betterValue.link !== product.link && betterValue.price < product.price
  );

  const promoteAlternative =
    betterAlternativeExists &&
    valueScore < 75 &&
    betterValue!.price < product.price * 0.92;

  return {
    version: 1,
    alternatives: alternatives.slice(0, 6),
    betterAlternativeExists,
    promoteAlternative,
    promotionTarget: promoteAlternative ? betterValue!.title.split(" ").slice(0, 4).join(" ") : null,
    reasoning: promoteAlternative
      ? `Better alternative at ${betterValue!.store} — objectively stronger value for similar money.`
      : betterAlternativeExists
        ? "Alternatives exist — compare before checkout."
        : "No objectively better alternative found in this search universe.",
  };
}
