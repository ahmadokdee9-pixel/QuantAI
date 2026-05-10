import { getTrustTierLabel } from "@/lib/retailTrust";
import {
  getFinalComposite,
  getStoreTrustScore,
  ratingValue,
  type QuantProduct,
} from "@/lib/shoppingScore";

export type DecisionBand = "buy" | "compare" | "wait";

export function listAveragePrice(list: QuantProduct[]): number {
  const prices = list.map((p) => p.price).filter((n) => n > 0);
  if (!prices.length) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export function maxTrustInList(list: QuantProduct[]): { score: number; store: string } {
  let best = { score: 0, store: "" };
  for (const p of list) {
    const s = getStoreTrustScore(p.store);
    if (s > best.score) best = { score: s, store: p.store };
  }
  return best;
}

export function decisionBand(p: QuantProduct, list: QuantProduct[]): DecisionBand {
  const c = getFinalComposite(p, list);
  const t = getStoreTrustScore(p.store);
  const r = ratingValue(p.rating);
  if (c >= 82 && t >= 72 && r >= 4.1) return "buy";
  if (c >= 64) return "compare";
  return "wait";
}

export function pickSimilarAlternatives(
  p: QuantProduct,
  list: QuantProduct[],
  max = 4
): QuantProduct[] {
  const others = list.filter((x) => x.link !== p.link && x.link);
  const price = p.price;
  if (price > 0) {
    const near = others.filter(
      (x) => x.price > 0 && Math.abs(x.price - price) / price <= 0.38
    );
    const sorted = [...near].sort(
      (a, b) => getFinalComposite(b, list) - getFinalComposite(a, list)
    );
    if (sorted.length >= 2) return sorted.slice(0, max);
  }
  return [...others]
    .sort((a, b) => getFinalComposite(b, list) - getFinalComposite(a, list))
    .slice(0, max);
}

export function quantVerdictLead(p: QuantProduct, list: QuantProduct[]): string {
  const band = decisionBand(p, list);
  const comp = getFinalComposite(p, list);
  const core = p.qiReason?.trim();
  if (core) {
    return p.qiVerdict ? `${p.qiVerdict}. ${core}` : core;
  }
  const tail =
    band === "buy"
      ? "Composite and trust line up—checkout risk looks contained for this snapshot."
      : band === "compare"
        ? "Mixed signals: let a side-by-side pass arbitrate price versus trust before you buy."
        : "Friction dominates—pause, widen the search, or wait for cleaner pricing.";
  return p.qiVerdict ? `${p.qiVerdict}. ${tail} (QI ${comp}).` : `${tail} (QI ${comp}).`;
}

export function confidenceExplanation(p: QuantProduct, composite: number): string {
  const s = p.qiSignals;
  if (!s) {
    return `QI ${composite}/100 without sub-signal payload—refresh search after filters change to tighten Decision Confidence.`;
  }
  const values = [
    s.priceFit,
    s.rating,
    s.reviewDepth,
    s.retailerTrust,
    s.delivery,
    s.popularity,
    s.pricePerformance,
    s.discountQuality,
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const tier =
    composite >= 80 && spread <= 38 ? "High" : composite >= 68 || spread <= 48 ? "Medium" : "Guarded";
  return `${tier} Decision Confidence on QI ${composite}/100: sub-scales ${Math.round(min)}–${Math.round(
    max
  )} (spread ${Math.round(spread)}). Tight + high is stable; wide means one leg is doing most of the work.`;
}

export function recommendedBuyerProfile(p: QuantProduct, list: QuantProduct[]): string {
  const r = ratingValue(p.rating);
  const avg = listAveragePrice(list);
  const c = getFinalComposite(p, list);
  const trust = getStoreTrustScore(p.store);
  if (avg > 0 && p.price <= avg * 0.92 && r >= 4.2) {
    return "Recommended for: capital-light buyers who still want ratings that behave responsibly versus price.";
  }
  if (trust >= 86 && c >= 75) {
    return "Recommended for: trust-maximizers who will pay a modest premium to shrink seller unknowns.";
  }
  if (p.price > 0 && avg > 0 && p.price >= avg * 1.12 && r >= 4.5) {
    return "Recommended for: spec-first shoppers choosing headroom over the cheapest compatible row.";
  }
  if ((p.reviewsCount ?? 0) < 25 && r >= 4.0) {
    return "Recommended for: agile buyers who accept thinner social proof when storefront and price cooperate.";
  }
  return "Recommended for: buyers who treat QuantAI as a first pass—then verify shipping, tax, and warranty live.";
}

export function betterAlternativesInsight(p: QuantProduct, list: QuantProduct[]): string {
  const avg = listAveragePrice(list);
  const r = ratingValue(p.rating);
  const trust = getStoreTrustScore(p.store);
  const parts: string[] = [];
  if (avg > 0 && p.price > avg * 1.08) {
    parts.push("you are willing to trade a small rating gap for a materially lower price");
  }
  if (trust < 72) {
    parts.push("you want a stronger retailer trust signal from a Tier-1 or Tier-2 storefront");
  }
  if (r < 4.2 && r > 0) {
    parts.push("you need a higher rating floor for peace of mind on product quality");
  }
  if (parts.length === 0) {
    return "Better alternatives may exist if you need faster delivery, a longer return window, or a different warranty—dimensions QuantAI cannot see from listings alone.";
  }
  return `Better alternatives may exist if ${parts.join(" or ")}.`;
}

export function trustAnalysisParagraph(p: QuantProduct, list: QuantProduct[]): string {
  const score = getStoreTrustScore(p.store);
  const tier = getTrustTierLabel(p.store);
  const best = maxTrustInList(list);
  const gap = best.score - score;
  const tierLabel =
    tier === "elite"
      ? "elite-tier retailer trust signal"
      : tier === "strong"
        ? "strong retailer trust signal"
        : tier === "standard"
          ? "standard retailer trust signal"
          : "caution-tier retailer trust signal";
  if (gap <= 4) {
    return `Trust ${score}/100 (${tierLabel})—you are essentially tied with ${best.store} (${best.score}) for checkout friction in this tray.`;
  }
  if (gap <= 14) {
    return `Trust ${score}/100 (${tierLabel}); best peer is ${best.store} at ${best.score}—cushion exists, but read policies anyway.`;
  }
  return `Trust ${score}/100 (${tierLabel}) trails ${best.store} (${best.score})—opportunity cost is peace-of-mind unless the discount clears that bar for you.`;
}

export function valueAnalysisParagraph(p: QuantProduct, list: QuantProduct[]): string {
  const s = p.qiSignals;
  const avg = listAveragePrice(list);
  const rel =
    avg > 0 && p.price > 0
      ? p.price <= avg * 0.94
        ? "below the set average"
        : p.price >= avg * 1.08
          ? "above the set average"
          : "near the set average"
      : "within this snapshot";
  const v = s?.pricePerformance ?? null;
  const pf = s?.priceFit ?? null;
  const valueLine =
    v != null && v >= 78
      ? "Specification-to-price ratio leads the tray."
      : v != null && v >= 55
        ? "Specification-to-price is workable, not heroic."
        : "Specification-to-price is tight—either the ask is proud or the stars are soft.";
  const fitLine =
    pf != null && pf >= 75
      ? "Price fit is helping you versus neighbors."
      : pf != null && pf <= 42
        ? "Price fit is a drag—discounts or bundles need to explain the gap."
        : "Price fit is mid-pack.";
  return `${rel} ask. ${fitLine} ${valueLine}`;
}

export function deliveryAnalysisParagraph(p: QuantProduct): string {
  if (!p.shipping?.trim()) {
    return "No shipping snippet—logistics confidence is neutral, not cleared.";
  }
  const s = p.qiSignals?.delivery;
  const tail =
    s != null && s >= 82
      ? "Snippet reads fast / low-friction."
      : s != null && s <= 48
        ? "Snippet reads slow—compare to faster rows if time matters."
        : "Snippet is middling—confirm dates on site.";
  return `“${p.shipping.trim()}”. ${tail}`;
}

export function ratingAnalysisParagraph(p: QuantProduct, list: QuantProduct[]): string {
  const r = ratingValue(p.rating);
  const rc = p.reviewsCount;
  const maxR = Math.max(0, ...list.map((x) => ratingValue(x.rating)));
  if (r <= 0) {
    return "No stars in feed—satisfaction is inferred, not observed.";
  }
  const peer =
    maxR > 0 && r >= maxR - 0.08
      ? "Stars sit at the ceiling for this search."
      : "Stars are respectable, not dominant.";
  const depth =
    rc == null
      ? "Review count unknown—social proof is capped."
      : rc >= 400
        ? `${rc.toLocaleString()} reviews anchor the star read.`
        : rc < 30
          ? `${rc.toLocaleString()} reviews—stars move easily.`
          : `${rc.toLocaleString()} reviews—normal variance.`;
  return `${r.toFixed(1)}★. ${peer} ${depth}`;
}

export function priceTrendInsightParagraph(p: QuantProduct): string {
  const base = p.qiTrendNote?.trim();
  const trend =
    p.priceTrend === "down"
      ? "Feed anchor implies a markdown—momentum favors buyers if quality holds."
      : p.priceTrend === "up"
        ? "Feed anchor moved up—patience or bundles may beat chasing now."
        : "Flat versus anchor—trend is not telling the story here.";
  if (base) return `${base} ${trend}`;
  return trend;
}
