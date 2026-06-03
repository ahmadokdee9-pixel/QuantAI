/**
 * Phase 9.2 — Compare intent integrity (A vs B coverage, non-collapse guard).
 * Post-ranking reorder only; does not modify comparison intelligence engines.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { rankScore } from "@/lib/search/merchantDiversityRerank";

export type CompareEntityPair = {
  left: string;
  right: string;
  entities: [string, string];
  pattern: "compare_vs" | "versus" | "difference" | "or_better";
};

export type CompareIntegrityMeta = {
  active: boolean;
  queryMode: "compare" | "normal";
  entities: string[];
  entityCoverage: Record<string, boolean>;
  bothEntitiesRepresented: boolean;
  coverageScore: number;
  promotionsApplied: number;
  collapsedIntoSingleEntity: boolean;
};

const COMPARE_RX =
  /\b(compare|vs\.?|versus|difference|which is better|better than|or\b|مقارنة|فرق\s*بين|أيهما|ايهما)\b/i;

export function parseCompareEntities(query: string): CompareEntityPair | null {
  const q = query.trim();
  if (!COMPARE_RX.test(q)) return null;

  const patterns: { rx: RegExp; pattern: CompareEntityPair["pattern"] }[] = [
    { rx: /\bcompare\s+(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i, pattern: "compare_vs" },
    { rx: /^(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i, pattern: "versus" },
    { rx: /\bdifference\s+between\s+(.+?)\s+and\s+(.+)$/i, pattern: "difference" },
    { rx: /\bwhich\s+is\s+better[,:]?\s+(.+?)\s+or\s+(.+?)(?:\?|$)/i, pattern: "or_better" },
    { rx: /\b(.+?)\s+or\s+(.+?)\s+(?:which|better)/i, pattern: "or_better" },
  ];

  for (const { rx, pattern } of patterns) {
    const m = q.match(rx);
    if (!m?.[1] || !m[2]) continue;
    const left = m[1].replace(/\s+/g, " ").trim();
    const right = m[2].replace(/\s+/g, " ").trim();
    if (left.length < 2 || right.length < 2) continue;
    if (left.toLowerCase() === right.toLowerCase()) continue;
    return { left, right, entities: [left, right], pattern };
  }
  return null;
}

export function isTrueCompareQuery(
  query: string,
  intent: ExtractedSearchIntent,
  canonical?: CanonicalQueryContract
): boolean {
  if (intent.userGoal === "comparison") return true;
  if (canonical?.intent.primary === "market_compare") return true;
  if (canonical?.marketMode === "hybrid_compare") return true;
  return parseCompareEntities(query) != null;
}

function entityTokens(entity: string): string[] {
  return entity
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        (w.length > 1 || /^\d+$/.test(w)) && !/^(the|and|or|vs|pro|max|plus)$/i.test(w)
    );
}

function titleHasToken(title: string, token: string): boolean {
  const t = title.toLowerCase();
  if (/^\d+$/.test(token)) {
    return new RegExp(`(?:^|[\\s\\-])${token}(?:[\\s\\-]|$)`, "i").test(t) || new RegExp(`\\b${token}\\b`).test(t);
  }
  return t.includes(token);
}

export function entityMatchScore(title: string, entity: string): number {
  const tokens = entityTokens(entity);
  if (!tokens.length) return 0;
  const t = title.toLowerCase();
  const phrase = entity.toLowerCase().trim();
  if (phrase.length > 3 && t.includes(phrase)) return 1;

  let hits = 0;
  for (const tok of tokens) {
    if (titleHasToken(title, tok)) hits += 1;
  }
  const numericTokens = tokens.filter((tok) => /\d/.test(tok));
  if (numericTokens.length > 0) {
    for (const n of numericTokens) {
      if (!titleHasToken(title, n)) return Math.min(0.33, hits / tokens.length);
    }
  }
  return hits / tokens.length;
}

export function validateCompareCoverage(
  products: QuantProduct[],
  entities: string[],
  topN = 6
): Pick<
  CompareIntegrityMeta,
  "entityCoverage" | "bothEntitiesRepresented" | "coverageScore" | "collapsedIntoSingleEntity"
> {
  const window = products.slice(0, topN);
  const entityCoverage: Record<string, boolean> = {};
  for (const entity of entities) {
    entityCoverage[entity] = window.some((p) => entityMatchScore(p.title, entity) >= 0.5);
  }
  const coveredCount = Object.values(entityCoverage).filter(Boolean).length;
  const bothEntitiesRepresented = entities.length >= 2 && coveredCount >= 2;
  const coverageScore =
    entities.length > 0 ? Math.round((coveredCount / entities.length) * 100) : 0;
  const collapsedIntoSingleEntity =
    entities.length >= 2 && coveredCount <= 1 && window.length >= 2;

  return { entityCoverage, bothEntitiesRepresented, coverageScore, collapsedIntoSingleEntity };
}

function bestMatchForEntity(products: QuantProduct[], entity: string, excludeLinks: Set<string>) {
  let best: { product: QuantProduct; score: number; index: number } | null = null;
  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    if (excludeLinks.has(p.link)) continue;
    const match = entityMatchScore(p.title, entity);
    if (match < 0.34) continue;
    const score = match * 100 + rankScore(p) * 0.15 - i * 0.02;
    if (!best || score > best.score) best = { product: p, score, index: i };
  }
  return best;
}

/**
 * Ensure compare queries surface both entities in the top window
 * without collapsing into a single-product recommendation lane.
 */
