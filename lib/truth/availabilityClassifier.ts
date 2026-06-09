/**
 * Phase 1B.2 — Availability classifier (SerpApi signals → normalized labels).
 */

import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";

export const CLASSIFIED_AVAILABILITY_LABELS = [
  "IN_STOCK",
  "OUT_OF_STOCK",
  "LIMITED",
  "REMOVED",
  "SELLER_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type ClassifiedAvailabilityLabel = (typeof CLASSIFIED_AVAILABILITY_LABELS)[number];

export type SerpApiAvailabilitySignals = {
  availabilityText: string | null;
  extensions: string[];
  condition: string | null;
  secondHand: boolean;
  delivery: string | null;
  snippet: string | null;
};

export type AvailabilityClassification = {
  label: ClassifiedAvailabilityLabel;
  availabilityText: string | null;
  matchedSignals: string[];
};

const DB_TO_LABEL: Record<AvailabilityStatus, ClassifiedAvailabilityLabel> = {
  in_stock: "IN_STOCK",
  out_of_stock: "OUT_OF_STOCK",
  limited: "LIMITED",
  unknown: "UNKNOWN",
  removed: "REMOVED",
  seller_unavailable: "SELLER_UNAVAILABLE",
};

const LABEL_TO_DB: Record<ClassifiedAvailabilityLabel, AvailabilityStatus> = {
  IN_STOCK: "in_stock",
  OUT_OF_STOCK: "out_of_stock",
  LIMITED: "limited",
  UNKNOWN: "unknown",
  REMOVED: "removed",
  SELLER_UNAVAILABLE: "seller_unavailable",
};

function parseExtensions(row: Record<string, unknown>): string[] {
  const ex = row.extensions;
  if (!Array.isArray(ex)) return [];
  return ex
    .map((x) => (typeof x === "string" ? x : String(x)))
    .filter(Boolean)
    .slice(0, 8);
}

function readDelivery(row: Record<string, unknown>): string | null {
  const d = row.delivery;
  if (typeof d === "string" && d.trim()) return d.trim();
  const snippet = row.snippet;
  if (typeof snippet === "string" && /ship|delivery|pickup|free/i.test(snippet)) {
    return snippet.trim().slice(0, 120);
  }
  return null;
}

function readAvailabilityText(row: Record<string, unknown>, extensions: string[]): string | null {
  if (row.second_hand === true) return "Used / second-hand";
  if (typeof row.condition === "string" && row.condition.trim()) return row.condition.trim();
  const first = extensions[0];
  if (first && /in stock|out of stock|preorder|used|limited|unavailable|sold/i.test(first)) return first;
  if (typeof row.availability === "string" && row.availability.trim()) return row.availability.trim();
  return null;
}

/** Extract SerpApi Google Shopping availability-related fields from a raw result row. */
export function parseSerpApiAvailabilitySignals(row: Record<string, unknown>): SerpApiAvailabilitySignals {
  const extensions = parseExtensions(row);
  return {
    availabilityText: readAvailabilityText(row, extensions),
    extensions,
    condition: typeof row.condition === "string" ? row.condition.trim() : null,
    secondHand: row.second_hand === true,
    delivery: readDelivery(row),
    snippet: typeof row.snippet === "string" ? row.snippet.trim().slice(0, 120) : null,
  };
}

function collectSignalBlob(signals: SerpApiAvailabilitySignals): string {
  return [
    signals.availabilityText ?? "",
    signals.condition ?? "",
    signals.delivery ?? "",
    signals.snippet ?? "",
    signals.extensions.join(" "),
    signals.secondHand ? "second hand used" : "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Classify availability from parsed SerpApi signals or free-text listing fields. */
export function classifyAvailability(args: {
  availabilityText?: string | null;
  extensions?: string[];
  condition?: string | null;
  secondHand?: boolean;
  delivery?: string | null;
  snippet?: string | null;
  /** Structural match outcomes from refresh adapter (not SerpApi text). */
  structuralLabel?: ClassifiedAvailabilityLabel;
}): AvailabilityClassification {
  if (args.structuralLabel) {
    return {
      label: args.structuralLabel,
      availabilityText: args.availabilityText?.trim() || null,
      matchedSignals: ["structural_match"],
    };
  }

  const signals: SerpApiAvailabilitySignals = {
    availabilityText: args.availabilityText?.trim() || null,
    extensions: args.extensions ?? [],
    condition: args.condition?.trim() || null,
    secondHand: args.secondHand === true,
    delivery: args.delivery?.trim() || null,
    snippet: args.snippet?.trim() || null,
  };

  const blob = collectSignalBlob(signals);
  const matchedSignals: string[] = [];

  if (/out of stock|sold out|unavailable|not available|no longer available|discontinued/i.test(blob)) {
    if (/out of stock|sold out/i.test(blob)) matchedSignals.push("out_of_stock_text");
    else matchedSignals.push("unavailable_text");
    return {
      label: "OUT_OF_STOCK",
      availabilityText: signals.availabilityText,
      matchedSignals,
    };
  }

  if (/limited stock|only \d+ left|low stock|few left|last items|almost gone|limited availability/i.test(blob)) {
    matchedSignals.push("limited_stock_text");
    return {
      label: "LIMITED",
      availabilityText: signals.availabilityText,
      matchedSignals,
    };
  }

  if (/preorder|pre-order|backorder|back order/i.test(blob)) {
    matchedSignals.push("preorder_text");
    return {
      label: "LIMITED",
      availabilityText: signals.availabilityText,
      matchedSignals,
    };
  }

  if (/in stock|available now|ships today|ready to ship|available/i.test(blob)) {
    matchedSignals.push("in_stock_text");
    return {
      label: "IN_STOCK",
      availabilityText: signals.availabilityText,
      matchedSignals,
    };
  }

  if (/free delivery|delivery|ships|pickup/i.test(blob) && signals.delivery) {
    matchedSignals.push("fulfillment_present");
    return {
      label: "IN_STOCK",
      availabilityText: signals.availabilityText ?? signals.delivery,
      matchedSignals,
    };
  }

  if (signals.secondHand) {
    matchedSignals.push("second_hand");
    return {
      label: "UNKNOWN",
      availabilityText: signals.availabilityText ?? "Used / second-hand",
      matchedSignals,
    };
  }

  matchedSignals.push("no_availability_signal");
  return {
    label: "UNKNOWN",
    availabilityText: signals.availabilityText,
    matchedSignals,
  };
}

/** Classify directly from a SerpApi shopping_results row. */
export function classifySerpApiShoppingRow(row: Record<string, unknown>): AvailabilityClassification {
  const signals = parseSerpApiAvailabilitySignals(row);
  return classifyAvailability({
    availabilityText: signals.availabilityText,
    extensions: signals.extensions,
    condition: signals.condition,
    secondHand: signals.secondHand,
    delivery: signals.delivery,
    snippet: signals.snippet,
  });
}

export function classifiedLabelToDbStatus(label: ClassifiedAvailabilityLabel): AvailabilityStatus {
  return LABEL_TO_DB[label];
}

export function dbStatusToClassifiedLabel(status: AvailabilityStatus): ClassifiedAvailabilityLabel {
  return DB_TO_LABEL[status];
}

export function isClassifiedAvailabilityLabel(value: string): value is ClassifiedAvailabilityLabel {
  return (CLASSIFIED_AVAILABILITY_LABELS as readonly string[]).includes(value);
}
