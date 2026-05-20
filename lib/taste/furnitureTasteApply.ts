/**
 * Phase 2.6 — Furniture / minimal workspace controlled taste apply (canary).
 * Watches: TASTE_GRAMMAR_ENABLED. Fragrance: TASTE_FRAGRANCE_GRAMMAR_ENABLED.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { calibrateDecisionConfidence } from "@/lib/intelligence/decisionCalibration";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import {
  deskSetupTasteGrammar,
  furnitureGrammarForCategory,
  furnitureIntent01,
  furnitureTasteGrammar,
} from "@/lib/taste/grammars/furnitureTasteGrammar";
import { TASTE_VIOLATION_CODES } from "@/lib/taste/tasteGrammarEvidence";
import type { TasteEvidenceTier } from "@/lib/taste/verticalTasteContracts";
import {
  isFurnitureTasteApplyEnabled as furnitureApplyFlag,
  TASTE_FURNITURE_APPLY_INTENT_THRESHOLD,
  TASTE_FURNITURE_APPLY_MAX_DELTA,
} from "@/lib/taste/verticalTasteFlags";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export function isFurnitureTasteApplyEnabled(): boolean {
  return furnitureApplyFlag();
}

export type FurnitureTasteCanaryMeta = {
  version: "furniture-taste-apply-canary-v1";
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
  gamingPollutionTop5: number;
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
  TASTE_VIOLATION_CODES.gaming_pollution,
  TASTE_VIOLATION_CODES.rgb_overload,
  TASTE_VIOLATION_CODES.fake_ergonomic,
  TASTE_VIOLATION_CODES.low_material_integrity,
  TASTE_VIOLATION_CODES.false_minimal_posture,
  TASTE_VIOLATION_CODES.gaming_rgb_pollution,
]);

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(hi, Math.max(lo, n));
}

export function isFurnitureCanaryQuery(canonicalQuery?: CanonicalQueryContract, query?: string): boolean {
  if (!canonicalQuery) return false;
  const envelope = canonicalQuery.semantic.envelope ?? query ?? "";
  const intent = furnitureIntent01(envelope, canonicalQuery);
  if (intent < TASTE_FURNITURE_APPLY_INTENT_THRESHOLD) return false;

  const cat = canonicalQuery.category;
  if (cat === "furniture" || cat === "desk_setup") return true;

  return /\b(desk|workspace|office chair|ergonomic|walnut|oak|minimal|studio|architectural|executive|standing desk)\b/i.test(
    envelope
  );
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

function grammarFor(canonicalQuery?: CanonicalQueryContract) {
  return furnitureGrammarForCategory(canonicalQuery?.category);
}

/**
 * Bounded furniture taste delta — gaming/ergonomic/material gated.
 */
export function computeFurnitureTasteApplyDelta(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): number {
  if (!furnitureApplyFlag() || !isFurnitureCanaryQuery(canonicalQuery, query)) return 0;

  const grammar = grammarFor(canonicalQuery);
  const modifiers = grammar.computeTasteModifiers(query, product, canonicalQuery);
  const listing = grammar.detectListingEvidence(product, canonicalQuery);
  const intent = grammar.detectIntent(query, canonicalQuery);

  if (intent.intent01 < TASTE_FURNITURE_APPLY_INTENT_THRESHOLD) return 0;

  const violations = [...new Set([...modifiers.violations, ...listing.violations])];

  if (hasHardViolation(violations)) {
    return -TASTE_FURNITURE_APPLY_MAX_DELTA;
  }

  const evidenceTier = listing.evidenceTier === "none" ? modifiers.evidenceTier : listing.evidenceTier;
  const tierRank = { none: 0, E0: 1, E1: 2, E2: 3, E3: 4 };

  if (modifiers.delta > 0) {
    if (tierRank[evidenceTier] < tierRank.E1) return 0;
    if (trustCapBlocksPositive(product, canonicalQuery)) return 0;
    if (listing.fit01 < 0.72) return 0;
    return clamp(modifiers.delta, 0, TASTE_FURNITURE_APPLY_MAX_DELTA);
  }

  if (violations.length > 0) {
    return clamp(modifiers.delta, -TASTE_FURNITURE_APPLY_MAX_DELTA, 0);
  }

  return clamp(modifiers.delta, -TASTE_FURNITURE_APPLY_MAX_DELTA, TASTE_FURNITURE_APPLY_MAX_DELTA);
}

export function buildFurnitureTasteCanaryMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  preOrderLinks?: string[];
}): FurnitureTasteCanaryMeta {
  const started = Date.now();
  const { query, canonicalQuery, products, preOrderLinks = [] } = args;
  const applyEnabled = furnitureApplyFlag();
  const active = applyEnabled && isFurnitureCanaryQuery(canonicalQuery, query);
  const grammar = grammarFor(canonicalQuery);

  if (!active) {
    return {
      version: "furniture-taste-apply-canary-v1",
      active: false,
      applyEnabled,
      grammarId: grammar.grammarId,
      grammarLane: null,
      intent01: 0,
      productsEvaluated: 0,
      applyDeltaAvg: 0,
      applyDeltaMax: 0,
      trustCapRespectedPct: 100,
      pollutionTop5: 0,
      gamingPollutionTop5: 0,
      storeDiversityTop5: 0,
      rankingDriftCount: 0,
      trayCollapse: false,
      latencyMs: Date.now() - started,
      skippedReason: applyEnabled ? "not_furniture_canary_lane" : "apply_disabled",
      top5ApplyTrace: [],
    };
  }

  const intent = grammar.detectIntent(query, canonicalQuery);
  const top = products.slice(0, 5);
  const top2 = products.slice(0, 2);
  const traces: FurnitureTasteCanaryMeta["top5ApplyTrace"] = [];
  let trustOk = 0;
  let pollution = 0;
  let gamingPollution = 0;
  const stores = new Set<string>();
  let deltaSum = 0;
  let deltaMax = 0;

  for (const p of top) {
    const delta = computeFurnitureTasteApplyDelta(query, p, canonicalQuery);
    const listing = grammar.detectListingEvidence(p, canonicalQuery);
    deltaSum += delta;
    deltaMax = Math.max(deltaMax, Math.abs(delta));
    stores.add(p.store.trim().toLowerCase());
    if (!trustCapBlocksPositive(p, canonicalQuery) || delta <= 0) trustOk += 1;
    traces.push({
      title: p.title.slice(0, 72),
      applyDelta: delta,
      evidenceTier: listing.evidenceTier,
      violations: listing.violations,
    });
  }

  for (const p of top2) {
    const listing = grammar.detectListingEvidence(p, canonicalQuery);
    if (hasHardViolation(listing.violations)) pollution += 1;
    if (
      listing.violations.includes(TASTE_VIOLATION_CODES.gaming_pollution) ||
      listing.violations.includes(TASTE_VIOLATION_CODES.gaming_rgb_pollution)
    ) {
      gamingPollution += 1;
    }
  }

  const postLinks = top.map((p) => p.link || p.title);
  const preLinks = preOrderLinks.slice(0, 5);
  let drift = 0;
  for (let i = 0; i < Math.min(preLinks.length, postLinks.length); i += 1) {
    if (preLinks[i] !== postLinks[i]) drift += 1;
  }

  return {
    version: "furniture-taste-apply-canary-v1",
    active: true,
    applyEnabled: true,
    grammarId: grammar.grammarId,
    grammarLane: intent.lane,
    intent01: intent.intent01,
    productsEvaluated: top.length,
    applyDeltaAvg: top.length ? Math.round((deltaSum / top.length) * 100) / 100 : 0,
    applyDeltaMax: deltaMax,
    trustCapRespectedPct: top.length ? Math.round((trustOk / top.length) * 100) : 100,
    pollutionTop5: pollution,
    gamingPollutionTop5: gamingPollution,
    storeDiversityTop5: stores.size,
    rankingDriftCount: drift,
    trayCollapse: products.length > 0 && products.length < 2,
    latencyMs: Date.now() - started,
    top5ApplyTrace: traces,
  };
}

export function furnitureTasteShadowApplyParity(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): { shadowDelta: number; applyDelta: number; parityOk: boolean; reason?: string } {
  const grammar = grammarFor(canonicalQuery);
  const shadow = grammar.computeTasteModifiers(query, product, canonicalQuery);
  const applyDelta = computeFurnitureTasteApplyDelta(query, product, canonicalQuery);

  if (!isFurnitureCanaryQuery(canonicalQuery, query)) {
    return { shadowDelta: 0, applyDelta: 0, parityOk: true };
  }

  const violations = shadow.violations;
  if (
    (violations.includes(TASTE_VIOLATION_CODES.gaming_pollution) ||
      violations.includes(TASTE_VIOLATION_CODES.fake_ergonomic)) &&
    applyDelta >= 0
  ) {
    return { shadowDelta: shadow.delta, applyDelta, parityOk: false, reason: "pollution_not_penalized" };
  }

  if (applyDelta > TASTE_FURNITURE_APPLY_MAX_DELTA) {
    return { shadowDelta: shadow.delta, applyDelta, parityOk: false, reason: "apply_exceeds_cap" };
  }

  if (shadow.delta > 0 && applyDelta === 0 && !hasHardViolation(violations)) {
    const listing = grammar.detectListingEvidence(product, canonicalQuery);
    if (listing.evidenceTier === "E1" && !trustCapBlocksPositive(product, canonicalQuery)) {
      return { shadowDelta: shadow.delta, applyDelta, parityOk: false, reason: "positive_shadow_not_applied" };
    }
  }

  return { shadowDelta: shadow.delta, applyDelta, parityOk: true };
}

export { furnitureTasteGrammar, deskSetupTasteGrammar };
