/**
 * Phase 1A — Truth Language Policy.
 * Centralized qualified display language. No claim of external verification
 * unless Truth Layer asserts evidence (future Phase 1B–1D).
 */

/** Minimum truthConfidence (0–1) required before emitting qualified claim classes. */
export const TRUTH_THRESHOLDS = {
  buyReady: 0.65,
  strongBuy: 0.72,
  bestDeal: 0.8,
  verifiedLabel: 0.7,
  trustedLabel: 0.68,
  historicalLabel: 0.55,
  priceHistorySamples: 3,
} as const;

/** Internal pipeline tier / label keys (stable for logic). */
export const TRUTH_INTERNAL = {
  tierBestDeal: "BEST DEAL",
  priorityBestDeal: "BEST DEAL FOUND",
  priorityBuyReady: "BUY READY",
  labelRealDiscount: "REAL DISCOUNT",
  labelBestPrice: "BEST PRICE FOUND",
} as const;

/** User-visible qualified priority labels (replace market-wide certainty). */
export type QualifiedPriorityLabel =
  | "LIKELY DEAL SIGNAL"
  | "CONFIDENCE-BASED BUY SIGNAL"
  | "COMPARE"
  | "WAIT"
  | "INSUFFICIENT DATA"
  | "AVOID";

export type QualifiedDiscountLabel =
  | "Weak Discount Signal"
  | "Discount Signal"
  | "Strong Discount Signal"
  | "Exceptional Discount Signal";

export type QualifiedMerchantLabel =
  | "Standard Seller Signal"
  | "Seller Trust Signal"
  | "Strong Seller Trust Signal"
  | "High Trust Signal Seller";

export type QualifiedPriceLabel =
  | "UNDERPRICED SIGNAL"
  | "FAIR PRICE SIGNAL"
  | "OVERPRICED SIGNAL"
  | "RARE DEAL SIGNAL"
  | "STRONG DEAL SIGNAL"
  | "MARKET SAMPLE LOWEST OBSERVED";

export type QualifiedPriceHistoryLabel =
  | "Good Price Signal"
  | "Strong Price Signal"
  | "Observed Price Floor Signal"
  | "Price Opportunity Signal"
  | "Fair Price Signal"
  | "Elevated Price Signal";

export type QualifiedDiscountProofBand =
  | "Fake Discount Signal"
  | "Weak Discount Signal"
  | "Discount Signal"
  | "Exceptional Discount Signal";

const FORBIDDEN_USER_PHRASES = [
  /\bverified discount\b/i,
  /\bstrong verified discount\b/i,
  /\bexceptional verified discount\b/i,
  /\breal discount\b/i,
  /\breal savings verified\b/i,
  /\bbest deal found\b/i,
  /\bbest price found\b/i,
  /\bmarketplace verified\b/i,
  /\bverified seller\b/i,
  /\bverified retailer\b/i,
  /\btrusted seller\b/i,
  /\btrust verified\b/i,
  /\bverified lane\b/i,
  /\bhistorical low\b/i,
  /\bbest verified discount\b/i,
  /\belite merchant\b/i,
] as const;

/** Map legacy internal priority labels to qualified display labels. */
export function qualifyPriorityLabel(
  label: string | null | undefined
): QualifiedPriorityLabel | string {
  const normalized = (label ?? "").trim().toUpperCase();
  switch (normalized) {
    case "BEST DEAL FOUND":
    case "BEST DEAL":
      return "LIKELY DEAL SIGNAL";
    case "BUY READY":
    case "STRONG BUY":
      return "CONFIDENCE-BASED BUY SIGNAL";
    case "COMPARE":
      return "COMPARE";
    case "WAIT":
      return "WAIT";
    case "AVOID":
      return "AVOID";
    case "INSUFFICIENT DATA":
      return "INSUFFICIENT DATA";
    default:
      return label ?? "COMPARE";
  }
}

/** Map commerce decision tier to qualified priority label for cards/briefs. */
export function qualifyTierPriorityLabel(
  tier: "WAIT" | "COMPARE" | "BUY READY" | "STRONG BUY" | "BEST DEAL"
): QualifiedPriorityLabel {
  if (tier === "BEST DEAL") return "LIKELY DEAL SIGNAL";
  if (tier === "STRONG BUY" || tier === "BUY READY") return "CONFIDENCE-BASED BUY SIGNAL";
  if (tier === "WAIT") return "WAIT";
  return "COMPARE";
}

export function qualifyDiscountConfidenceLabel(
  label: string,
  truthConfidence: number
): QualifiedDiscountLabel | string {
  if (truthConfidence < TRUTH_THRESHOLDS.verifiedLabel) {
    if (/fake/i.test(label)) return "Weak Discount Signal";
    return "Weak Discount Signal";
  }
  switch (label) {
    case "Unverified Discount":
      return "Weak Discount Signal";
    case "Verified Discount":
      return "Discount Signal";
    case "Strong Verified Discount":
      return "Strong Discount Signal";
    case "Exceptional Verified Discount":
      return "Exceptional Discount Signal";
    default:
      return label.replace(/verified/gi, "signal").replace(/Verified/g, "Signal");
  }
}

