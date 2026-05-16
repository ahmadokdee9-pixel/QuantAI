import type { CommercialRole, ProductCompletenessEstimate } from "@/lib/intelligence/eliteCommercialOntology";

export type ListingIdentityFlag =
  | "accessory_lane"
  | "display_or_demo"
  | "non_functional_or_parts"
  | "dummy_placeholder"
  | "inventory_pattern_noise"
  | "seller_ambiguous"
  | "title_incomplete"
  | "suspicious_price_story"
  | "query_contamination"
  | "misleading_inventory"
  | "semantic_pollution"
  | "commercial_identity_risk";

export type QiListingIdentity = {
  fingerprintCompact: string;
  retailerAgnosticStem: string;
  variantSignature: string;
  listingRisk01: number;
  accessoryLikelihood01: number;
  contaminant01: number;
  commercialRoles: CommercialRole[];
  productCompleteness: ProductCompletenessEstimate;
  bundleIntegrity01: number;
  pollutionGrammar01: number;
  contaminationRisk01: number;
  semanticMismatchPenalty01: number;
  flags: ListingIdentityFlag[];
};
