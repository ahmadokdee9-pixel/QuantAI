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

/** Live shelf labels — discount-led when real markdown exists, otherwise value/trust-led. */
export type LiveShelfLabel =
  | "Best Discount Today"
  | "Verified Discount"
  | "Strong Discount Opportunity"
  | "Trusted Discount"
  | "Smart Deal Today"
  | "Price Drop Signal"
  | "Hidden Discount Gem"
  | "Weak Discount"
  | "Suspicious Discount"
  | "Discount Not Enough"
  | "Best Value"
  | "Best Trusted Option"
  | "Best Price-to-Quality"
  | "Safest Buy"
  | "Strong Buy"
  | "Compare Alternatives"
  | "Wait for Better Price"
  | "Flash Sale"
  | "Historically Low"
  | "Rare Deal"
  | "Premium But Fair"
  | "Wait Before Buying";

export type WorthBuyingSignal = "yes" | "maybe" | "wait";

/** Infrastructure hooks for “historical” reads — all derived from this tray + listing fields. */
export type TrayPriceMemory = {
  trayFloorPrice: number;
  isAtOrNearTrayFloor: boolean;
  estimatedFairPrice: number;
  inflatedBeforeSale: boolean;
  suspiciousFakeDiscount: boolean;
};

export type ProductDealIntelligence = {
  aiDealVerdict: QuantAIDealVerdict;
  baseDealVerdict: DealVerdict;
  fakeDiscountRisk: FakeDiscountRisk;
  /** Meaningful headline markdown vs anchors (not coupon-site noise). */
  hasDiscount: boolean;
  /** Same as headline % off listing anchor when present. */
  discountPercent: number | null;
  discountConfidence: number;
  suspiciousDiscountRisk: number;
  discountExplanation: string;
  /** Why this row reads the way it does for ranking + checkout. */
  liveRankExplanation: string;
  discountVsQualityNote: string;
  retailerTrustNote: string;
  retailerIntelligenceScore: number;
  dealConfidence: number;
  discountAuthenticity: number;
  valueOpportunity: number;
  /** Same axis as value opportunity — explicit name for discount brain copy. */
  discountValueScore: number;
  retailerAdjustedDealScore: number;
  /** Headline % off list→ask when available. */
  percentOff: number | null;
  /** Absolute savings from listing anchor (old→current), not vs tray median. */
  absoluteSavings: number | null;
  /** Discount depth × authenticity × trust (+ savings vs fair band). */
  trustAdjustedDiscountScore: number;
  /** 0–100 meter for UI — blend of confidence + retailer-adjusted deal. */
  dealStrength: number;
  shelfLabels: LiveShelfLabel[];
  worthBuyingNow: WorthBuyingSignal;
  priceMemory: TrayPriceMemory;
  historicalConfidenceLabel: string;
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

function trustAdjustedDiscountScoreCalc(
  disc: number | null,
  authenticity: number,
  trust: number,
  absoluteSavings: number | null,
  fair: number
): number {
  const d = disc != null ? Math.min(55, disc) / 55 : 0;
  const a = authenticity / 100;
  const t = trust / 100;
  const sav = absoluteSavings != null && fair > 0 ? Math.min(1, absoluteSavings / fair) : 0;
  const raw = d * 42 * a + t * 28 + a * 18 + sav * 12;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function retailerIntelligenceScoreCalc(p: QuantProduct, trust: number, del: number, comp: number): number {
  const rt = p.qiSignals?.retailerTrust ?? trust;
  const rev = Math.min(100, ratingValue(p.rating) * 20);
  const comm = p.qiCommerce?.confidence ?? 52;
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(trust * 0.34 + del * 0.16 + rt * 0.16 + rev * 0.14 + comm * 0.12 + comp * 0.08)
    )
  );
}

function computeSuspiciousDiscountRisk(
  fake: FakeDiscountRisk,
  inflated: boolean,
  underpricedAnomaly: boolean
): number {
  let r = fake === "high" ? 86 : fake === "medium" ? 48 : 12;
  if (inflated) r += 16;
  if (underpricedAnomaly) r += 12;
  return Math.min(100, Math.round(r));
}

function computeDiscountConfidence(
  hasDiscount: boolean,
  discountAuthenticity: number,
  dealConfidence: number,
  comp: number,
  trust: number,
  suspiciousRisk: number
): number {
  if (hasDiscount) {
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(discountAuthenticity * 0.48 + dealConfidence * 0.32 + (100 - suspiciousRisk) * 0.2)
      )
    );
  }
  return Math.min(100, Math.max(0, Math.round(comp * 0.38 + trust * 0.32 + dealConfidence * 0.3)));
}

