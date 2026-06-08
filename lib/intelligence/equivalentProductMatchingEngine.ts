/**
 * Phase 36 — Same Product / Equivalent Product Matching.
 * Tray-local matching for exact, variant, and intent-equivalent alternatives.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { resolveCategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";

export type ProductMatchKind = "exact" | "same_model" | "same_variant" | "equivalent" | "intent_equivalent";

export type ProductMatchRow = {
  link: string;
  title: string;
  store: string;
  price: number;
  kind: ProductMatchKind;
  similarity: number;
};

export type EquivalentMatchResult = {
  exactMatches: ProductMatchRow[];
  sameProductMatches: ProductMatchRow[];
  equivalentMatches: ProductMatchRow[];
  bestCheaperAlternative: ProductMatchRow | null;
  bestSameProductCheaper: ProductMatchRow | null;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/^(the|and|with|for|new|sale)$/.test(t));
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((t) => sb.has(t)).length;
  const union = new Set([...sa, ...sb]).size || 1;
  return inter / union;
}

function extractModelKey(title: string, searchQuery: string): string {
  const blob = `${title} ${searchQuery}`.toLowerCase();
  const iphone = blob.match(/iphone\s*(\d+\s*(?:pro\s*max|pro|plus|max)?)/i);
  if (iphone) return `iphone:${iphone[1]!.replace(/\s+/g, "")}`;
  const mac = blob.match(/macbook\s*(air|pro)?\s*(m\d(?:\s*pro)?)?/i);
  if (mac) return `macbook:${(mac[1] ?? "")}${(mac[2] ?? "")}`.replace(/\s+/g, "");
  const galaxy = blob.match(/galaxy\s*(s\d+\s*(?:ultra|plus|fe)?)/i);
  if (galaxy) return `galaxy:${galaxy[1]!.replace(/\s+/g, "")}`;
  const sofa = blob.match(/(sectional|corner|sofa|couch|modular)/i);
  if (sofa) return `sofa:${sofa[1]!.toLowerCase()}`;
  return tokenize(title).slice(0, 6).join("-");
}

function matchKind(
  product: QuantProduct,
  peer: QuantProduct,
  searchQuery: string,
  similarity: number
): ProductMatchKind {
  const pk = extractModelKey(product.title, searchQuery);
  const peerKey = extractModelKey(peer.title, searchQuery);
  if (product.title.trim().toLowerCase() === peer.title.trim().toLowerCase()) return "exact";
  if (pk === peerKey && pk.length > 4) return "same_model";
  if (similarity >= 0.72) return "same_variant";
  if (similarity >= 0.48) return "equivalent";
  return "intent_equivalent";
}

/** Find same/equivalent matches for a product within the tray. */
export function findEquivalentMatches(
  product: QuantProduct,
  tray: QuantProduct[],
  searchQuery: string
): EquivalentMatchResult {
  const category = resolveCategoryProfileKey(null, product.title, searchQuery);
  const productTokens = tokenize(`${searchQuery} ${product.title}`);
  const exactMatches: ProductMatchRow[] = [];
  const sameProductMatches: ProductMatchRow[] = [];
  const equivalentMatches: ProductMatchRow[] = [];

  for (const peer of tray) {
    if (peer.link === product.link) continue;
    const similarity = jaccard(productTokens, tokenize(`${searchQuery} ${peer.title}`));
    const kind = matchKind(product, peer, searchQuery, similarity);
    const row: ProductMatchRow = {
      link: peer.link,
      title: peer.title,
      store: peer.store,
      price: peer.price,
      kind,
      similarity: Math.round(similarity * 100),
    };

    if (kind === "exact") exactMatches.push(row);
    if (kind === "exact" || kind === "same_model" || kind === "same_variant") sameProductMatches.push(row);
    if (kind === "equivalent" || kind === "intent_equivalent") equivalentMatches.push(row);

    if (category === "phones" && /iphone|galaxy|pixel/i.test(peer.title) && similarity >= 0.35) {
      equivalentMatches.push(row);
    }
    if (category === "laptops" && /macbook|thinkpad|xps|refurb|renewed/i.test(peer.title) && similarity >= 0.3) {
      equivalentMatches.push(row);
    }
    if (category === "sofas" && /sofa|couch|sectional|corner|modular/i.test(peer.title) && similarity >= 0.28) {
      equivalentMatches.push(row);
    }
  }

  const dedupe = (rows: ProductMatchRow[]) => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });
  };

  const sameDeduped = dedupe(sameProductMatches);
  const equivDeduped = dedupe(equivalentMatches);

  const bestSameProductCheaper =
    sameDeduped.filter((m) => m.price < product.price).sort((a, b) => a.price - b.price)[0] ?? null;
  const bestCheaperAlternative =
    [...sameDeduped, ...equivDeduped]
      .filter((m) => m.price < product.price)
      .sort((a, b) => a.price - b.price)[0] ?? null;

  return {
    exactMatches: dedupe(exactMatches),
    sameProductMatches: sameDeduped,
    equivalentMatches: equivDeduped,
    bestCheaperAlternative,
    bestSameProductCheaper,
  };
}
