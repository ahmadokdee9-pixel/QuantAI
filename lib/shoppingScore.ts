import { calculateAIScore } from "@/app/api/search/lib/aiScoring";
import type { ProductCommerceAI, QiPredictiveCommerce } from "@/lib/intelligence/commerceAnalysisTypes";
import type { IntelligenceSignals, ProductCategorySlug } from "@/lib/intelligence/types";
import type { QuantAIRealityTrustLayer } from "@/lib/intelligence/realityTrustTypes";
import type { ProductRelationshipBundle } from "@/lib/intelligence/relationshipTypes";
import type { HumanIntentProfile } from "@/lib/intelligence/humanIntentEngine";
import type { RegretRiskLevel } from "@/lib/intelligence/regretRisk";
import type { ProductUnderstanding } from "@/lib/intelligence/productUnderstanding";
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
  /** Server-enriched composite intelligence score (0–100). */
  qiComposite?: number;
  qiModelLayer?: number;
  qiReason?: string;
  qiSignals?: IntelligenceSignals;
  qiRank?: number;
  qiCategory?: ProductCategorySlug;
  qiTrendProjection?: string;
  qiTrendNote?: string;
  /** Adaptive headline verdict from the narrative engine. */
  qiVerdict?: string;
  /** One-line purchase-psychology read. */
  qiPsychology?: string;
  /** Tray-local relationship graph edges (substitutes, upgrades, aesthetic peers). */
  qiRelationshipBundle?: ProductRelationshipBundle;
  /** Discovery tags: hidden_gem, underrated, premium_look_budget, low_risk_substitute, trusted_substitute. */
  qiDiscoveryTags?: string[];
  /** Why this row matches substitute / alternative intent (relationship intelligence). */
  qiAlternativeWhy?: string;
  /** Predictive timing / outlook / probabilities (tray-local heuristics). */
  qiPredictive?: QiPredictiveCommerce;
  /** Reality & trust v1 — listing realism, manipulation risk, retailer integrity (0–100 realityScore). */
  qiRealityTrust?: QuantAIRealityTrustLayer;
  /** AI commerce layer: verdicts, pros/cons, risks, VfM, confidence, delivery/returns notes (OpenAI or heuristic). */
  qiCommerce?: ProductCommerceAI;
  /** Best outbound click target (merchant direct or store search); falls back to `link`. */
  offerOutboundUrl?: string;
  /** How `offerOutboundUrl` was resolved (signals / ranking only). */
  outboundRouteKind?: "direct_merchant" | "merchant_search" | "google_interstitial" | "google_fallback";
  /** Query-level human shopping psychology snapshot (tray-wide, duplicated per row for typing). */
  qiHumanIntentProfile?: HumanIntentProfile;
  /** Post-enrichment regret risk tier (ranking + consensus voice). */
  qiRegretRiskLevel?: RegretRiskLevel;
  /** Product understanding v1 — listing DNA, specs, query fit (tray enrichment). */
  qiProductUnderstanding?: ProductUnderstanding;
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

/** Prefer server composite when present (single source of truth). */
export function getFinalComposite(p: QuantProduct, list: QuantProduct[]): number {
  if (p.qiComposite != null && Number.isFinite(p.qiComposite)) {
    return Math.min(100, Math.max(0, Math.round(p.qiComposite)));
  }
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

export function getCompositeScore(p: QuantProduct, list: QuantProduct[]): number {
  return getFinalComposite(p, list);
}

export function sortByCompositeRank(list: QuantProduct[]): QuantProduct[] {
  return [...list].sort(
    (a, b) => getFinalComposite(b, list) - getFinalComposite(a, list)
  );
}

/** Model-layer score: server `qiModelLayer` when present, else legacy heuristic. */
export function sortByBestAIScore(list: QuantProduct[]): QuantProduct[] {
  const copy = [...list];
  return copy.sort((a, b) => {
    const ba =
      b.qiModelLayer != null && Number.isFinite(b.qiModelLayer)
        ? b.qiModelLayer
        : calculateAIScore(b, list).score;
    const aa =
      a.qiModelLayer != null && Number.isFinite(a.qiModelLayer)
        ? a.qiModelLayer
        : calculateAIScore(a, list).score;
    return ba - aa;
  });
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
  const comp = getFinalComposite(p, list);

  if (rankByComposite === 0 && list.length > 0) {
    return { key: "ai_pick", label: "Top Pick" };
  }
  if (ai.label === "Best Value" || (p.price <= medianPrice && r >= 4.2 && comp >= 72)) {
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
    pros.push("Ask under basket average—value headroom without begging for excuses.");
  } else if (p.price > avgPrice * 1.12) {
    cons.push("Priced above tray median—needs ratings or trust to carry the premium.");
  }

  if (r >= 4.5) {
    pros.push("Star stack is strong for this set—social proof cooperates with the ask.");
  } else if (r > 0 && r < 4) {
    cons.push("Stars trail neighbors—quality doubt is the main drag.");
  }

  if (trust >= 85) {
    pros.push("Store fingerprint looks low-friction versus typical web sellers.");
  } else if (trust < 60) {
    cons.push("Store fingerprint is thin—earn the discount with policy homework.");
  }

  if (p.reviewsCount != null && p.reviewsCount >= 100) {
    pros.push(`${p.reviewsCount.toLocaleString()} reviews—crowd signal is loud enough to trust.`);
  } else if (p.reviewsCount != null && p.reviewsCount < 20 && r > 0) {
    cons.push("Few voices in reviews—treat stars as provisional.");
  }

  if (p.priceTrend === "down") {
    pros.push("Feed anchor implies a markdown—momentum can favor a disciplined buy.");
  } else if (p.priceTrend === "up") {
    cons.push("Feed anchor moved up—patience may buy you a cleaner entry.");
  }

  if (p.shipping) {
    pros.push(`Shipping cue: ${p.shipping}`);
  }

  if (pros.length === 0) {
    pros.push("Neutral cross-signals—open the intelligence deck for the full read.");
  }
  if (cons.length === 0 && pros.length > 3) {
    cons.push("Reconcile tax, shipping, and live checkout price before you commit.");
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 3) };
}

export function getWhyQuantAIRecommends(
  p: QuantProduct,
  list: QuantProduct[],
  composite: number
): string {
  if (p.qiReason && p.qiReason.trim()) {
    return `${p.qiReason.trim()} (${composite} QI, this search only).`;
  }
  const avgPrice =
    list.length > 0
      ? list.reduce((a, x) => a + x.price, 0) / list.length
      : p.price;
  const trust = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  const parts: string[] = [];
  parts.push(
    `QI ${composite}/100 blends price fit, stars, trust, delivery text, discounts, and category priors for this tray.`
  );
  if (p.price <= avgPrice) {
    parts.push("Ask is not fighting the average—headroom exists if reviews behave.");
  }
  if (r >= 4.3) {
    parts.push("Sentiment skews constructive.");
  }
  if (trust >= 85) {
    parts.push("Seller pattern reads calmer than the open-web baseline.");
  }
  return parts.slice(0, 2).join(" ");
}
