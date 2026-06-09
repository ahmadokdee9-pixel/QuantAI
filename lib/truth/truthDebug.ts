/**
 * Phase 1E — Truth debug trace (TRUTH_DEBUG=true).
 */

import type { AvailabilityState } from "@/lib/truth/availabilityStateModel";

export type TruthDataSourceKind = "db" | "memory" | "inline";

export type TruthDebugTrace = {
  enabled: true;
  listingUrl: string;
  canonicalSkuId: string | null;
  availabilityState: AvailabilityState;
  dataSources: {
    availability: TruthDataSourceKind;
    priceHistory: TruthDataSourceKind;
  };
  listingAgeHours: number;
  freshnessScore: number;
  priceObservationCount: number;
  skuIdentityConfidence: number;
  priceTruthConfidence: number;
  discountState: string | null;
};

/** Whether structured truth debug traces are enabled. */
export function isTruthDebugEnabled(): boolean {
  return process.env.TRUTH_DEBUG === "true";
}

export function buildTruthDebugTrace(args: Omit<TruthDebugTrace, "enabled">): TruthDebugTrace | null {
  if (!isTruthDebugEnabled()) return null;
  return { enabled: true, ...args };
}
