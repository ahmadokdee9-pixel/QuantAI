/**
 * Phase 1E — Structured availability state for truth gates.
 */

import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";

export type AvailabilityState = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN" | "STALE";

const UNAVAILABLE_STATUSES = new Set<AvailabilityStatus>([
  "out_of_stock",
  "removed",
  "seller_unavailable",
]);

const AVAILABLE_STATUSES = new Set<AvailabilityStatus>(["in_stock", "limited"]);

export const STALE_LISTING_HOURS = 24;

/** Derive coarse availability state from observation + freshness signals. */
export function deriveAvailabilityState(args: {
  availabilityStatus: AvailabilityStatus | "unknown";
  listingAgeHours: number;
  freshnessScore: number;
  hasObservation: boolean;
}): AvailabilityState {
  const status = args.availabilityStatus;

  if (!args.hasObservation) {
    if (UNAVAILABLE_STATUSES.has(status as AvailabilityStatus)) {
      return "UNAVAILABLE";
    }
    return "UNKNOWN";
  }

  if (UNAVAILABLE_STATUSES.has(status as AvailabilityStatus)) {
    return "UNAVAILABLE";
  }

  if (args.listingAgeHours > STALE_LISTING_HOURS || args.freshnessScore < 80) {
    return "STALE";
  }

  if (AVAILABLE_STATUSES.has(status as AvailabilityStatus)) {
    return "AVAILABLE";
  }

  return "UNKNOWN";
}

export function isUnavailableAvailabilityState(state: AvailabilityState): boolean {
  return state === "UNAVAILABLE";
}

export function isStaleAvailabilityState(state: AvailabilityState): boolean {
  return state === "STALE";
}

export function isUnknownAvailabilityState(state: AvailabilityState): boolean {
  return state === "UNKNOWN";
}
