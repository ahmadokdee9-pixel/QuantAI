/**
 * QuantAI Live Commerce Discovery — merchant candidate generation.
 * Builds direct merchant search routes and compact expansion queries for NL/EU first.
 */

import { buildSearchQueryUnderstanding } from "@/lib/search/queryUnderstanding";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildWideMerchantCandidates } from "./wideMerchantDiscovery";

export type ExternalMerchantCandidate = {
  merchantKey: string;
  label: string;
  url: string;
  priority: number;
  region: "nl" | "eu" | "global";
  identityQuery: string;
  queryKind?: "exact" | "identity" | "specs" | "ean" | "fallback";
  routeQuality?: number;
  directRoute?: boolean;
};

export function buildExternalMerchantCandidates(query: string, canonicalQuery?: CanonicalQueryContract): ExternalMerchantCandidate[] {
  return buildWideMerchantCandidates(query, canonicalQuery ?? buildSearchQueryUnderstanding(query)).map((c) => ({
    merchantKey: c.merchantKey,
    label: c.label,
    url: c.url,
    priority: c.priority,
    region: c.region,
    identityQuery: c.identityQuery,
    queryKind: c.queryKind,
    routeQuality: c.routeQuality,
    directRoute: c.directRoute,
  }));
}

export function buildExternalExpansionQueries(
  query: string,
  candidates: ExternalMerchantCandidate[],
  canonicalQuery?: CanonicalQueryContract
): string[] {
  const q = canonicalQuery?.semantic ?? buildSearchQueryUnderstanding(query);
  const identity = candidates.find((c) => c.queryKind === "identity")?.identityQuery ?? q.rewritten ?? query.trim();
  const exact = candidates.find((c) => c.queryKind === "exact")?.identityQuery ?? query.trim();
  const specs = candidates.find((c) => c.queryKind === "specs")?.identityQuery ?? identity;
  const chunks = [candidates.slice(0, 20), candidates.slice(20, 40), candidates.slice(40, 60), candidates.slice(60, 80)].filter((xs) => xs.length > 0);
  const vertical =
    q.productCategory === "shoes"
      ? "official sneakers shoes"
      : q.productCategory === "furniture"
        ? "trusted furniture sofa"
        : q.productCategory === "fragrance"
          ? "authentic perfume fragrance"
          : q.productCategory === "laptop" || q.productCategory === "phone" || q.productCategory === "audio"
            ? "trusted electronics official"
            : "trusted stores";
  return chunks
    .map((chunk, index) => {
      const base = index === 0 ? exact : index === 1 ? identity : specs;
      return `${base} ${chunk.map((c) => c.label.replace(/\.com$/i, "")).join(" ")} ${vertical}`.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .slice(0, 4);
}
