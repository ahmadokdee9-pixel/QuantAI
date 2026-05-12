import type {
  CommerceRiskFlag,
  ProductCommerceAI,
} from "@/lib/intelligence/commerceAnalysisTypes";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function risksFromProduct(p: QuantProduct, list: QuantProduct[]): CommerceRiskFlag[] {
  const out: CommerceRiskFlag[] = [];
  const sig = p.qiSignals;
  const rating = ratingValue(p.rating);
  const trust = getStoreTrustScore(p.store);

  if (p.priceTrend === "down" && (sig?.discountQuality ?? 50) < 42) {
    out.push({
      code: "DISCOUNT_SIGNAL",
      severity: "medium",
      label: "Promo or list-price gap looks aggressive — confirm the real street price.",
    });
  }
  if ((p.reviewsCount ?? 0) < 12 && rating > 0) {
    out.push({
      code: "THIN_REVIEWS",
      severity: "medium",
      label: "Few reviews visible — score may not be battle-tested yet.",
    });
  }
  if (trust < 58) {
    out.push({
      code: "RETAILER_VARIANCE",
      severity: trust < 45 ? "high" : "low",
      label: "Less familiar storefront — double-check seller identity and buyer protection.",
    });
  }
  if (rating > 0 && rating < 3.9) {
    out.push({
      code: "WEAK_RATING",
      severity: "high",
      label: "User rating is soft versus typical picks in this tray.",
    });
  }
  const maxR = Math.max(1, ...list.map((x) => x.reviewsCount ?? 0));
  if ((p.reviewsCount ?? 0) > 0 && (p.reviewsCount ?? 0) < maxR * 0.08 && maxR > 80) {
    out.push({
      code: "REVIEW_DEPTH_GAP",
      severity: "low",
      label: "Review volume trails the most-reviewed alternative in this result set.",
    });
  }
  return out.slice(0, 5);
}

function valueForMoneyScore(p: QuantProduct): number {
  const sig = p.qiSignals;
  const base =
    50 +
    (sig?.pricePerformance ?? 50) * 0.22 +
    (sig?.discountQuality ?? 50) * 0.18 +
    (sig?.priceFit ?? 50) * 0.2 +
    (sig?.retailerTrust ?? 50) * 0.15 +
    (sig?.rating ?? 50) * 0.15 +
    (sig?.reviewDepth ?? 50) * 0.1;
  return clamp(Math.round(base), 0, 100);
}

function confidenceScore(p: QuantProduct): number {
  const sig = p.qiSignals;
  const spread =
    (sig?.rating ?? 0) +
    (sig?.reviewDepth ?? 0) +
    (sig?.retailerTrust ?? 0) +
    (p.reviewsCount != null && p.reviewsCount > 30 ? 25 : 10);
  return clamp(Math.round(38 + spread * 0.22), 15, 88);
}

export function heuristicCommerceForProduct(
  p: QuantProduct,
  query: string,
  list: QuantProduct[]
): ProductCommerceAI {
  const verdict = (p.qiVerdict ?? "").trim() || "Neutral tray position — compare shipping and final checkout price.";
  const reason = (p.qiReason ?? "").trim();
  const pros: string[] = [];
  const cons: string[] = [];

  if ((p.qiComposite ?? 0) >= 72) pros.push("Strong QuantAI composite versus this search tray.");
  else if ((p.qiComposite ?? 0) >= 58) pros.push("Balanced signal mix — viable if logistics fit.");
  else pros.push("Worth a look if price or niche availability is the priority.");

  const rt = getStoreTrustScore(p.store);
  if (rt >= 78) pros.push(`Retailer trust prior is high (${rt}/100 heuristic).`);
  if (ratingValue(p.rating) >= 4.5) pros.push("Rating looks healthy for the category.");

  if ((p.qiComposite ?? 0) < 52) cons.push("Composite trails top picks — verify why before committing.");
  if (rt < 62) cons.push("Store signal is thinner — read return and dispute policies carefully.");
  if ((p.reviewsCount ?? 0) < 20) cons.push("Limited public review depth in the feed.");

  if (reason.length > 12) {
    const half = Math.min(reason.length, 220);
    pros.push(reason.slice(0, half));
  }

  const ship = (p.shipping ?? "").trim();
  const deliveryIntel =
    ship.length > 2 ? ship.slice(0, 180) : "No explicit delivery line in feed — confirm at checkout.";

  const returnsIntel =
    "Return policy not in shopping feed — check retailer policy and restocking fees before purchase.";

  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const minP = prices.length ? Math.min(...prices) : p.price;
  const maxP = prices.length ? Math.max(...prices) : p.price;

  const comparedToFieldNote =
    prices.length > 1
      ? `Price sits ${p.price <= minP * 1.02 ? "at or near" : "above"} the cheapest visible listing in this tray (spread €${minP}–€${maxP}).`
      : "Single visible price point in this slice — widen search for spread context.";

  const q = query.trim().toLowerCase();
  const title = p.title.toLowerCase();
  const semanticVsQuery =
    q.length > 2 && title.includes(q.slice(0, Math.min(24, q.length)))
      ? "Title aligns closely with the query string."
      : (p.qiSignals?.categoryFit ?? 50) >= 62
        ? "Category/intent fit looks reasonable versus the query."
        : "Semantic match is uncertain — compare specs to your intent.";

  return {
    buyingVerdict: verdict,
    pros: pros.slice(0, 4).map((s) => s.slice(0, 200)),
    cons: cons.slice(0, 4).map((s) => s.slice(0, 200)),
    risks: risksFromProduct(p, list),
    valueForMoney: valueForMoneyScore(p),
    confidence: confidenceScore(p),
    deliveryIntel,
    returnsIntel,
    trustWeightedNote: `Trust-weighted read: store prior ${rt}/100; composite ${Math.round(p.qiComposite ?? 0)}.`,
    semanticVsQuery: semanticVsQuery.slice(0, 200),
    comparedToFieldNote: comparedToFieldNote.slice(0, 200),
    modelId: "heuristic-v1",
    source: "heuristic",
  };
}

export function heuristicFieldComparisonSummary(list: QuantProduct[], query: string): string {
  if (!list.length) return "";
  const prices = list.map((p) => p.price).filter((p) => p > 0);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;
  const bestTrust = [...list].sort((a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store))[0];
  const n = list.length;
  return `Tray (${n}): “${query.slice(0, 80)}${query.length > 80 ? "…" : ""}”. €${minP}–€${maxP} visible spread; strongest store prior: ${bestTrust?.store ?? "n/a"}.`;
}