function buildDiscountExplanation(hasDiscount: boolean, inflated: boolean, fake: FakeDiscountRisk): string {
  const anchor =
    "Based on current listing anchors only—no independent multi-week price archive is attached to this tray.";
  if (!hasDiscount) {
    return "No meaningful headline discount detected on listing anchors vs this tray; ranking leans on price, composite, trust, and delivery signals instead.";
  }
  if (inflated) {
    return `${anchor} The crossed-out anchor reads high versus peer asks—inflate-then-markdown is plausible.`;
  }
  if (fake === "high") {
    return `${anchor} Peer alignment does not support the full headline markdown—treat % off as unproven until checkout matches.`;
  }
  if (fake === "medium") {
    return `${anchor} Partial corroboration only; still confirm SKU match and final total.`;
  }
  return `${anchor} Headline markdown is reasonably coherent with peers for this snapshot.`;
}

function buildRetailerTrustNote(trust: number, fake: FakeDiscountRisk, del: number): string {
  if (trust >= 78 && fake === "low") {
    return "Trusted retailer prior with calmer checkout friction signals in this feed.";
  }
  if (trust < 54) {
    return "Weaker storefront trust prior—manual seller verification is weighted heavier in ranking.";
  }
  if (del < 46) {
    return "Delivery-signal softness—confirm who ships and realistic lead times before leaning on price alone.";
  }
  return "Balanced storefront prior versus peers—compare policies before optimizing purely on price.";
}

function buildDiscountVsQualityNote(
  hasDiscount: boolean,
  disc: number | null,
  trust: number,
  comp: number,
  fake: FakeDiscountRisk
): string {
  const d = disc ?? 0;
  if (hasDiscount && d >= 18 && trust < 62) {
    return "Strong discount headline, but seller trust is only moderate—verify returns and seller identity.";
  }
  if (!hasDiscount && comp >= 72) {
    return "No discount detected, but price-to-quality vs this tray still reads strong.";
  }
  if (hasDiscount && fake !== "low") {
    return "Cheap listing, but discount confidence is weak versus peer corroboration.";
  }
  if (!hasDiscount && trust >= 74 && comp >= 60) {
    return "Trusted retailer with fair price and low headline-discount reliance.";
  }
  return "Tray-relative blend: trust, composite, and checkout safety weigh alongside any markdown story.";
}

function buildLiveRankExplanation(
  hasDiscount: boolean,
  trustAdjustedDiscountScore: number,
  comp: number,
  trust: number,
  suspiciousRisk: number,
  fake: FakeDiscountRisk
): string {
  if (suspiciousRisk >= 58) {
    return "Rank is pulled down: suspicious discount hygiene and trust checks run before raw savings.";
  }
  if (hasDiscount && trustAdjustedDiscountScore >= 52 && trust >= 66 && fake === "low") {
    return "Rank gets a lift from coherent markdown plus workable trust—still not a single-axis discount win.";
  }
  if (!hasDiscount && comp >= 70 && trust >= 68) {
    return "No big markdown, yet composite + trust still justify a premium lane in this tray.";
  }
  if (hasDiscount && fake !== "low") {
    return "Markdown exists, but authenticity and peer corroboration cap how aggressively it can pull rank.";
  }
  return "Balanced tray read: final price only advances after trust, composite, and discount hygiene pass.";
}