export function qualifyMerchantReliabilityLabel(label: string): QualifiedMerchantLabel | string {
  switch (label) {
    case "Elite Merchant":
      return "High Trust Signal Seller";
    case "Strong Merchant":
      return "Strong Seller Trust Signal";
    case "Trusted Merchant":
      return "Seller Trust Signal";
    case "Standard Merchant":
      return "Standard Seller Signal";
    default:
      return label.replace(/trusted/gi, "trust signal").replace(/elite/gi, "high trust signal");
  }
}

export function qualifyMerchantTrustBand(
  band: string
): string {
  switch (band) {
    case "Elite Merchant":
      return "High Trust Signal Seller";
    case "Trusted Merchant":
      return "Seller Trust Signal";
    case "Acceptable Merchant":
      return "Standard Seller Signal";
    case "Risky Merchant":
      return "Elevated Seller Risk Signal";
    default:
      return band;
  }
}

export function qualifyPriceLabel(label: string): QualifiedPriceLabel | string {
  switch (label) {
    case "BEST PRICE FOUND":
      return "MARKET SAMPLE LOWEST OBSERVED";
    case "UNDERPRICED":
      return "UNDERPRICED SIGNAL";
    case "FAIR PRICE":
      return "FAIR PRICE SIGNAL";
    case "OVERPRICED":
      return "OVERPRICED SIGNAL";
    case "RARE DEAL":
      return "RARE DEAL SIGNAL";
    case "STRONG DEAL":
      return "STRONG DEAL SIGNAL";
    default:
      return label;
  }
}

export function qualifyPriceHistoryLabel(
  label: string,
  sampleCount: number
): QualifiedPriceHistoryLabel | string {
  if (sampleCount < TRUTH_THRESHOLDS.priceHistorySamples) {
    if (label === "Historical Low" || label === "Historical Opportunity") {
      return "Price Opportunity Signal";
    }
  }
  switch (label) {
    case "Historical Low":
      return "Observed Price Floor Signal";
    case "Historical Opportunity":
      return "Price Opportunity Signal";
    case "Great Price":
      return "Strong Price Signal";
    case "Good Price":
      return "Good Price Signal";
    case "Fair Price":
      return "Fair Price Signal";
    case "Elevated Price":
      return "Elevated Price Signal";
    default:
      return label;
  }
}

export function qualifyDiscountProofBand(band: string): QualifiedDiscountProofBand | string {
  switch (band) {
    case "Fake Discount":
      return "Fake Discount Signal";
    case "Unverified Discount":
      return "Weak Discount Signal";
    case "Verified Discount":
      return "Discount Signal";
    case "Exceptional Discount":
      return "Exceptional Discount Signal";
    default:
      return band;
  }
}

export function qualifyBillionDollarDiscountLabel(label: string): string {
  switch (label) {
    case "BEST DEAL FOUND":
      return "LIKELY DEAL SIGNAL";
    case "REAL DISCOUNT":
      return "DISCOUNT SIGNAL";
    case "FAKE DISCOUNT RISK":
      return "FAKE DISCOUNT RISK SIGNAL";
    case "FAIR PRICE":
      return "FAIR PRICE SIGNAL";
    case "SAME PRODUCT CHEAPER":
      return "SAME PRODUCT CHEAPER SIGNAL";
    case "OVERPRICED":
      return "OVERPRICED SIGNAL";
    default:
      return label;
  }
}

/** Strip or replace forbidden verification phrases in user-facing prose. */
export function sanitizeUserFacingProse(text: string): string {
  let out = text;
  const replacements: Array<[RegExp, string]> = [
    [/best verified discount/gi, "strongest discount signal in this search sample"],
    [/verified discount/gi, "discount signal"],
    [/strong verified discount/gi, "strong discount signal"],
    [/exceptional verified discount/gi, "exceptional discount signal"],
    [/real savings verified/gi, "savings signal vs search-sample median"],
    [/real discount/gi, "discount signal"],
    [/best deal found/gi, "likely deal signal"],
    [/best price found/gi, "market sample lowest observed"],
    [/marketplace verified/gi, "seller trust signal"],
    [/verified marketplace retailer/gi, "recognized storefront signal"],
    [/verified seller/gi, "seller trust signal"],
    [/verified retailer/gi, "seller trust signal"],
    [/trusted seller/gi, "seller trust signal"],
    [/trusted retailer/gi, "seller trust signal"],
    [/trust verified/gi, "trust signal"],
    [/verified lane/gi, "fulfillment signal present"],
    [/historical low/gi, "observed price floor signal"],
    [/elite merchant/gi, "high trust signal seller"],
    [/verified against market median and price history/gi, "compared to search-sample median and remembered snapshots"],
    [/QuantAI would spend its own money/gi, "Confidence-based recommendation"],
    [/verified discount and trusted merchant/gi, "discount signal and seller trust signal"],
  ];
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function isLikelyDealPriorityLabel(label: string | null | undefined): boolean {
  const n = (label ?? "").trim().toUpperCase();
  return n === "LIKELY DEAL SIGNAL" || n === "BEST DEAL FOUND" || n === "BEST DEAL";
}

export function isConfidenceBuyPriorityLabel(label: string | null | undefined): boolean {
  const n = (label ?? "").trim().toUpperCase();
  return n === "CONFIDENCE-BASED BUY SIGNAL" || n === "BUY READY" || n === "STRONG BUY";
}

/** Policy assertion for lint/review — returns violations in a string. */
export function findTruthLanguageViolations(text: string): string[] {
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_USER_PHRASES) {
    if (pattern.test(text)) violations.push(pattern.source);
  }
  return violations;
}
