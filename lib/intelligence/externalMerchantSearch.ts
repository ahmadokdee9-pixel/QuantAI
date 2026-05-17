/**
 * QuantAI Live Commerce Discovery — merchant candidate generation.
 * Builds direct merchant search routes and compact expansion queries for NL/EU first.
 */

import { buildMerchantSearchUrl } from "@/lib/search/directMerchantRouter";
import { buildSearchQueryUnderstanding } from "@/lib/search/queryUnderstanding";

export type ExternalMerchantCandidate = {
  merchantKey: string;
  label: string;
  url: string;
  priority: number;
  region: "nl" | "eu" | "global";
};

const MERCHANTS: { key: string; label: string; region: ExternalMerchantCandidate["region"]; priority: number; cats?: string[] }[] = [
  { key: "bol", label: "bol.com", region: "nl", priority: 96 },
  { key: "coolblue", label: "Coolblue", region: "nl", priority: 94, cats: ["phone", "laptop", "audio", "electronics", "watch"] },
  { key: "mediamarkt", label: "MediaMarkt", region: "nl", priority: 91, cats: ["phone", "laptop", "audio", "electronics", "watch"] },
  { key: "amazon", label: "Amazon.nl", region: "nl", priority: 88 },
  { key: "zalando", label: "Zalando", region: "eu", priority: 86, cats: ["shoes", "fashion", "beauty"] },
  { key: "nike", label: "Nike", region: "eu", priority: 90, cats: ["shoes", "fashion", "sports"] },
  { key: "adidas", label: "Adidas", region: "eu", priority: 88, cats: ["shoes", "fashion", "sports"] },
  { key: "apple", label: "Apple", region: "eu", priority: 90, cats: ["phone", "laptop", "audio", "watch", "electronics"] },
  { key: "samsung", label: "Samsung", region: "eu", priority: 88, cats: ["phone", "audio", "watch", "electronics"] },
  { key: "ikea", label: "IKEA", region: "nl", priority: 88, cats: ["furniture", "home", "desk_setup"] },
  { key: "wehkamp", label: "Wehkamp", region: "nl", priority: 78, cats: ["fashion", "beauty", "home", "furniture"] },
  { key: "decathlon", label: "Decathlon", region: "nl", priority: 80, cats: ["sports", "shoes"] },
  { key: "belsimpel", label: "Belsimpel", region: "nl", priority: 84, cats: ["phone", "audio", "watch"] },
  { key: "backmarket", label: "Back Market", region: "nl", priority: 76, cats: ["phone", "laptop", "audio", "electronics"] },
  { key: "ebay", label: "eBay", region: "global", priority: 66 },
];

export function buildExternalMerchantCandidates(query: string): ExternalMerchantCandidate[] {
  const q = buildSearchQueryUnderstanding(query);
  const terms = q.rewritten || query;
  const cat = q.productCategory;
  return MERCHANTS.flatMap((m) => {
    const catFit = !m.cats || m.cats.includes(cat);
    const priority = m.priority + (catFit ? 12 : -18);
    if (priority < 60) return [];
    const url = buildMerchantSearchUrl(m.key, terms, "nl");
    if (!url) return [];
    return [{ merchantKey: m.key, label: m.label, url, priority, region: m.region }];
  })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);
}

export function buildExternalExpansionQueries(query: string, candidates: ExternalMerchantCandidate[]): string[] {
  const q = buildSearchQueryUnderstanding(query);
  const base = q.rewritten || query.trim();
  const top = candidates.slice(0, 4).map((c) => c.label.replace(/\.com$/i, ""));
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
  return [`${base} ${top.join(" ")} ${vertical}`.replace(/\s+/g, " ").trim()].filter(Boolean);
}