function deriveLiveShelfLabels(args: {
  p: QuantProduct;
  hasDiscount: boolean;
  disc: number | null;
  fake: FakeDiscountRisk;
  trust: number;
  comp: number;
  inflated: boolean;
  lowestInTray: boolean;
  urgency: ProductDealIntelligence["urgencySuspected"];
  overpriced: boolean;
  waitBuy: boolean;
  maxDiscInTray: number;
  waitForBetterPricing: boolean;
  fair: number;
  price: number;
}): LiveShelfLabel[] {
  const {
    p,
    hasDiscount,
    disc,
    fake,
    trust,
    comp,
    inflated,
    lowestInTray,
    urgency,
    overpriced,
    waitBuy,
    maxDiscInTray,
    waitForBetterPricing,
    fair,
    price,
  } = args;
  const d = disc ?? 0;
  const rt = ratingValue(p.rating);

  if (!hasDiscount) {
    const out: LiveShelfLabel[] = [];
    if (waitBuy || overpriced || waitForBetterPricing) {
      out.push("Wait for Better Price");
    } else if (comp >= 78 && trust >= 70 && !overpriced) {
      out.push("Strong Buy");
    } else if (trust >= 80 && comp >= 58) {
      out.push("Safest Buy");
    } else if (fair > 0 && price > 0 && price <= fair * 0.94 && comp >= 66) {
      out.push("Best Value");
    } else if (comp >= 74 && rt >= 4.22 && trust >= 60) {
      out.push("Best Price-to-Quality");
    } else if (trust >= 76 && comp >= 62) {
      out.push("Best Trusted Option");
    } else {
      out.push("Compare Alternatives");
    }
    if (out.length < 2) {
      if (!out.includes("Best Trusted Option") && trust >= 74 && comp >= 60) {
        out.push("Best Trusted Option");
      } else if (!out.includes("Best Price-to-Quality") && comp >= 70 && rt >= 4.05) {
        out.push("Best Price-to-Quality");
      }
    }
    return [...new Set(out)].slice(0, 4);
  }

  const suspicious = fake === "high" || (fake === "medium" && d >= 22) || (inflated && d >= 8);
  const pool: LiveShelfLabel[] = [];

  if (suspicious && d >= 6) pool.push("Suspicious Discount");
  if (waitBuy && !pool.includes("Suspicious Discount")) pool.push("Wait Before Buying");

  if (!suspicious) {
    if (fake === "low" && d >= 14 && trust >= 72) pool.push("Verified Discount");
    if (fake === "low" && d >= 12 && trust >= 64 && !pool.includes("Verified Discount")) {
      pool.push("Trusted Discount");
    }
    if (fake === "low" && d >= 20 && trust >= 62) pool.push("Strong Discount Opportunity");
    if (fake === "low" && comp >= 70 && d >= 10) pool.push("Smart Deal Today");
    if (p.priceTrend === "down" && fake === "low" && d >= 8) pool.push("Price Drop Signal");
    if ((p.reviewsCount ?? 0) < 48 && d >= 14 && trust >= 58 && fake === "low") pool.push("Hidden Discount Gem");
    if (urgency === "elevated" && d >= 10 && fake === "low") pool.push("Flash Sale");
    if (lowestInTray && fake === "low" && d >= 6) pool.push("Historically Low");
    if (fake === "low" && d >= 18 && d >= maxDiscInTray - 4 && maxDiscInTray >= 14) pool.push("Rare Deal");
    if (overpriced && trust >= 72 && fake === "low") pool.push("Premium But Fair");
  }

  if (!suspicious && d >= 6 && d < 12 && trust < 64) pool.push("Discount Not Enough");
  if (!suspicious && fake === "low" && d >= 6 && d < 12 && trust >= 64 && !pool.includes("Discount Not Enough")) {
    pool.push("Weak Discount");
  }

  const priority: LiveShelfLabel[] = [
    "Suspicious Discount",
    "Wait Before Buying",
    "Discount Not Enough",
    "Weak Discount",
    "Verified Discount",
    "Strong Discount Opportunity",
    "Trusted Discount",
    "Smart Deal Today",
    "Price Drop Signal",
    "Hidden Discount Gem",
    "Flash Sale",
    "Historically Low",
    "Rare Deal",
    "Premium But Fair",
  ];
  const ordered = priority.filter((x) => pool.includes(x));
  const rest = pool.filter((x) => !ordered.includes(x));
  return [...new Set([...ordered, ...rest])].slice(0, 4);
}

function historicalConfidenceText(lowestInTray: boolean, fake: FakeDiscountRisk, inflated: boolean): string {
  if (inflated) {
    return "Tray heuristics: anchor looks high vs peer asks—inflated-before-sale is plausible (no off-feed price archive).";
  }
  if (lowestInTray && fake === "low") {
    return "Ask sits at/near the tray floor with clean discount hygiene—closest read to “historically low” on this snapshot.";
  }
  if (fake === "high") {
    return "Low confidence in headline markdown vs peers—treat “original” price as unproven without external history.";
  }
  if (fake === "medium") {
    return "Mixed corroboration—historical confidence is medium; verify list price, SKU, and seller.";
  }
  return "Tray-relative snapshot only—no verified multi-week price timeline on this row.";
}

