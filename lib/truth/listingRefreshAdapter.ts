/**
 * Phase 1B.2 — Normalize refresh outcomes into AvailabilityObservation inserts.
 * Does not call SerpApi or persist — callers supply search rows or tray products.
 */

import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  classifyAvailability,
  classifySerpApiShoppingRow,
  classifiedLabelToDbStatus,
  parseSerpApiAvailabilitySignals,
  type AvailabilityClassification,
  type ClassifiedAvailabilityLabel,
} from "@/lib/truth/availabilityClassifier";
import {
  detectAvailabilityChanges,
  type AvailabilityChangeDetection,
  type AvailabilityObservationSnapshot,
} from "@/lib/truth/availabilityChangeDetector";
import type { AvailabilityObservationInsert } from "@/lib/truth/availabilityObservationTypes";
import { computeFreshnessScoreFromObservedAt } from "@/lib/truth/freshnessScore";

export type ListingRefreshTarget = {
  listingUrl: string;
  title: string;
  store: string;
  skuId?: string | null;
  searchQuery?: string | null;
  /** Prior or anchor price for fuzzy tray matching. */
  referencePrice?: number | null;
};

export type ListingMatchResult = {
  matched: boolean;
  product: QuantProduct | null;
  matchConfidence: number;
  matchReason: "exact_link" | "title_store_price" | "none";
};

export type NormalizedAvailabilityObservation = AvailabilityObservationInsert & {
  classifiedLabel: ClassifiedAvailabilityLabel;
  classification: AvailabilityClassification;
  matchConfidence: number;
  changeDetection: AvailabilityChangeDetection;
};

const DEFAULT_PRICE_TOLERANCE = 0.15;
const MIN_FUZZY_TITLE_SIM = 0.9;

/** Normalize listing URLs for equality checks. */
export function normalizeListingUrlForMatch(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    let path = parsed.pathname.replace(/\/+$/, "");
    if (!path) path = "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, "");
  }
}