export function applyCompareIntentIntegrity(
  products: QuantProduct[],
  query: string,
  intent: ExtractedSearchIntent,
  canonical?: CanonicalQueryContract
): { products: QuantProduct[]; meta: CompareIntegrityMeta } {
  const compareActive = isTrueCompareQuery(query, intent, canonical);
  const parsed = parseCompareEntities(query);
  const entities = parsed?.entities ?? [];

  if (!compareActive || entities.length < 2 || products.length < 2) {
    return {
      products,
      meta: {
        active: false,
        queryMode: "normal",
        entities,
        entityCoverage: {},
        bothEntitiesRepresented: false,
        coverageScore: 0,
        promotionsApplied: 0,
        collapsedIntoSingleEntity: false,
      },
    };
  }

  let ordered = [...products];
  let promotionsApplied = 0;
  const used = new Set<string>();
  const picks: QuantProduct[] = [];

  for (const entity of entities) {
    const match = bestMatchForEntity(ordered, entity, used);
    if (!match) continue;
    picks.push(match.product);
    used.add(match.product.link);
  }

  if (picks.length >= 2) {
    const head: QuantProduct[] = [];
    const tail: QuantProduct[] = [];
    const pickLinks = new Set(picks.map((p) => p.link));

    for (const p of ordered) {
      if (pickLinks.has(p.link) && head.length < picks.length) head.push(p);
      else tail.push(p);
    }

    for (const pick of picks) {
      if (!head.some((p) => p.link === pick.link)) head.unshift(pick);
    }

    const before = validateCompareCoverage(ordered, entities, 6);
    ordered = [...head, ...tail.filter((p) => !pickLinks.has(p.link))];
    const after = validateCompareCoverage(ordered, entities, 6);
    if (!before.bothEntitiesRepresented && after.bothEntitiesRepresented) {
      promotionsApplied = picks.length;
    } else if (after.coverageScore > before.coverageScore) {
      promotionsApplied = 1;
    }
  }

  ordered = ordered.map((p, i) => ({ ...p, qiRank: i }));
  const validation = validateCompareCoverage(ordered, entities, 6);

  return {
    products: ordered,
    meta: {
      active: true,
      queryMode: "compare",
      entities,
      ...validation,
      promotionsApplied,
    },
  };
}