function worthBuyingNowSignal(
  verdict: QuantAIDealVerdict,
  goodTime: boolean,
  waitPricing: boolean
): WorthBuyingSignal {
  if (verdict === "Risky Discount" || verdict === "Wait for Better Deal") return "wait";
  if (waitPricing && !goodTime) return "wait";
  if (
    goodTime &&
    (verdict === "Buy Now" || verdict === "Great Deal" || verdict === "High-Confidence Discount" || verdict === "Best Trusted Option")
  ) {
    return "yes";
  }
  return "maybe";
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

  const absoluteSavings =
    product.oldPrice != null && product.oldPrice > product.price && product.price > 0
      ? Math.round(product.oldPrice - product.price)
      : null;
  const hasDiscount =
    (disc != null && disc >= 6) ||
    (absoluteSavings != null &&
      product.price > 0 &&
      absoluteSavings >= Math.max(12, Math.round(product.price * 0.035)));

  const suspiciousDiscountRisk = computeSuspiciousDiscountRisk(fake, inflated, underpricedAnomaly);
  const retailerIntelligenceScore = retailerIntelligenceScoreCalc(product, trust, del, comp);
  const discountConfidence = computeDiscountConfidence(
    hasDiscount,
    discountAuthenticity,
    dealConfidence,
    comp,
    trust,
    suspiciousDiscountRisk
  );
  const discountExplanation = buildDiscountExplanation(hasDiscount, inflated, fake);
  const retailerTrustNote = buildRetailerTrustNote(trust, fake, del);
  const discountVsQualityNote = buildDiscountVsQualityNote(hasDiscount, disc, trust, comp, fake);

  const minTrayPrice = prices.length ? Math.min(...prices) : product.price;
  const lowestKnownInTray =
    list.length >= 2 &&
    product.price > 0 &&
    minTrayPrice > 0 &&
    product.price <= minTrayPrice * 1.02;
  const maxDiscInTray = list.length >= 2 ? Math.max(0, ...list.map((x) => discountPct(x) ?? 0)) : 0;
  const trustAdjustedDiscountScore = trustAdjustedDiscountScoreCalc(
    disc,
    discountAuthenticity,
    trust,
    absoluteSavings,
    fair
  );

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

  const shelfLabels = deriveLiveShelfLabels({
    p: product,
    hasDiscount,
    disc,
    fake,
    trust,
    comp,
    inflated,
    lowestInTray: lowestKnownInTray,
    urgency,
    overpriced: overpricedVsTray,
    waitBuy: waitForBetterPricing,
    maxDiscInTray,
    waitForBetterPricing,
    fair,
    price: product.price,
  });

  const liveRankExplanation = buildLiveRankExplanation(
    hasDiscount,
    trustAdjustedDiscountScore,
    comp,
    trust,
    suspiciousDiscountRisk,
    fake
  );

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

  const worthBuyingNow = worthBuyingNowSignal(aiDealVerdict, goodTimeToBuy, waitForBetterPricing);
  const priceMemory: TrayPriceMemory = {
    trayFloorPrice: Math.round(minTrayPrice),
    isAtOrNearTrayFloor: lowestKnownInTray,
    estimatedFairPrice: Math.round(fair),
    inflatedBeforeSale: inflated,
    suspiciousFakeDiscount: fake === "high" || (fake === "medium" && (disc ?? 0) > 30),
  };
  const historicalConfidenceLabel = historicalConfidenceText(lowestKnownInTray, fake, inflated);
  const dealStrength = Math.round((retailerAdjustedDealScore + dealConfidence) / 2);

  return {
    aiDealVerdict,
    baseDealVerdict: base,
    fakeDiscountRisk: fake,
    hasDiscount,
    discountPercent: disc,
    discountConfidence,
    suspiciousDiscountRisk,
    discountExplanation,
    liveRankExplanation,
    discountVsQualityNote,
    retailerTrustNote,
    retailerIntelligenceScore,
    dealConfidence,
    discountAuthenticity,
    valueOpportunity,
    discountValueScore: valueOpportunity,
    retailerAdjustedDealScore,
    percentOff: disc,
    absoluteSavings,
    trustAdjustedDiscountScore,
    dealStrength,
    shelfLabels,
    worthBuyingNow,
    priceMemory,
    historicalConfidenceLabel,
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
    const worthNow = worthBuyingNowSignal(ai2, row.goodTimeToBuy, row.waitForBetterPricing);
    m.set(p.link, { ...row, isBestTrustedDealInSet: isBestTrusted, aiDealVerdict: ai2, worthBuyingNow: worthNow });
  }

  let bestDiscLink: string | null = null;
  let bestTad = -1;
  for (const p of list) {
    const row = m.get(p.link);
    if (!row) continue;
    if (!row.hasDiscount) continue;
    if (row.suspiciousDiscountRisk >= 70) continue;
    if (getStoreTrustScore(p.store) < 54) continue;
    if ((row.discountPct ?? 0) < 6) continue;
    if (row.trustAdjustedDiscountScore > bestTad) {
      bestTad = row.trustAdjustedDiscountScore;
      bestDiscLink = p.link;
    }
  }
  if (bestDiscLink != null && bestTad >= 26) {
    const row = m.get(bestDiscLink)!;
    const merged: LiveShelfLabel[] = [
      "Best Discount Today",
      ...row.shelfLabels.filter((l) => l !== "Best Discount Today" && l !== "Weak Discount"),
    ];
    m.set(bestDiscLink, {
      ...row,
      shelfLabels: [...new Set(merged)].slice(0, 4),
    });
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