function listingHost(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

function priceWithinTolerance(a: number, b: number, tolerance = DEFAULT_PRICE_TOLERANCE): boolean {
  if (a <= 0 || b <= 0) return false;
  const rel = Math.abs(a - b) / Math.max(a, b);
  return rel <= tolerance;
}

function storeMatches(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Match a tracked listing against a SerpApi-derived product tray. */
export function matchListingInSearchResults(
  target: ListingRefreshTarget,
  products: QuantProduct[]
): ListingMatchResult {
  const targetUrl = normalizeListingUrlForMatch(target.listingUrl);
  if (!targetUrl || products.length === 0) {
    return { matched: false, product: null, matchConfidence: 0, matchReason: "none" };
  }

  for (const product of products) {
    const productUrl = normalizeListingUrlForMatch(product.link);
    const outboundUrl = normalizeListingUrlForMatch(product.offerOutboundUrl ?? product.link);
    if (productUrl === targetUrl || outboundUrl === targetUrl) {
      return { matched: true, product, matchConfidence: 1, matchReason: "exact_link" };
    }
  }

  let best: ListingMatchResult = { matched: false, product: null, matchConfidence: 0, matchReason: "none" };

  for (const product of products) {
    if (!storeMatches(product.store, target.store)) continue;
    const titleSim = combinedTitleSimilarity(product.title, target.title);
    if (titleSim < MIN_FUZZY_TITLE_SIM) continue;
    if (
      target.referencePrice != null &&
      target.referencePrice > 0 &&
      product.price > 0 &&
      !priceWithinTolerance(product.price, target.referencePrice)
    ) {
      continue;
    }
    const confidence = Math.min(0.98, 0.85 + titleSim * 0.13);
    if (confidence > best.matchConfidence) {
      best = {
        matched: true,
        product,
        matchConfidence: confidence,
        matchReason: "title_store_price",
      };
    }
  }

  return best;
}

function sellerStillInTray(target: ListingRefreshTarget, products: QuantProduct[]): boolean {
  return products.some((product) => storeMatches(product.store, target.store));
}

function extractShippingPrice(product: QuantProduct): number | null {
  const ship = product.shipping ?? "";
  const match = ship.match(/(?:€|£|\$)\s*([\d,.]+)/i);
  if (!match?.[1]) return null;
  const n = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function resolveStructuralLabel(
  target: ListingRefreshTarget,
  products: QuantProduct[],
  match: ListingMatchResult
): ClassifiedAvailabilityLabel | undefined {
  if (match.matched && match.product) return undefined;
  if (products.length === 0) return "REMOVED";
  if (sellerStillInTray(target, products)) return "SELLER_UNAVAILABLE";
  return "REMOVED";
}

/** Build normalized observation from a matched tray product. */
export function buildObservationFromMatchedProduct(args: {
  target: ListingRefreshTarget;
  product: QuantProduct;
  source: string;
  matchConfidence: number;
  observedAt?: string;
  prior?: AvailabilityObservationSnapshot | null;
}): NormalizedAvailabilityObservation {
  const observedAt = args.observedAt ?? new Date().toISOString();
  const classification = classifyAvailability({
    availabilityText: args.product.availability,
    extensions: args.product.extensions,
    delivery: args.product.shipping,
  });
  return finalizeObservation({
    target: args.target,
    classification,
    source: args.source,
    observedAt,
    currentPrice: args.product.price > 0 ? args.product.price : null,
    shippingPrice: extractShippingPrice(args.product),
    matchConfidence: args.matchConfidence,
    prior: args.prior,
  });
}

/** Build normalized observation directly from a SerpApi shopping_results row. */
export function buildObservationFromSerpApiRow(args: {
  target: ListingRefreshTarget;
  row: Record<string, unknown>;
  extractedPrice: number | null;
  source: string;
  observedAt?: string;
  prior?: AvailabilityObservationSnapshot | null;
}): NormalizedAvailabilityObservation {
  const observedAt = args.observedAt ?? new Date().toISOString();
  const signals = parseSerpApiAvailabilitySignals(args.row);
  const classification = classifySerpApiShoppingRow(args.row);
  const shippingPrice = (() => {
    const d = signals.delivery ?? "";
    const match = d.match(/(?:€|£|\$)\s*([\d,.]+)/i);
    if (!match?.[1]) return null;
    const n = Number(match[1].replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();

  return finalizeObservation({
    target: args.target,
    classification,
    source: args.source,
    observedAt,
    currentPrice: args.extractedPrice,
    shippingPrice,
    matchConfidence: 1,
    prior: args.prior,
  });
}

/** Build observation when refresh search returns no match (removed / seller unavailable). */
export function buildObservationFromRefreshMiss(args: {
  target: ListingRefreshTarget;
  products: QuantProduct[];
  source: string;
  observedAt?: string;
  prior?: AvailabilityObservationSnapshot | null;
}): NormalizedAvailabilityObservation {
  const observedAt = args.observedAt ?? new Date().toISOString();
  const structuralLabel = resolveStructuralLabel(args.target, args.products, {
    matched: false,
    product: null,
    matchConfidence: 0,
    matchReason: "none",
  });
  const classification = classifyAvailability({
    structuralLabel,
    availabilityText:
      structuralLabel === "SELLER_UNAVAILABLE"
        ? `Seller ${args.target.store} — listing not found in fresh search`
        : "Listing not found in fresh search universe",
  });

  return finalizeObservation({
    target: args.target,
    classification,
    source: args.source,
    observedAt,
    currentPrice: args.prior?.current_price ?? null,
    shippingPrice: null,
    matchConfidence: 0,
    prior: args.prior,
  });
}

/**
 * End-to-end refresh normalization: match tray → classify → freshness → change detection.
 */
export function buildNormalizedAvailabilityObservation(args: {
  target: ListingRefreshTarget;
  products: QuantProduct[];
  source: string;
  observedAt?: string;
  prior?: AvailabilityObservationSnapshot | null;
}): NormalizedAvailabilityObservation {
  const match = matchListingInSearchResults(args.target, args.products);
  if (match.matched && match.product) {
    return buildObservationFromMatchedProduct({
      target: args.target,
      product: match.product,
      source: args.source,
      matchConfidence: match.matchConfidence,
      observedAt: args.observedAt,
      prior: args.prior,
    });
  }
  return buildObservationFromRefreshMiss({
    target: args.target,
    products: args.products,
    source: args.source,
    observedAt: args.observedAt,
    prior: args.prior,
  });
}

function finalizeObservation(args: {
  target: ListingRefreshTarget;
  classification: AvailabilityClassification;
  source: string;
  observedAt: string;
  currentPrice: number | null;
  shippingPrice: number | null;
  matchConfidence: number;
  prior: AvailabilityObservationSnapshot | null | undefined;
}): NormalizedAvailabilityObservation {
  const availability = classifiedLabelToDbStatus(args.classification.label);
  const { freshnessScore } = computeFreshnessScoreFromObservedAt(args.observedAt);
  const nextSnapshot: AvailabilityObservationSnapshot = {
    availability,
    current_price: args.currentPrice,
    observed_at: args.observedAt,
  };
  const changeDetection = detectAvailabilityChanges({
    prior: args.prior ?? null,
    next: nextSnapshot,
  });

  return {
    listing_url: args.target.listingUrl.trim(),
    sku_id: args.target.skuId?.trim() || null,
    observed_at: args.observedAt,
    availability,
    availability_text: args.classification.availabilityText,
    current_price: args.currentPrice,
    shipping_price: args.shippingPrice,
    source: args.source,
    freshness_score: freshnessScore,
    classifiedLabel: args.classification.label,
    classification: args.classification,
    matchConfidence: args.matchConfidence,
    changeDetection,
  };
}
