/**
 * QuantAI intelligence signal normalization — safe defaults for partial enrichment / weak payloads.
 * Centralizes array + numeric coercion so layers never call `.includes` on undefined.
 */

import {
  coerceCommercialRoles,
  type CommercialRole,
  type ProductCompletenessEstimate,
} from "@/lib/intelligence/eliteCommercialOntology";
import type { ListingIdentityFlag, QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";

const LISTING_IDENTITY_FLAG_WHITELIST = new Set<string>([
  "accessory_lane",
  "display_or_demo",
  "non_functional_or_parts",
  "dummy_placeholder",
  "inventory_pattern_noise",
  "seller_ambiguous",
  "title_incomplete",
  "suspicious_price_story",
  "query_contamination",
  "misleading_inventory",
  "semantic_pollution",
  "commercial_identity_risk",
]);

const COMPLETENESS_WHITELIST = new Set<string>([
  "complete_saleable_unit",
  "accessory_only",
  "parts_or_subassembly",
  "bundle_unclear",
  "unknown",
]);

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Memo-safe string list: never null; drops non-strings; trims; de-dupes */
export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of value) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function normalizeCommercialRoles(value: unknown): CommercialRole[] {
  return coerceCommercialRoles(value);
}

export function normalizeListingIdentityFlags(value: unknown): ListingIdentityFlag[] {
  const raw = normalizeStringArray(value);
  const out: ListingIdentityFlag[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    if (!LISTING_IDENTITY_FLAG_WHITELIST.has(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s as ListingIdentityFlag);
  }
  return out;
}

export type IdentitySignalsSlice = {
  flags: ListingIdentityFlag[];
  commercialRoles: CommercialRole[];
};

/** Groups commonly paired listing planes for batch coercion */
export function normalizeIdentitySignals(input: {
  flags?: unknown;
  commercialRoles?: unknown;
}): IdentitySignalsSlice {
  return {
    flags: normalizeListingIdentityFlags(input.flags),
    commercialRoles: normalizeCommercialRoles(input.commercialRoles),
  };
}

function normalizeProductCompleteness(value: unknown): ProductCompletenessEstimate {
  if (typeof value !== "string") return "unknown";
  const v = value.trim();
  return COMPLETENESS_WHITELIST.has(v) ? (v as ProductCompletenessEstimate) : "unknown";
}

const FALLBACK_QI_LISTING: QiListingIdentity = {
  fingerprintCompact: "ufp_fallback",
  retailerAgnosticStem: "",
  variantSignature: "",
  listingRisk01: 0,
  accessoryLikelihood01: 0,
  contaminant01: 0,
  commercialRoles: [],
  productCompleteness: "unknown",
  bundleIntegrity01: 0.48,
  pollutionGrammar01: 0,
  contaminationRisk01: 0,
  semanticMismatchPenalty01: 0,
  flags: [],
};

/** Full QiListingIdentity coercion — safe for mixed API payloads */
export function normalizeQiListingIdentity(input: Partial<QiListingIdentity> | null | undefined): QiListingIdentity {
  if (input == null) return { ...FALLBACK_QI_LISTING };

  const ids = normalizeIdentitySignals({
    flags: input.flags,
    commercialRoles: input.commercialRoles,
  });

  return {
    fingerprintCompact:
      typeof input.fingerprintCompact === "string" && input.fingerprintCompact.trim().length > 0
        ? input.fingerprintCompact.trim()
        : FALLBACK_QI_LISTING.fingerprintCompact,
    retailerAgnosticStem:
      typeof input.retailerAgnosticStem === "string" ? input.retailerAgnosticStem : FALLBACK_QI_LISTING.retailerAgnosticStem,
    variantSignature:
      typeof input.variantSignature === "string" ? input.variantSignature : FALLBACK_QI_LISTING.variantSignature,
    listingRisk01: clamp01(Number(input.listingRisk01)),
    accessoryLikelihood01: clamp01(Number(input.accessoryLikelihood01)),
    contaminant01: clamp01(Number(input.contaminant01)),
    commercialRoles: ids.commercialRoles,
    productCompleteness: normalizeProductCompleteness(input.productCompleteness),
    bundleIntegrity01: clamp01(Number(input.bundleIntegrity01)),
    pollutionGrammar01: clamp01(Number(input.pollutionGrammar01)),
    contaminationRisk01: clamp01(Number(input.contaminationRisk01)),
    semanticMismatchPenalty01: clamp01(Number(input.semanticMismatchPenalty01)),
    flags: ids.flags,
  };
}

export function isQiListingIdentityTrustworthy(id: Partial<QiListingIdentity> | null | undefined): boolean {
  if (id == null) return false;
  if (typeof id.fingerprintCompact !== "string" || id.fingerprintCompact.trim().length < 4) return false;
  if (!Array.isArray(id.commercialRoles) || !Array.isArray(id.flags)) return false;
  if (typeof id.productCompleteness !== "string" || !COMPLETENESS_WHITELIST.has(id.productCompleteness)) return false;
  const nums = [
    id.listingRisk01,
    id.accessoryLikelihood01,
    id.contaminant01,
    id.bundleIntegrity01,
    id.pollutionGrammar01,
    id.contaminationRisk01,
    id.semanticMismatchPenalty01,
  ];
  return nums.every((n) => typeof n === "number" && Number.isFinite(n));
}
