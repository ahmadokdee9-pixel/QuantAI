/**
 * Phase 1B.2 — Detect availability and price changes between observations.
 */

import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";
import { dbStatusToClassifiedLabel, type ClassifiedAvailabilityLabel } from "@/lib/truth/availabilityClassifier";

export type AvailabilityChangeKind =
  | "stock_in_to_out"
  | "stock_out_to_in"
  | "stock_became_limited"
  | "listing_removed"
  | "seller_disappeared"
  | "price_drop_major"
  | "price_increase_major";

export type AvailabilityChangeAlert = {
  type:
    | "out_of_stock"
    | "back_in_stock"
    | "seller_disappeared"
    | "listing_removed"
    | "price_dropped"
    | "major_price_up";
  severity: "info" | "action";
};

export type AvailabilityObservationSnapshot = {
  availability: AvailabilityStatus;
  current_price: number | null;
  observed_at: string;
};

export type AvailabilityChangeDetection = {
  changes: AvailabilityChangeKind[];
  alerts: AvailabilityChangeAlert[];
  priceDeltaPct: number | null;
  priorLabel: ClassifiedAvailabilityLabel | null;
  nextLabel: ClassifiedAvailabilityLabel;
};

export const DEFAULT_MAJOR_PRICE_DROP_PCT = 0.08;
export const DEFAULT_MAJOR_PRICE_UP_PCT = 0.12;

const STOCK_IN: AvailabilityStatus[] = ["in_stock", "limited"];
const STOCK_OUT: AvailabilityStatus[] = ["out_of_stock", "removed", "seller_unavailable"];

function isStockIn(status: AvailabilityStatus): boolean {
  return STOCK_IN.includes(status);
}

function isStockOut(status: AvailabilityStatus): boolean {
  return STOCK_OUT.includes(status);
}

function computePriceDeltaPct(
  priorPrice: number | null,
  nextPrice: number | null
): number | null {
  if (priorPrice == null || nextPrice == null || priorPrice <= 0 || nextPrice <= 0) return null;
  return (nextPrice - priorPrice) / priorPrice;
}

/** Compare prior and next observation snapshots; emit change kinds and alert intents. */
export function detectAvailabilityChanges(args: {
  prior: AvailabilityObservationSnapshot | null;
  next: AvailabilityObservationSnapshot;
  majorPriceDropPct?: number;
  majorPriceUpPct?: number;
}): AvailabilityChangeDetection {
  const dropPct = args.majorPriceDropPct ?? DEFAULT_MAJOR_PRICE_DROP_PCT;
  const upPct = args.majorPriceUpPct ?? DEFAULT_MAJOR_PRICE_UP_PCT;
  const changes: AvailabilityChangeKind[] = [];
  const alerts: AvailabilityChangeAlert[] = [];

  const nextLabel = dbStatusToClassifiedLabel(args.next.availability);
  const priorLabel = args.prior ? dbStatusToClassifiedLabel(args.prior.availability) : null;
  const priceDeltaPct = args.prior
    ? computePriceDeltaPct(args.prior.current_price, args.next.current_price)
    : null;

  if (!args.prior) {
    return { changes, alerts, priceDeltaPct, priorLabel, nextLabel };
  }

  const priorStatus = args.prior.availability;
  const nextStatus = args.next.availability;

  if (nextStatus === "removed" && priorStatus !== "removed") {
    changes.push("listing_removed");
    alerts.push({ type: "listing_removed", severity: "action" });
  }

  if (nextStatus === "seller_unavailable" && priorStatus !== "seller_unavailable") {
    changes.push("seller_disappeared");
    alerts.push({ type: "seller_disappeared", severity: "action" });
  }

  if (isStockIn(priorStatus) && isStockOut(nextStatus)) {
    changes.push("stock_in_to_out");
    alerts.push({ type: "out_of_stock", severity: "action" });
  }

  if (isStockOut(priorStatus) && isStockIn(nextStatus)) {
    changes.push("stock_out_to_in");
    alerts.push({ type: "back_in_stock", severity: "action" });
  }

  if (nextStatus === "limited" && priorStatus !== "limited" && isStockIn(priorStatus)) {
    changes.push("stock_became_limited");
  }

  if (priceDeltaPct != null) {
    if (priceDeltaPct <= -dropPct) {
      changes.push("price_drop_major");
      alerts.push({ type: "price_dropped", severity: "action" });
    } else if (priceDeltaPct >= upPct) {
      changes.push("price_increase_major");
      alerts.push({ type: "major_price_up", severity: "info" });
    }
  }

  return { changes, alerts, priceDeltaPct, priorLabel, nextLabel };
}
