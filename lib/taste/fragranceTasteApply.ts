/**
 * Phase 2.5 — Fragrance-only controlled taste apply (canary).
 * Watches use TASTE_GRAMMAR_ENABLED; fragrance uses TASTE_FRAGRANCE_GRAMMAR_ENABLED.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { calibrateDecisionConfidence } from "@/lib/intelligence/decisionCalibration";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import { fragranceTasteGrammar, fragranceIntent01 } from "@/lib/taste/grammars/fragranceTasteGrammar";
import { TASTE_VIOLATION_CODES } from "@/lib/taste/tasteGrammarEvidence";
import type { TasteEvidenceTier } from "@/lib/taste/verticalTasteContracts";
import {
  isFragranceTasteApplyEnabled as fragranceApplyFlag,
  TASTE_FRAGRANCE_APPLY_INTENT_THRESHOLD,
  TASTE_FRAGRANCE_APPLY_MAX_DELTA,
} from "@/lib/taste/verticalTasteFlags";

export function isFragranceTasteApplyEnabled(): boolean {
  return fragranceApplyFlag();
}
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type FragranceTasteCanaryMeta = {
  version: "fragrance-taste-apply-canary-v1";
  active: boolean;
  applyEnabled: boolean;
  grammarId: string;
  grammarLane: string | null;
  intent01: number;
  productsEvaluated: number;
  applyDeltaAvg: number;
  applyDeltaMax: number;
  trustCapRespectedPct: number;
  pollutionTop5: number;
  decantPollutionTop5: number;
  storeDiversityTop5: number;
  rankingDriftCount: number;
  trayCollapse: boolean;
  latencyMs: number;
  skippedReason?: string;
  top5ApplyTrace: {
    title: string;
    applyDelta: number;
    evidenceTier: TasteEvidenceTier;
    violations: string[];
  }[];
};

const HARD_VIOLATION_CODES = new Set<string>([
  TASTE_VIOLATION_CODES.inspired_by_dupe,
  TASTE_VIOLATION_CODES.authenticity_risk,
  TASTE_VIOLATION_CODES.concentration_mismatch,
  TASTE_VIOLATION_CODES.false_luxury_posture,
]);

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(hi, Math.max(lo, n));
}

export function isFragranceCanaryQuery(canonicalQuery?: CanonicalQueryContract, query?: string): boolean {
  if (!canonicalQuery || canonicalQuery.category !== "fragrance") return false;
  const envelope = canonicalQuery.semantic.envelope ?? query ?? "";
  return fragranceIntent01(envelope, canonicalQuery) >= TASTE_FRAGRANCE_APPLY_INTENT_THRESHOLD;
}

function trustCapBlocksPositive(product: QuantProduct, canonicalQuery?: CanonicalQueryContract): boolean {
  const trust = getStoreTrustScore(product.store);
  if (trust < 42) return true;

  const structured = assessStructuredProductIdentity({
    product,
    canonicalQuery,
    listingIdentity: product.qiListingIdentity ?? null,
  });
  if (structured.relation === "wrong_product" || structured.relation === "fake_placeholder") return true;
  if (!structured.isMainProduct) return true;

  const cal = calibrateDecisionConfidence({ product, rawConfidence: 72, canonicalQuery });
  if (cal.honestCapApplied || cal.tier === "low") return true;

  return false;
}

function hasHardViolation(violations: string[]): boolean {
  return violations.some((v) => HARD_VIOLATION_CODES.has(v));
}

/**
 * Bounded fragrance taste delta — concentration + authenticity gated.
 */
export function computeFragranceTasteApplyDelta(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): number {
  if (!fragranceApplyFlag() || !isFragranceCanaryQuery(canonicalQuery, query)) return 0;

  const modifiers = fragranceTasteGrammar.computeTasteModifiers(query, product, canonicalQuery);
  const listing = fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery);
  const intent = fragranceTasteGrammar.detectIntent(query, canonicalQuery);

  if (intent.intent01 < TASTE_FRAGRANCE_APPLY_INTENT_THRESHOLD) return 0;

  const violations = [...new Set([...modifiers.violations, ...listing.violations])];

  if (hasHardViolation(violations)) {
    return -TASTE_FRAGRANCE_APPLY_MAX_DELTA;
  }

  const evidenceTier = listing.evidenceTier === "none" ? modifiers.evidenceTier : listing.evidenceTier;
  const tierRank = { none: 0, E0: 1, E1: 2, E2: 3, E3: 4 };

  if (modifiers.delta > 0) {
    if (tierRank[evidenceTier] < tierRank.E1) return 0;
    if (trustCapBlocksPositive(product, canonicalQuery)) return 0;
    if (listing.fit01 < 0.72) return 0;
    return clamp(modifiers.delta, 0, TASTE_FRAGRANCE_APPLY_MAX_DELTA);
  }

  if (violations.length > 0) {
    return clamp(modifiers.delta, -TASTE_FRAGRANCE_APPLY_MAX_DELTA, 0);
  }

  return clamp(modifiers.delta, -TASTE_FRAGRANCE_APPLY_MAX_DELTA, TASTE_FRAGRANCE_APPLY_MAX_DELTA);
}

export function buildFragranceTasteCanaryMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  preOrderLinks?: string[];
}): FragranceTasteCanaryMeta {
  const started = Date.now();
  const { query, canonicalQuery, products, preOrderLinks = [] } = args;
  const applyEnabled = fragranceApplyFlag();
  const active = applyEnabled && isFragranceCanaryQuery(canonicalQuery, query);

  if (!active) {
    return {
      version: "fragrance-taste-apply-canary-v1",
      active: false,
      applyEnabled,
      grammarId: fragranceTasteGrammar.grammarId,
      grammarLane: null,
      intent01: 0,
      productsEvaluated: 0,
      applyDeltaAvg: 0,
      applyDeltaMax: 0,
      trustCapRespectedPct: 100,
      pollutionTop5: 0,
      decantPollutionTop5: 0,
      storeDiversityTop5: 0,
      rankingDriftCount: 0,
      trayCollapse: false,
      latencyMs: Date.now() - started,
      skippedReason: applyEnabled ? "not_fragrance_canary_lane" : "apply_disabled",
      top5ApplyTrace: [],
    };
  }

  const intent = fragranceTasteGrammar.detectIntent(query, canonicalQuery);
  const top = products.slice(0, 5);
  const traces: FragranceTasteCanaryMeta["top5ApplyTrace"] = [];
  let trustOk = 0;
  let pollution = 0;
  let decantPollution = 0;
  const stores = new Set<string>();
  let deltaSum = 0;
  let deltaMax = 0;

  for (const p of top) {
    const delta = computeFragranceTasteApplyDelta(query, p, canonicalQuery);
    const listing = fragranceTasteGrammar.detectListingEvidence(p, canonicalQuery);
    deltaSum += delta;
    deltaMax = Math.max(deltaMax, Math.abs(delta));
    stores.add(p.store.trim().toLowerCase());
    if (!trustCapBlocksPositive(p, canonicalQuery) || delta <= 0) trustOk += 1;
    if (hasHardViolation(listing.violations)) pollution += 1;
    if (listing.violations.includes(TASTE_VIOLATION_CODES.concentration_mismatch)) decantPollution += 1;
    traces.push({
      title: p.title.slice(0, 72),
      applyDelta: delta,
      evidenceTier: listing.evidenceTier,
      violations: listing.violations,
    });
  }

  const postLinks = top.map((p) => p.link || p.title);
  const preLinks = preOrderLinks.slice(0, 5);
  let drift = 0;
  for (let i = 0; i < Math.min(preLinks.length, postLinks.length); i += 1) {
    if (preLinks[i] !== postLinks[i]) drift += 1;
  }

  return {
    version: "fragrance-taste-apply-canary-v1",
    active: true,
    applyEnabled: true,
    grammarId: fragranceTasteGrammar.grammarId,
    grammarLane: intent.lane,
    intent01: intent.intent01,
    productsEvaluated: top.length,
    applyDeltaAvg: top.length ? Math.round((deltaSum / top.length) * 100) / 100 : 0,
    applyDeltaMax: deltaMax,
    trustCapRespectedPct: top.length ? Math.round((trustOk / top.length) * 100) : 100,
    pollutionTop5: pollution,
    decantPollutionTop5: decantPollution,
    storeDiversityTop5: stores.size,
    rankingDriftCount: drift,
    trayCollapse: products.length > 0 && products.length < 2,
    latencyMs: Date.now() - started,
    top5ApplyTrace: traces,
  };
}

export function fragranceTasteShadowApplyParity(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): { shadowDelta: number; applyDelta: number; parityOk: boolean; reason?: string } {
  const shadow = fragranceTasteGrammar.computeTasteModifiers(query, product, canonicalQuery);
  const applyDelta = computeFragranceTasteApplyDelta(query, product, canonicalQuery);

  if (!isFragranceCanaryQuery(canonicalQuery, query)) {
    return { shadowDelta: 0, applyDelta: 0, parityOk: true };
  }

  const violations = shadow.violations;
  if (
    (violations.includes(TASTE_VIOLATION_CODES.inspired_by_dupe) ||
      violations.includes(TASTE_VIOLATION_CODES.authenticity_risk)) &&
    applyDelta >= 0
  ) {
    return { shadowDelta: shadow.delta, applyDelta, parityOk: false, reason: "dupe_not_penalized" };
  }

  if (applyDelta > TASTE_FRAGRANCE_APPLY_MAX_DELTA) {
    return { shadowDelta: shadow.delta, applyDelta, parityOk: false, reason: "apply_exceeds_cap" };
  }

  if (shadow.delta > 0 && applyDelta === 0 && !hasHardViolation(violations)) {
    const listing = fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery);
    if (listing.evidenceTier === "E1" && !trustCapBlocksPositive(product, canonicalQuery)) {
      return { shadowDelta: shadow.delta, applyDelta, parityOk: false, reason: "positive_shadow_not_applied" };
    }
  }

  return { shadowDelta: shadow.delta, applyDelta, parityOk: true };
}
