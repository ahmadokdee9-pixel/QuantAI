/**
 * QuantAI Unified Market Matching — same real product across retailers (tray-local).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity, type ProductIdentity } from "@/lib/deals/productIdentity";
import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import {
  buildProductIdentityConfidence,
  createCanonicalProductIdentity,
  detectCrossRetailIdentity,
} from "@/lib/intelligence/productIdentity";
import { buildFamilyPriceMap } from "@/lib/intelligence/marketPriceMap";
import { buildFamilyMarketConsensus } from "@/lib/intelligence/marketConsensus";
import { buildCrossMarketConsensusLine } from "@/lib/intelligence/crossMarketConsensus";
import { computeFamilyEquivalenceHints } from "@/lib/intelligence/equivalentProducts";
import { estimateFairMarketValueRange } from "@/lib/intelligence/marketSpread";
import type { QiListingIdentity } from "@/lib/intelligence/listingIdentityTypes";
import { normalizeCommercialRoles } from "@/lib/intelligence/normalizeIntelligenceSignals";
import { resolveQiListingIdentity } from "@/lib/intelligence/universalListingIdentity";

export type UnifiedMarketGroup = {
  familyId: string;
  memberIndices: number[];
  /** Mean pairwise identity confidence inside cluster */
  groupConfidence: number;
  duplicateSpamPenalty: number;
};

export type UnifiedCardOfferRef = {
  link: string;
  store: string;
  price: number;
};

export type UnifiedCardInsight = {
  familyId: string;
  storeCount: number;
  listingCount: number;
  bestTrustedPrice: number;
  bestTrustedStore: string;
  bestTrustedLink: string;
  marketSpreadPct: number;
  isSameProductFamily: boolean;
  isBestTrustedInFamily: boolean;
  isLowestRiskInFamily: boolean;
  familyConsensusHeadline: string;
  /** v2 — fused analyst read across identity + spread + noise. */
  crossMarketHeadline: string;
  sameItemCheaper: UnifiedCardOfferRef | null;
  betterValueAlternative: UnifiedCardOfferRef | null;
  premiumUpgrade: UnifiedCardOfferRef | null;
  overpricedVsFair: boolean;
  fairMarketRangeLabel: string;
};

function find(parent: number[], i: number): number {
  let x = i;
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]];
    x = parent[x];
  }
  return x;
}

function union(parent: number[], i: number, j: number): void {
  const ri = find(parent, i);
  const rj = find(parent, j);
  if (ri !== rj) parent[rj] = ri;
}

function simpleFamilyId(members: QuantProduct[]): string {
  const keys = members
    .map((p) => createCanonicalProductIdentity(p).canonicalKey)
    .sort()
    .join("~");
  let h = 0;
  for (let i = 0; i < keys.length; i++) h = (h * 31 + keys.charCodeAt(i)) >>> 0;
  return `fam_${h.toString(16)}`;
}

function duplicateSpamPenalty01(members: QuantProduct[]): number {
  let pen = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i]!;
      const b = members[j]!;
      if (a.store.toLowerCase() !== b.store.toLowerCase()) continue;
      const sim = combinedTitleSimilarity(
        extractProductIdentity(a).normalizedTitle,
        extractProductIdentity(b).normalizedTitle
      );
      if (sim >= 0.94) pen += 0.12;
    }
  }
  return Math.min(0.45, pen);
}

function meanPairConfidence(members: QuantProduct[], identities: ProductIdentity[], median: number): number {
  if (members.length < 2) return 1;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const c = buildProductIdentityConfidence(members[i]!, members[j]!, identities[i]!, identities[j]!, median);
      sum += c;
      n += 1;
    }
  }
  return n > 0 ? sum / n : 1;
}

function subAssemblyCompleteness(c: string): boolean {
  return c === "accessory_only" || c === "parts_or_subassembly";
}

function junkCommercialRole(id: QiListingIdentity): boolean {
  const roles = normalizeCommercialRoles(id.commercialRoles);
  return roles.includes("replica_risk") || roles.includes("packaging_only");
}

