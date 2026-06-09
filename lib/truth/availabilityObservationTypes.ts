/**
 * Phase 1B.1 — Availability observation types (persistence layer only).
 */

export const AVAILABILITY_STATUSES = [
  "in_stock",
  "out_of_stock",
  "limited",
  "unknown",
  "removed",
  "seller_unavailable",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** Known observation sources; migration stores plain text — extend as pipeline grows. */
export const AVAILABILITY_OBSERVATION_SOURCES = [
  "watchlist",
  "saved",
  "search_cache",
  "buy_ready",
  "cron_refresh",
  "manual",
] as const;

export type AvailabilityObservationSource = (typeof AVAILABILITY_OBSERVATION_SOURCES)[number];

export type AvailabilityObservationRow = {
  id: string;
  listing_url: string;
  sku_id: string | null;
  observed_at: string;
  availability: AvailabilityStatus;
  availability_text: string | null;
  current_price: number | null;
  shipping_price: number | null;
  source: string;
  freshness_score: number;
  created_at: string;
};

export type AvailabilityObservationInsert = {
  listing_url: string;
  sku_id?: string | null;
  observed_at?: string;
  availability: AvailabilityStatus;
  availability_text?: string | null;
  current_price?: number | null;
  shipping_price?: number | null;
  source: string;
  freshness_score?: number;
};
