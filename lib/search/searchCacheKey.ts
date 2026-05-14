import { fixCommonCommerceTypos } from "@/lib/search/conversationalQueryLayer";

/**
 * Canonical key for cross-request search cache + in-flight dedupe alignment.
 * NFKC + collapsed whitespace + lowercase improves hit rate without changing user-visible query text.
 */
export function normalizeSearchCacheKey(query: string): string {
  return fixCommonCommerceTypos(query)
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .toLowerCase();
}
