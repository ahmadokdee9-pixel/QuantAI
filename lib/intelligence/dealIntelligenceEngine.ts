import { fakeDiscountRisk, dealVerdictFor } from "@/lib/deals/dealAnalysis";
import type { DealVerdict, FakeDiscountRisk } from "@/lib/deals/types";
import { scoreDeliverySpeed } from "@/lib/intelligence/deliveryScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";

/** Premium AI-native deal verdicts (tray + cluster context). */
export type QuantAIDealVerdict =
  | "Buy Now"
  | "Great Deal"
  | "Fair Price"
  | "Wait for Better Deal"
  | "Risky Discount"
  | "Premium but Trusted"
  | "Best Trusted Option"
  | "High-Confidence Discount";

export type DealTimingCategory = "strong_window" | "neutral" | "wait_favored" | "unstable_tray";

export type ProductDealIntelligence = {
  aiDealVerdict: QuantAIDealVerdict;
  baseDealVerdict: DealVerdict;
  fakeDiscountRisk: FakeDiscountRisk;
  dealConfidence: number;
  discountAuthenticity: number;
  valueOpportunity: number;
  retailerAdjustedDealScore: number;
  fairMarketEstimate: number;
  categoryBaselineEstimate: number;
  overpricedVsTray: boolean;
  underpricedAnomaly: boolean;
  goodTimeToBuy: boolean;
  waitForBetterPricing: boolean;
  timingCategory: DealTimingCategory;
  timingSummary: string;
  authenticityLines: string[];
  whyDealGoodOrRisky: string;
  inflatedAnchorSuspected: boolean;
  urgencySuspected: "none" | "low" | "elevated";
  discountPct: number | null;
  savingsVsFair: number | null;
  isBestTrustedDealInSet: boolean;
};

