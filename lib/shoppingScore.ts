import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import {
  getStoreTrustScore,
  TRUSTED_SUBSTRINGS,
} from "@/lib/retailTrust";

export type QuantProduct = {
  id: number;
  title: string;
  store: string;
  price: number;
  displayPrice: string;
  rating: number | string;
  link: string;
  image: string;
  reviewsCount: number | null;
  shipping: string | null;
  availability: string | null;
  oldPrice: number | null;
  priceTrend: "down" | "up" | "stable";
  extensions: string[];
};

export { getStoreTrustScore };

export function ratingValue(rating: number | string): number {
  const n = Number(rating);
  return Number.isFinite(n) ? n : 0;
}

/** Same heuristic as legacy home ranking — deterministic. */
export function getHeuristicScore(p: QuantProduct): number {
  let score = 50;
  const rating = ratingValue(p.rating);

  if (p.price < 300) score += 20;
  else if (p.price < 800) score += 14;
  else if (p.price < 1500) score += 8;

  if (rating >= 4.7) score += 25;
  else if (rating >= 4.4) score += 18;
  else if (rating >= 4) score += 10;

  const store = p.store.toLowerCase();
  if (TRUSTED_SUBSTRINGS.some((t) => store.includes(t))) {
    score += 12;
  }

  return Math.min(100, Math.round(score));
}

export function getCompositeScore(p: QuantProduct, list: QuantProduct[]): number {
  const h = getHeuristicScore(p);
  const ai = calculateAIScore(p, list).score;
  const trust = getStoreTrustScore(p.store);
  const reviewBoost =
    p.reviewsCount != null && p.reviewsCount > 50
      ? Math.min(5, Math.log10(p.reviewsCount + 1))
      : 0;
  const raw = h * 0.42 + ai * 0.4 + trust * 0.12 + reviewBoost * 0.06;
  return Math.min(100, Math.round(raw));
}

export function sortByCompositeRank(list: QuantProduct[]): QuantProduct[] {
  return [...list].sort(
    (a, b) => getCompositeScore(b, list) - getCompositeScore(a, list)
  );
}

/** Model-layer AI score (same formula used on cards). */
export function sortByBestAIScore(list: QuantProduct[]): QuantProduct[] {
  const copy = [...list];
  return copy.sort(
    (a, b) =>
      calculateAIScore(b, list).score - calculateAIScore(a, list).score
  );
}

export function sortByTrust(list: QuantProduct[]): QuantProduct[] {
  return [...list].sort(
    (a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store)
  );
}

export type PriceTrendLabel = "down" | "up" | "stable";

export function computePriceTrend(
  current: number,
  old: number | null
): PriceTrendLabel {
  if (old == null || old <= 0 || !Number.isFinite(old)) return "stable";
  if (current < old * 0.985) return "down";
  if (current > old * 1.015) return "up";
  return "stable";
}

export type ProfessionalBadge =
  | "ai_pick"
  | "best_value"
  | "top_rated"
  | "budget_pick"
  | "premium_choice"
  | "solid_pick";

export function getProfessionalBadge(
  p: QuantProduct,
  list: QuantProduct[],
  rankByComposite: number
): { key: ProfessionalBadge; label: string } {
  const prices = list.map((x) => x.price).filter((n) => n > 0);
  const minP = prices.length ? Math.min(...prices) : p.price;
  const maxP = prices.length ? Math.max(...prices) : p.price;
  const ratings = list.map((x) => ratingValue(x.rating));
  const maxR = Math.max(...ratings, 0);
  const medianPrice =
    prices.length > 0
      ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]
      : p.price;

  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const ai = calculateAIScore(p, list);

  if (rankByComposite === 0 && list.length > 0) {
    return { key: "ai_pick", label: "AI Pick" };
  }
  if (ai.label === "Best Value" || (p.price <= medianPrice && r >= 4.2)) {
    return { key: "best_value", label: "Best Value" };
  }
  if (r >= maxR - 0.05 && r >= 4.0 && list.length > 1) {
    return { key: "top_rated", label: "Top Rated" };
  }
  if (p.price <= minP * 1.05 && p.price <= medianPrice && list.length > 2) {
    return { key: "budget_pick", label: "Budget Pick" };
  }
  if (p.price >= maxP * 0.85 && r >= 4.2 && trust >= 80) {
    return { key: "premium_choice", label: "Premium Choice" };
  }
  return { key: "solid_pick", label: "Solid Pick" };
}

export function getProsAndCons(
  p: QuantProduct,
  list: QuantProduct[]
): { pros: string[]; cons: string[] } {
  const avgPrice =
    list.length > 0
      ? list.reduce((a, x) => a + x.price, 0) / list.length
      : p.price;
  const r = ratingValue(p.rating);
  const trust = getStoreTrustScore(p.store);
  const pros: string[] = [];
  const cons: string[] = [];

  if (p.price <= avgPrice * 0.92) {
    pros.push("Priced below the average for this search");
  } else if (p.price > avgPrice * 1.12) {
    cons.push("Priced above the median of current results");
  }

  if (r >= 4.5) {
    pros.push("Strong customer rating signal");
  } else if (r > 0 && r < 4) {
    cons.push("Weaker rating vs. other options in this set");
  }

  if (trust >= 85) {
    pros.push("Retailer matches high-trust patterns we weight heavily");
  } else if (trust < 60) {
    cons.push("Less familiar retailer—double-check policies at checkout");
  }

  if (p.reviewsCount != null && p.reviewsCount >= 100) {
    pros.push(`Many reviews (${p.reviewsCount.toLocaleString()})—more signal on quality`);
  } else if (p.reviewsCount != null && p.reviewsCount < 20 && r > 0) {
    cons.push("Fewer reviews—ratings may be less stable");
  }

  if (p.priceTrend === "down") {
    pros.push("Listed below a previous reference price in this feed");
  } else if (p.priceTrend === "up") {
    cons.push("Listed above a previous reference price in this feed");
  }

  if (p.shipping) {
    pros.push(`Shipping: ${p.shipping}`);
  }

  if (pros.length === 0) {
    pros.push("Fits your current filters and search context");
  }
  if (cons.length === 0 && pros.length > 3) {
    cons.push("Always verify final price with shipping and tax");
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 3) };
}

export function getWhyQuantAIRecommends(
  p: QuantProduct,
  list: QuantProduct[],
  composite: number
): string {
  const avgPrice =
    list.length > 0
      ? list.reduce((a, x) => a + x.price, 0) / list.length
      : p.price;
  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const parts: string[] = [];
  parts.push(
    `Composite rank ${composite}/100 blends price fit, ratings, retailer trust, and relative value in this result set.`
  );
  if (p.price <= avgPrice) {
    parts.push("Price sits at or under the current average for these listings.");
  }
  if (r >= 4.3) {
    parts.push("Ratings suggest consistent buyer satisfaction.");
  }
  if (trust >= 85) {
    parts.push("Store signal aligns with retailers we treat as lower-friction.");
  }
  return parts.join(" ");
}
