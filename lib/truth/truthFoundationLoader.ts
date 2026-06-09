/**
 * Phase 1E — Batch-load truth foundation observations from DB (service role).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  getLatestObservationsByListingUrls,
  getLatestObservationsBySkuIds,
} from "@/lib/truth/availabilityObservation";
import { listHistoricalPriceObservationsForSkus } from "@/lib/truth/historicalPriceObservation";
import { resolveSkuIdentity } from "@/lib/truth/skuResolver";
import type { TruthFoundationPrefetchEntry } from "@/lib/truth/truthFoundationTypes";

export type TruthFoundationPrefetchInput = {
  product: QuantProduct;
  listingUrl: string;
  searchQuery?: string;
};

function pickAvailabilityObservation(args: {
  listingUrl: string;
  canonicalSkuId: string;
  byListing: Map<string, import("@/lib/truth/availabilityObservationTypes").AvailabilityObservationRow>;
  bySku: Map<string, import("@/lib/truth/availabilityObservationTypes").AvailabilityObservationRow>;
}): import("@/lib/truth/availabilityObservationTypes").AvailabilityObservationRow | null {
  const listingRow = args.byListing.get(args.listingUrl) ?? null;
  const skuRow = args.bySku.get(args.canonicalSkuId) ?? null;
  if (!listingRow) return skuRow;
  if (!skuRow) return listingRow;
  return Date.parse(listingRow.observed_at) >= Date.parse(skuRow.observed_at) ? listingRow : skuRow;
}

/** Batch prefetch DB observations for a tray (server-side). */
export async function prefetchTruthFoundationBatch(
  inputs: TruthFoundationPrefetchInput[]
): Promise<Map<string, TruthFoundationPrefetchEntry>> {
  const out = new Map<string, TruthFoundationPrefetchEntry>();
  if (inputs.length === 0) return out;

  const resolved = inputs.slice(0, 56).map((input) => {
    const sku = resolveSkuIdentity({
      product: input.product,
      listingUrl: input.listingUrl,
      searchQuery: input.searchQuery ?? null,
    });
    return {
      ...input,
      canonicalSkuId: sku.canonicalSkuId,
      skuIdentityConfidence: sku.identityConfidence,
    };
  });

  const listingUrls = resolved.map((row) => row.listingUrl);
  const skuIds = resolved.map((row) => row.canonicalSkuId);

  const [byListing, bySku, priceBySku] = await Promise.all([
    getLatestObservationsByListingUrls(listingUrls),
    getLatestObservationsBySkuIds(skuIds),
    listHistoricalPriceObservationsForSkus(skuIds),
  ]);

  for (const row of resolved) {
    const availabilityObservation = pickAvailabilityObservation({
      listingUrl: row.listingUrl,
      canonicalSkuId: row.canonicalSkuId,
      byListing,
      bySku,
    });
    const priceObservations = priceBySku.get(row.canonicalSkuId) ?? [];

    out.set(row.listingUrl, {
      listingUrl: row.listingUrl,
      canonicalSkuId: row.canonicalSkuId,
      skuIdentityConfidence: row.skuIdentityConfidence,
      availabilityObservation,
      priceObservations,
      availabilityDataSource: availabilityObservation ? "db" : "inline",
      priceHistoryDataSource: priceObservations.length > 0 ? "db" : "inline",
    });
  }

  return out;
}

/** Serialize prefetch map for search API meta (JSON-safe). */
export function serializeTruthFoundationPrefetch(
  prefetch: Map<string, TruthFoundationPrefetchEntry>
): Record<string, TruthFoundationPrefetchEntry> {
  return Object.fromEntries(prefetch.entries());
}

/** Parse prefetch from search meta on the client. */
export function parseTruthFoundationPrefetch(
  raw: unknown
): Map<string, TruthFoundationPrefetchEntry> {
  const out = new Map<string, TruthFoundationPrefetchEntry>();
  if (!raw || typeof raw !== "object") return out;

  for (const [link, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<TruthFoundationPrefetchEntry>;
    if (typeof row.listingUrl !== "string" || typeof row.canonicalSkuId !== "string") continue;
    out.set(link, {
      listingUrl: row.listingUrl,
      canonicalSkuId: row.canonicalSkuId,
      skuIdentityConfidence: typeof row.skuIdentityConfidence === "number" ? row.skuIdentityConfidence : 0,
      availabilityObservation:
        row.availabilityObservation && typeof row.availabilityObservation === "object"
          ? (row.availabilityObservation as TruthFoundationPrefetchEntry["availabilityObservation"])
          : null,
      priceObservations: Array.isArray(row.priceObservations)
        ? (row.priceObservations as TruthFoundationPrefetchEntry["priceObservations"])
        : [],
      availabilityDataSource: row.availabilityDataSource === "db" ? "db" : "inline",
      priceHistoryDataSource:
        row.priceHistoryDataSource === "db"
          ? "db"
          : row.priceHistoryDataSource === "memory"
            ? "memory"
            : "inline",
    });
  }

  return out;
}