export function buildUnifiedMarketGroups(products: QuantProduct[], searchQuery = ""): UnifiedMarketGroup[] {
  const n = products.length;
  if (n === 0) return [];
  const parent = Array.from({ length: n }, (_, i) => i);
  const identities = products.map((p) => extractProductIdentity(p));
  const listingIds = products.map((p) => resolveQiListingIdentity(p, searchQuery));
  const prices = products.map((p) => p.price).filter((x) => x > 0);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const conf = buildProductIdentityConfidence(products[i]!, products[j]!, identities[i]!, identities[j]!, median);
      const cross = detectCrossRetailIdentity(products[i]!, products[j]!, conf);
      const sameStoreDup = products[i]!.store.toLowerCase() === products[j]!.store.toLowerCase() && conf >= 0.9;
      const li = listingIds[i]!;
      const lj = listingIds[j]!;
      if (li.listingRisk01 >= 0.84 || lj.listingRisk01 >= 0.84) continue;

      const accHeavy = li.accessoryLikelihood01 > 0.58 || lj.accessoryLikelihood01 > 0.58;
      const contamHeavy = li.contaminationRisk01 > 0.52 || lj.contaminationRisk01 > 0.52;
      const mismatchHeavy = li.semanticMismatchPenalty01 > 0.48 || lj.semanticMismatchPenalty01 > 0.48;
      const completenessMismatch =
        subAssemblyCompleteness(li.productCompleteness) !== subAssemblyCompleteness(lj.productCompleteness);
      const junkPair = junkCommercialRole(li) || junkCommercialRole(lj);

      let confMin = accHeavy ? 0.9 : 0.74;
      if (contamHeavy) confMin = Math.max(confMin, 0.87);
      if (mismatchHeavy) confMin = Math.max(confMin, 0.9);
      if (completenessMismatch) confMin = Math.max(confMin, 0.93);
      if (junkPair) confMin = Math.max(confMin, 0.96);

      if (conf < confMin || !(cross || sameStoreDup)) continue;
      union(parent, i, j);
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(parent, i);
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r)!.push(i);
  }

  const groups: UnifiedMarketGroup[] = [];
  for (const idxs of buckets.values()) {
    if (idxs.length < 2) continue;
    const members = idxs.map((i) => products[i]!);
    const dupPen = duplicateSpamPenalty01(members);
    const conf = meanPairConfidence(members, idxs.map((i) => identities[i]!), median) * (1 - dupPen);
    groups.push({
      familyId: simpleFamilyId(members),
      memberIndices: idxs,
      groupConfidence: Math.max(0.35, Math.min(1, conf)),
      duplicateSpamPenalty: dupPen,
    });
  }
  return groups;
}

export function buildUnifiedMarketGroup(products: QuantProduct[], searchQuery = ""): {
  byLink: Map<string, UnifiedCardInsight>;
  groups: UnifiedMarketGroup[];
} {
  const byLink = new Map<string, UnifiedCardInsight>();
  if (!products.length) return { byLink, groups: [] };

  const clusters = buildUnifiedMarketGroups(products, searchQuery);
  for (const g of clusters) {
    const members = g.memberIndices.map((i) => products[i]!);
    const stores = new Set(members.map((p) => p.store.toLowerCase().trim()));
    const priceMap = buildFamilyPriceMap(members);
    const consensus = buildFamilyMarketConsensus(members, priceMap);
    const fair = estimateFairMarketValueRange(members);
    const crossMarketHeadline = buildCrossMarketConsensusLine({
      spreadPct: priceMap.spreadPct,
      medianPrice: priceMap.medianPrice,
      groupConfidence01: g.groupConfidence,
      duplicateSpamPenalty: g.duplicateSpamPenalty,
      listingCount: members.length,
      storeCount: stores.size,
    });
    const ct = priceMap.cheapestTrusted;
    const bestPrice = ct?.price ?? priceMap.minPrice;
    const bestStore = ct?.store ?? "";
    const bestLink = ct?.link ?? members[0]!.link;

    for (const p of members) {
      const isBestTrusted = ct ? p.link === ct.link : false;
      const lowestRisk = consensus.lowestRiskLink === p.link;
      const hints = computeFamilyEquivalenceHints(p, members, priceMap, consensus, fair);
      byLink.set(p.link, {
        familyId: g.familyId,
        storeCount: stores.size,
        listingCount: members.length,
        bestTrustedPrice: bestPrice,
        bestTrustedStore: bestStore || ct?.store || "",
        bestTrustedLink: bestLink,
        marketSpreadPct: priceMap.spreadPct,
        isSameProductFamily: true,
        isBestTrustedInFamily: isBestTrusted,
        isLowestRiskInFamily: lowestRisk,
        familyConsensusHeadline: consensus.headline,
        crossMarketHeadline,
        sameItemCheaper: hints.sameItemCheaper,
        betterValueAlternative: hints.betterValueAlternative,
        premiumUpgrade: hints.premiumUpgrade,
        overpricedVsFair: hints.overpricedVsFair,
        fairMarketRangeLabel: hints.fairMarketRangeLabel,
      });
    }
  }

  return { byLink, groups: clusters };
}
