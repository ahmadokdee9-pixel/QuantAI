import { combinedTitleSimilarity } from "./normalizeTitle";
import type { ProductIdentity } from "./productIdentity";
import { jaccardSets } from "./productIdentity";

function setFromList(xs: string[]): Set<string> {
  return new Set(xs.map((x) => x.toLowerCase()));
}

function identifierOverlap(a: ProductIdentity, b: ProductIdentity): boolean {
  const sa = new Set(a.identifiers.map((x) => x.toUpperCase()));
  for (const x of b.identifiers) {
    if (sa.has(x.toUpperCase())) return true;
  }
  return false;
}

function brandCompatible(a: ProductIdentity, b: ProductIdentity): "match" | "neutral" | "conflict" {
  if (!a.brands.length || !b.brands.length) return "neutral";
  const sa = setFromList(a.brands);
  const sb = setFromList(b.brands);
  for (const x of sa) {
    if (sb.has(x)) return "match";
  }
  return "conflict";
}

function specConflict(a: ProductIdentity, b: ProductIdentity): boolean {
  const keys = new Set([...Object.keys(a.specHints), ...Object.keys(b.specHints)]);
  for (const k of keys) {
    const va = a.specHints[k];
    const vb = b.specHints[k];
    if (va && vb && va !== vb) return true;
  }
  return false;
}

/**
 * Cross-retailer same-product likelihood (0–1). Feeds clustering with title similarity.
 */
export function identityMatchScore(
  a: ProductIdentity,
  b: ProductIdentity,
  priceA: number,
  priceB: number,
  peerMedianPrice: number
): number {
  if (identifierOverlap(a, b)) {
    const titleSim = combinedTitleSimilarity(
      a.normalizedTitle || a.asciiTitle,
      b.normalizedTitle || b.asciiTitle
    );
    return Math.min(1, 0.88 + titleSim * 0.12);
  }

  const titleSim = Math.max(
    combinedTitleSimilarity(a.normalizedTitle, b.normalizedTitle),
    combinedTitleSimilarity(a.asciiTitle, b.asciiTitle)
  );
  const tokenSim = jaccardSets(a.tokenSet, b.tokenSet);

  const modelJ = jaccardSets(setFromList([...a.models]), setFromList([...b.models]));
  const brand = brandCompatible(a, b);
  let brandFactor = 1;
  if (brand === "match") brandFactor = 1.08;
  if (brand === "conflict" && modelJ < 0.2) brandFactor = 0.42;

  let score =
    titleSim * 0.38 +
    tokenSim * 0.22 +
    modelJ * 0.32 +
    (brand === "match" ? 0.12 : 0);

  if (specConflict(a, b)) score *= 0.55;

  score *= brandFactor;

  if (peerMedianPrice > 0 && priceA > 0 && priceB > 0) {
    const hi = Math.max(priceA, priceB);
    const lo = Math.min(priceA, priceB);
    if (lo > 0 && hi / lo > 4.2) score *= 0.72;
    const devA = Math.abs(priceA - peerMedianPrice) / peerMedianPrice;
    const devB = Math.abs(priceB - peerMedianPrice) / peerMedianPrice;
    if (devA > 0.95 && devB > 0.95 && titleSim < 0.45) score *= 0.8;
  }

  return Math.min(1, Math.max(0, score));
}
