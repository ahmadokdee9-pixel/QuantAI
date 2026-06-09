/**
 * Phase 1D.5 — Build truth foundation + evidence sources from intel and product context.
 */

import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import { getSnapshotsForLink } from "@/lib/intelligence/marketMemory";
import type { QuantProduct } from "@/lib/shoppingScore";
import { classifyAvailability } from "@/lib/truth/availabilityClassifier";
import { classifiedLabelToDbStatus } from "@/lib/truth/availabilityClassifier";
import type { HistoricalPriceObservationRow } from "@/lib/truth/priceHistoryTypes";
import { buildPriceTruthBundle } from "@/lib/truth/priceTruth";
import { resolveSkuIdentity } from "@/lib/truth/skuResolver";
import type {
  ExtendedTruthEvidenceSources,
  TruthFoundationSnapshot,
} from "@/lib/truth/truthFoundationTypes";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

const STALE_LISTING_HOURS = 24;

function availabilityFromProduct(product: QuantProduct): TruthFoundationSnapshot["availability"] {
  const classification = classifyAvailability({
    availabilityText: product.availability,
    extensions: product.extensions,
    delivery: product.shipping,
  });
  return {
    freshnessScore: 100,
    listingAgeHours: 0,
    observedAt: new Date().toISOString(),
    availabilityStatus: classifiedLabelToDbStatus(classification.label),
  };
}

function memoryToHistoricalRows(
  canonicalSkuId: string,
  link: string,
  memory: MarketMemoryState | null | undefined
): HistoricalPriceObservationRow[] {
  const snaps = getSnapshotsForLink(memory, link);
  return snaps.map((snap, index) => ({
    id: `mem-${index}`,
    canonical_sku_id: canonicalSkuId,
    merchant_key: snap.store.toLowerCase().replace(/\s+/g, "_").slice(0, 48) || "unknown",
    listing_url: link,
    observed_price: snap.price,
    currency: "EUR",
    observed_at: new Date(snap.ts).toISOString(),
    availability_status: "in_stock",
    source: "market_memory",
    created_at: new Date(snap.ts).toISOString(),
  }));
}

/** Build truth foundation snapshot for one listing (sync, no DB). */
export function buildTruthFoundationSnapshot(args: {
  product: QuantProduct;
  listingUrl: string;
  searchQuery?: string;
  marketMemory?: MarketMemoryState | null;
  observedAt?: string;
  listingAgeHours?: number;
  existing?: TruthFoundationSnapshot | null;
}): TruthFoundationSnapshot {
  if (args.existing?.version === 1) return args.existing;

  const sku = resolveSkuIdentity({
    product: args.product,
    listingUrl: args.listingUrl,
    searchQuery: args.searchQuery ?? null,
  });

  const availability =
    args.listingAgeHours != null && args.listingAgeHours > 0
      ? {
          ...availabilityFromProduct(args.product),
          listingAgeHours: args.listingAgeHours,
          freshnessScore: args.listingAgeHours < STALE_LISTING_HOURS ? 100 : args.listingAgeHours < 48 ? 80 : args.listingAgeHours < 72 ? 60 : 30,
          observedAt: args.observedAt ?? null,
        }
      : availabilityFromProduct(args.product);

  const historicalRows = memoryToHistoricalRows(sku.canonicalSkuId, args.listingUrl, args.marketMemory);
  const currentPrice = args.product.price > 0 ? args.product.price : null;

  const priceTruth =
    currentPrice != null
      ? buildPriceTruthBundle({
          canonicalSkuId: sku.canonicalSkuId,
          currentPrice,
          observations: historicalRows,
          marketedOldPrice: args.product.oldPrice,
        })
      : null;

  return {
    version: 1,
    canonicalSkuId: sku.canonicalSkuId,
    skuIdentityConfidence: sku.identityConfidence,
    availability,
    priceTruth,
    discountEvidence: priceTruth?.discountEvidence ?? null,
    baselineCoverage: priceTruth?.baselineCoverage ?? null,
    priceTruthConfidence: priceTruth?.priceTruthConfidence ?? 0,
  };
}

/** Attach truth foundation to a universal decision before gating. */
export function attachTruthFoundationToDecision(
  decision: UniversalProductDecision,
  args: {
    product: QuantProduct;
    searchQuery?: string;
    marketMemory?: MarketMemoryState | null;
  }
): UniversalProductDecision {
  const intel = decision.productIntelligence;
  if (!intel) return decision;

  const foundation = buildTruthFoundationSnapshot({
    product: args.product,
    listingUrl: decision.link,
    searchQuery: args.searchQuery,
    marketMemory: args.marketMemory,
    existing: intel.truthFoundation ?? null,
  });

  return {
    ...decision,
    productIntelligence: {
      ...intel,
      truthFoundation: foundation,
    },
  };
}

/** Merge legacy intel signals with Phase 1B–1D foundation evidence. */
export function buildExtendedTruthEvidenceSources(
  intel: NonNullable<UniversalProductDecision["productIntelligence"]>
): ExtendedTruthEvidenceSources {
  const foundation = intel.truthFoundation;
  const priceHistorySamples =
    foundation?.baselineCoverage?.samples90d ??
    intel.commercePriceHistory?.insight?.sampleCount ??
    0;
  const identityConfidence =
    foundation?.skuIdentityConfidence ??
    intel.productIdentityV2?.identityConfidence ??
    intel.globalProductIdentity?.identityConfidence ??
    0;
  const marketCoverageScore = intel.marketDepth?.marketCoverageScore ?? intel.marketCoverage?.coveragePct ?? 50;
  const discountProofScore =
    foundation?.priceTruthConfidence ??
    intel.realDiscountProof?.discountAuthenticityScore ??
    intel.discountConfidence?.discountConfidence ??
    0;
  const discountFake =
    foundation?.priceTruth?.fakeDiscount.isFake === true ||
    intel.realDiscountProof?.band.includes("Fake") ||
    intel.realDiscountValidationV3?.fakeDiscountScoreHigh === true ||
    intel.discountConfidence?.label === "Weak Discount Signal";
  const merchantTrustScore =
    intel.merchantReliability?.merchantReliabilityScore ??
    intel.realMerchantVerification?.merchantTrustScore ??
    intel.merchantTrustIntelligence?.trustScore ??
    0;
  const hasListingPrice = (intel.globalPriceIntelligence?.lowestPriceFound ?? 0) > 0;

  return {
    priceHistorySamples,
    identityConfidence,
    marketCoverageScore,
    discountProofScore,
    discountFake,
    merchantTrustScore,
    hasListingPrice,
    priceTruthConfidence: foundation?.priceTruthConfidence ?? 0,
    discountEvidence: foundation?.discountEvidence ?? null,
    baselineCoverage: foundation?.baselineCoverage ?? null,
    availabilityFreshness: foundation?.availability.freshnessScore ?? 100,
    listingAgeHours: foundation?.availability.listingAgeHours ?? 0,
    availabilityStatus: foundation?.availability.availabilityStatus ?? "unknown",
    canonicalSkuId: foundation?.canonicalSkuId ?? null,
    skuIdentityConfidence: foundation?.skuIdentityConfidence ?? identityConfidence,
    discountVerificationState: foundation?.discountEvidence?.state ?? null,
  };
}

export type { TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
