/** Structured AI commerce analysis attached to each `QuantProduct` as `qiCommerce`. */

export type CommerceRiskSeverity = "low" | "medium" | "high";

export type CommerceRiskFlag = {
  code: string;
  severity: CommerceRiskSeverity;
  label: string;
};

export type CommerceAiSource = "openai" | "heuristic" | "cache";

export type ProductCommerceAI = {
  buyingVerdict: string;
  pros: string[];
  cons: string[];
  risks: CommerceRiskFlag[];
  /** 0–100: price + deal quality vs peers. */
  valueForMoney: number;
  /** 0–100: model certainty given listing data completeness. */
  confidence: number;
  /** Human-readable confidence rationale (transparent AI). */
  confidenceExplanation?: string;
  /** Missing or weak signals the user should verify manually. */
  signalGaps?: string[];
  /** When true, UI should nudge checkout verification. */
  needsManualVerification?: boolean;
  /** 0–100 heuristic retailer/marketplace unease from feed-only cues (higher = riskier). */
  retailerRiskScore?: number;
  retailerRiskNote?: string;
  /** 0–100 price position within this search tray (not market-wide history). */
  pricePercentile?: number;
  priceFieldNote?: string;
  priceAnomaly?: "none" | "deep_discount" | "premium_outlier" | "suspicious_low";
  /** Category-specific checklist lines (no fabricated specs). */
  categoryLens?: string[];
  /** Query-inferred shopping stance tags. */
  inferredPersonas?: string[];
  deliveryIntel: string | null;
  returnsIntel: string | null;
  trustWeightedNote: string | null;
  semanticVsQuery: string | null;
  comparedToFieldNote: string | null;
  modelId: string;
  source: CommerceAiSource;
};

/** Search-level commerce AI meta (cross-listing semantics). */
export type SearchCommerceAIMeta = {
  fieldComparisonSummary: string;
  source: CommerceAiSource;
  cached: boolean;
  modelId?: string;
};
