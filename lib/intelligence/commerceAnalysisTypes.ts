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
