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
  const productContext = [
    canonicalQuery?.productType !== "general" ? canonicalQuery?.productType : "",
    canonicalQuery?.brand,
    canonicalQuery?.model,
    canonicalQuery?.variant,
  ].filter(Boolean).join(" ");
  const vertical =
    productContext ||
    (q.productCategory === "shoes"
      ? "official sneakers shoes"
      : q.productCategory === "furniture"
        ? "trusted furniture sofa"
        : q.productCategory === "fragrance"
          ? "authentic perfume fragrance"
          : q.productCategory === "laptop" || q.productCategory === "phone" || q.productCategory === "audio"
            ? "trusted electronics official"
            : "trusted stores");
  const localizedAliases: string[] = [];
  const raw = query.toLowerCase();
  if (canonicalQuery?.language === "arabic" || /[\u0600-\u06FF]/.test(query)) {
    if (/كنبة\s+زاوية|زاوية/.test(raw)) localizedAliases.push("corner sofa hoekbank sofa");
    else if (/كنبة/.test(raw)) localizedAliases.push("sofa couch bankstel");
    if (/طاولة\s+حديقة|حديقة/.test(raw)) localizedAliases.push("garden table tuin tafel");
    if (/ايفون|آيفون/.test(raw)) localizedAliases.push([canonicalQuery?.model ?? "iphone", canonicalQuery?.variant].filter(Boolean).join(" "));
    if (/ايربودز|سماعات/.test(raw)) localizedAliases.push("apple airpods earbuds");
    if (/عطر/.test(raw)) localizedAliases.push("perfume fragrance eau de parfum");
    if (/سيروم|فيتامين\s*سي|عناية|كريم/.test(raw)) localizedAliases.push("vitamin c serum skincare beauty");
    if (/مكنسة|روبوت/.test(raw)) localizedAliases.push("robot vacuum roomba roborock");
    if (/بلايستيشن|كنترولر|يد\s+تحكم/.test(raw)) localizedAliases.push("ps5 dualsense controller");
  }
  if (/\b(robot vacuum|robotstofzuiger|roomba|roborock)\b/i.test(raw)) localizedAliases.push("robotstofzuiger robot vacuum roomba roborock irobot bol coolblue mediamarkt");
  if (/\b(ps5 controller|dualsense|playstation controller|gamepad)\b/i.test(raw)) localizedAliases.push("ps5 dualsense controller playstation currys argos john lewis");
  if (/\b(vitamin c serum|vitamine c serum|beauty serum)\b/i.test(raw)) localizedAliases.push("vitamin c serum skincare beauty");
  return [
    ...localizedAliases,
    ...chunks
    .map((chunk, index) => {
      const base = index === 0 ? exact : index === 1 ? identity : specs;
      const merchantHints = chunk
        .slice(0, 4)
        .map((c) => c.label.replace(/\.com$/i, ""))
        .join(" ");
      if (index === 0) return base.replace(/\s+/g, " ").trim();
      return `${base} ${merchantHints} ${vertical}`.replace(/\s+/g, " ").trim();
    }),
  ]
    .filter(Boolean)
    .slice(0, 4);
}