export type TrayDealHighlight = {
  id: string;
  label: string;
  link: string;
  store: string;
  blurb: string;
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function discountPct(p: QuantProduct): number | null {
  if (p.oldPrice == null || p.oldPrice <= p.price || p.price <= 0) return null;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function peerMedianExcluding(list: QuantProduct[], excludeLink: string): number {
  const prices = list.filter((x) => x.link !== excludeLink && x.price > 0).map((x) => x.price);
  return median(prices);
}

function stockUrgencyLevel(p: QuantProduct): ProductDealIntelligence["urgencySuspected"] {
  const blob = `${p.availability ?? ""} ${p.extensions.join(" ")}`.toLowerCase();
  if (/limited|low stock|only \d|few left|almost gone|hurry|ends (today|soon)/i.test(blob)) {
    return "elevated";
  }
  if (/last|selling fast|while supplies/i.test(blob)) return "low";
  return "none";
}

function trayPriceVolatility(list: QuantProduct[]): number {
  const prices = list.map((p) => p.price).filter((p) => p > 0);
  if (prices.length < 2) return 0;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const v = prices.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, prices.length - 1);
  const cv = mean > 0 ? Math.sqrt(v) / mean : 0;
  return cv;
}

function mapToAiVerdict(args: {
  base: DealVerdict;
  fake: FakeDiscountRisk;
  trust: number;
  comp: number;
  discount: number | null;
  overpriced: boolean;
  underpriced: boolean;
  isBestTrustedInSet: boolean;
  highConfDisc: boolean;
}): QuantAIDealVerdict {
  const { base, fake, trust, comp, overpriced, underpriced, isBestTrustedInSet, highConfDisc } = args;
  if (fake === "high" || base === "Suspicious discount" || (underpriced && fake !== "low")) {
    return "Risky Discount";
  }
  if (overpriced && trust >= 76 && comp >= 58) return "Premium but Trusted";
  if (overpriced || base === "Wait for lower pricing") return "Wait for Better Deal";
  if (isBestTrustedInSet && trust >= 70 && fake === "low" && comp >= 64) return "Best Trusted Option";
  if (highConfDisc) return "High-Confidence Discount";
  if (base === "Real deal" && comp >= 78 && fake === "low") return "Buy Now";
  if (base === "Real deal" || base === "Strong value") return "Great Deal";
  if (base === "Compare carefully") return "Fair Price";
  return "Fair Price";
}

function authenticityScore(fake: FakeDiscountRisk, p: QuantProduct, dq: number | undefined): number {
  const dqClamped = dq ?? 50;
  const modelDisc = p.qiSignals?.discountQuality;
  let s = fake === "low" ? 78 : fake === "medium" ? 48 : 24;
  if (modelDisc != null) s = s * 0.55 + modelDisc * 0.45;
  if (p.qiCommerce?.priceAnomaly === "suspicious_low") s -= 18;
  if (p.qiCommerce?.priceAnomaly === "deep_discount") s -= 8;
  s += (dqClamped - 50) * 0.08;
  return Math.min(100, Math.max(0, Math.round(s)));
}

function valueOpportunityScore(
  fair: number,
  price: number,
  p: QuantProduct,
  list: QuantProduct[],
  fake: FakeDiscountRisk
): number {
  const comp = getFinalComposite(p, list);
  const vfm = p.qiCommerce?.valueForMoney ?? 52;
  const savings =
    fair > 0 && price > 0 ? Math.min(1, Math.max(-0.25, (fair - price) / fair)) * 55 : 0;
  let s = 42 + savings + vfm * 0.28 + comp * 0.22;
  if (fake === "high") s -= 28;
  else if (fake === "medium") s -= 14;
  if (p.qiCommerce?.priceAnomaly === "premium_outlier") s -= 10;
  return Math.min(100, Math.max(0, Math.round(s)));
}

function dealConfidenceBlend(
  authenticity: number,
  valueOpp: number,
  trust: number,
  comp: number,
  fake: FakeDiscountRisk
): number {
  let c = authenticity * 0.34 + valueOpp * 0.28 + trust * 0.22 + comp * 0.16;
  if (fake === "high") c -= 22;
  else if (fake === "medium") c -= 10;
  return Math.min(100, Math.max(0, Math.round(c)));
}

function retailerAdjustedDeal(confidence: number, trust: number, authenticity: number): number {
  return Math.min(100, Math.max(0, Math.round(confidence * 0.42 + trust * 0.32 + authenticity * 0.26)));
}

function buildAuthenticityLines(
  p: QuantProduct,
  fake: FakeDiscountRisk,
  inflated: boolean,
  urgency: ProductDealIntelligence["urgencySuspected"],
  trust: number,
  del: number
): string[] {
  const lines: string[] = [];
  if (inflated) {
    lines.push("List/anchor price looks high versus peer asks in this tray—inflated-before-markdown pattern is plausible.");
  }
  if (fake !== "low") {
    lines.push(
      fake === "high"
        ? "Markdown depth is hard to corroborate with peers or trust—treat headline % as unproven."
        : "Discount story is only partially corroborated—verify SKU match and final checkout total."
    );
  }
  if (urgency === "elevated") {
    lines.push("Urgency language in the feed—often benign, sometimes used to short-circuit comparison.");
  }
  if (trust < 56 && (discountPct(p) ?? 0) >= 18) {
    lines.push("Large discount headline with weaker retailer trust prior—manual seller checks matter more.");
  }
  if (del < 46) {
    lines.push("Delivery-signal confidence is soft—confirm who ships and realistic lead times.");
  }
  const retBlob = `${p.extensions.join(" ")} ${p.shipping ?? ""}`.toLowerCase();
  if (/final sale|no return|non[-\s]?returnable/i.test(retBlob)) {
    lines.push("Return-hostile language in feed—factor that into whether the discount is truly 'free'.");
  }
  if (lines.length === 0) {
    lines.push("No acute fake-discount flags in heuristics—still read recent reviews for your region.");
  }
  return lines.slice(0, 4);
}

function whyLine(
  p: QuantProduct,
  base: DealVerdict,
  fake: FakeDiscountRisk,
  fair: number,
  trust: number,
  comp: number
): string {
  const disc = discountPct(p);
  const savings = fair > 0 && p.price > 0 ? Math.round(fair - p.price) : null;
  if (base === "Suspicious discount" || fake === "high") {
    return "Risky: discount math or peer pricing does not support a clean ‘real deal’ read—verify list price history and seller identity.";
  }
  if (base === "Wait for lower pricing" || base === "Overpriced") {
    return "Wait-leaning: visible ask sits above fair-band vs this tray unless specs justify the premium.";
  }
  if (savings != null && savings > 0 && trust >= 66 && fake === "low") {
    return `Good lane: listed ~${savings} under peer median with workable trust (${trust}/100) and cleaner discount hygiene.`;
  }
  if (disc != null && disc >= 12 && fake === "low" && comp >= 68) {
    return `Solid opportunity: ~${disc}% headline markdown with composite ${comp}/100—still confirm warranty and SKU parity.`;
  }
  return `Neutral read: composite ${comp}/100 and trust ${trust}/100—${base.toLowerCase()} versus this result set.`;
}

function timingFromSignals(
  list: QuantProduct[],
  base: DealVerdict,
  fake: FakeDiscountRisk,
  goodBuy: boolean,
  wait: boolean
): { category: DealTimingCategory; summary: string } {
  const cv = trayPriceVolatility(list);
  if (cv >= 0.22) {
    return {
      category: "unstable_tray",
      summary:
        "Wide price ladder across this tray—suggests bundles, mismatched SKUs, or promo volatility. Comparison beats impulse.",
    };
  }
  if (wait || base === "Wait for lower pricing" || base === "Overpriced") {
    return {
      category: "wait_favored",
      summary:
        "Heuristics favor patience: your pick sits expensive vs peers or composite is soft—recheck after more listings refresh.",
    };
  }
  if (goodBuy && fake === "low" && cv < 0.14) {
    return {
      category: "strong_window",
      summary:
        "Pricing band looks tight and your row passes discount hygiene—if specs match, checkout timing is reasonable (not a forecast).",
    };
  }
  return {
    category: "neutral",
    summary:
      "No strong timing edge from this snapshot alone—use alerts and re-search rather than assuming a future drop.",
  };
}

/**
 * Per-product deal intelligence for the current peer set (search tray or cluster listings).
 * Pure function — safe to memoize on `[product, list]` identity.
 */
export function buildProductDealIntelligence(product: QuantProduct, list: QuantProduct[]): ProductDealIntelligence {
  const prices = list.map((x) => x.price).filter((x) => x > 0);
  const fair = prices.length ? median(prices) : product.price > 0 ? product.price : 0;
  const baseline = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : Math.round(fair);
  const maxReviews = Math.max(...list.map((x) => x.reviewsCount ?? 0), 1);
  const disc = discountPct(product);
  const fake = fakeDiscountRisk(product, list, disc, maxReviews);
  const base = dealVerdictFor(product, list, fair, fake, disc, maxReviews);
  const peerMed = peerMedianExcluding(list, product.link);
  const inflated = product.oldPrice != null && peerMed > 0 && product.oldPrice > peerMed * 1.38;
  const trust = getStoreTrustScore(product.store);
  const comp = getFinalComposite(product, list);
  const del = product.qiSignals?.delivery ?? scoreDeliverySpeed(product.shipping) * 100;

  const overpricedVsTray = fair > 0 && product.price > fair * 1.12;
  const underpricedAnomaly =
    peerMed > 0 && product.price < peerMed * 0.58 && (disc ?? 0) > 32 && (product.qiCommerce?.priceAnomaly === "suspicious_low" || fake !== "low");

  const provisionalQuality =
    comp * 0.38 +
    trust * 0.22 +
    Math.min(100, ratingValue(product.rating) * 20) * 0.12 +
    del * 0.12 +
    (disc != null && disc >= 10 && fake === "low" ? 14 : 0);

  const discountAuthenticity = authenticityScore(fake, product, provisionalQuality);
  const valueOpportunity = valueOpportunityScore(fair, product.price, product, list, fake);
  const dealConfidence = dealConfidenceBlend(discountAuthenticity, valueOpportunity, trust, comp, fake);
  const retailerAdjustedDealScore = retailerAdjustedDeal(dealConfidence, trust, discountAuthenticity);

  const urgency = stockUrgencyLevel(product);
  const authenticityLines = buildAuthenticityLines(product, fake, inflated, urgency, trust, del);
  const whyDealGoodOrRisky = whyLine(product, base, fake, fair, trust, comp);

  const goodTimeToBuy =
    (base === "Real deal" || base === "Strong value") &&
    fake === "low" &&
    trust >= 60 &&
    !underpricedAnomaly &&
    comp >= 62;
  const waitForBetterPricing =
    base === "Wait for lower pricing" || base === "Overpriced" || (comp < 56 && trust < 58);

  const highConfDisc =
    fake === "low" &&
    trust >= 72 &&
    (disc ?? 0) >= 14 &&
    (product.qiCommerce?.confidence ?? 0) >= 68 &&
    comp >= 70;

  const aiDealVerdict = mapToAiVerdict({
    base,
    fake,
    trust,
    comp,
    discount: disc,
    overpriced: overpricedVsTray,
    underpriced: underpricedAnomaly,
    isBestTrustedInSet: false,
    highConfDisc,
  });

  const timing = timingFromSignals(list, base, fake, goodTimeToBuy, waitForBetterPricing);

  return {
    aiDealVerdict,
    baseDealVerdict: base,
    fakeDiscountRisk: fake,
    dealConfidence,
    discountAuthenticity,
    valueOpportunity,
    retailerAdjustedDealScore,
    fairMarketEstimate: Math.round(fair),
    categoryBaselineEstimate: baseline,
    overpricedVsTray,
    underpricedAnomaly,
    goodTimeToBuy,
    waitForBetterPricing,
    timingCategory: timing.category,
    timingSummary: timing.summary,
    authenticityLines,
    whyDealGoodOrRisky,
    inflatedAnchorSuspected: inflated,
    urgencySuspected: urgency,
    discountPct: disc,
    savingsVsFair: fair > 0 && product.price > 0 ? Math.round(fair - product.price) : null,
    isBestTrustedDealInSet: false,
  };
}

/** Memo-friendly batch for a tray or cluster listing set. */
export function buildDealIntelByLink(list: QuantProduct[]): Map<string, ProductDealIntelligence> {
  const m = new Map<string, ProductDealIntelligence>();
  for (const p of list) {
    m.set(p.link, buildProductDealIntelligence(p, list));
  }
  if (list.length < 2) return m;

  let bestLink: string | null = null;
  let bestScore = -1;
  for (const p of list) {
    const row = m.get(p.link);
    if (!row) continue;
    const t = getStoreTrustScore(p.store);
    if (t < 62) continue;
    if (row.retailerAdjustedDealScore > bestScore) {
      bestScore = row.retailerAdjustedDealScore;
      bestLink = p.link;
    }
  }
  for (const p of list) {
    const row = m.get(p.link);
    if (!row) continue;
    const isBestTrusted = bestLink != null && p.link === bestLink && row.discountAuthenticity >= 55;
    const ai2 = mapToAiVerdict({
      base: row.baseDealVerdict,
      fake: row.fakeDiscountRisk,
      trust: getStoreTrustScore(p.store),
      comp: getFinalComposite(p, list),
      discount: row.discountPct,
      overpriced: row.overpricedVsTray,
      underpriced: row.underpricedAnomaly,
      isBestTrustedInSet: isBestTrusted,
      highConfDisc:
        row.fakeDiscountRisk === "low" &&
        getStoreTrustScore(p.store) >= 72 &&
        (row.discountPct ?? 0) >= 14 &&
        (p.qiCommerce?.confidence ?? 0) >= 68 &&
        getFinalComposite(p, list) >= 70,
    });
    m.set(p.link, { ...row, isBestTrustedDealInSet: isBestTrusted, aiDealVerdict: ai2 });
  }
  return m;
}

/** Cross-retailer one-liners for the full search tray (not cluster-only). */
export function buildTrayDealHighlights(list: QuantProduct[]): TrayDealHighlight[] {
  if (list.length < 2) return [];
  const intel = buildDealIntelByLink(list);
  const withPrice = list.filter((p) => p.price > 0);
  if (!withPrice.length) return [];

  const bestDeal = [...withPrice].sort(
    (a, b) => (intel.get(b.link)?.retailerAdjustedDealScore ?? 0) - (intel.get(a.link)?.retailerAdjustedDealScore ?? 0)
  )[0]!;
  const safest = [...withPrice].sort((a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store))[0]!;
  const trustedDiscount = [...withPrice]
    .map((p) => {
      const i = intel.get(p.link)!;
      const d = i.discountPct ?? 0;
      const score = d * (i.discountAuthenticity / 100) * (getStoreTrustScore(p.store) / 100);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)[0]!;
  const risky = [...withPrice]
    .filter((p) => intel.get(p.link)?.aiDealVerdict === "Risky Discount")
    .sort((a, b) => a.price - b.price)[0];

  const out: TrayDealHighlight[] = [
    {
      id: "best-deal-now",
      label: "Best Deal Now",
      link: bestDeal.link,
      store: bestDeal.store,
      blurb: `Highest retailer-adjusted deal score in this tray (${intel.get(bestDeal.link)?.retailerAdjustedDealScore ?? "—"}/100) — still verify SKU parity.`,
    },
    {
      id: "safest-deal",
      label: "Safest Deal",
      link: safest.link,
      store: safest.store,
      blurb: `Strongest trust prior (${getStoreTrustScore(safest.store)}/100) — calmer checkout if policy anxiety dominates.`,
    },
    {
      id: "best-trusted-discount",
      label: "Best Trusted Discount",
      link: trustedDiscount.p.link,
      store: trustedDiscount.p.store,
      blurb:
        trustedDiscount.score > 8
          ? "Headline markdown × authenticity × trust peaks here versus peers."
          : "Modest markdowns in-tray—discount story is not the main axis; lean on composite + trust.",
    },
  ];

  if (risky) {
    out.push({
      id: "risky-discount",
      label: "Potentially Risky Discount",
      link: risky.link,
      store: risky.store,
      blurb: intel.get(risky.link)?.whyDealGoodOrRisky ?? "Heuristic flags weak discount hygiene—extra verification.",
    });
  }

  const cheapestTrusted = [...withPrice]
    .filter((p) => getStoreTrustScore(p.store) >= 64)
    .sort((a, b) => a.price - b.price)[0];
  if (cheapestTrusted && cheapestTrusted.link !== bestDeal.link) {
    out.push({
      id: "cheapest-trusted",
      label: "Cheapest Trusted Option",
      link: cheapestTrusted.link,
      store: cheapestTrusted.store,
      blurb: "Lowest ask among trust-prior ≥64—good lane if you are budget-first but cautious.",
    });
  }

  return out.slice(0, 5);
}

export type ClusterDealLane = { label: string; link: string; hint: string };

export function buildClusterDealLanes(clusterListings: QuantProduct[]): ClusterDealLane[] {
  if (clusterListings.length < 2) return [];
  const h = buildTrayDealHighlights(clusterListings);
  return h.map((x) => ({ label: x.label, link: x.link, hint: x.blurb }));
}
