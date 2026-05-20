/**
 * Phase 2.4 — Watches-only controlled taste apply (canary).
 * Other verticals never apply even when TASTE_GRAMMAR_ENABLED=true.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { calibrateDecisionConfidence } from "@/lib/intelligence/decisionCalibration";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import { luxuryWatchGrammar } from "@/lib/taste/grammars/luxuryWatchGrammar";
import { luxuryWatchIntent01 } from "@/lib/search/luxuryWatchIntent";
import type { TasteEvidenceTier } from "@/lib/taste/verticalTasteContracts";
import {
  isTasteGrammarApplyEnabled,
  TASTE_GRAMMAR_INTENT_THRESHOLD,
  TASTE_WATCH_APPLY_MAX_DELTA,
} from "@/lib/taste/verticalTasteFlags";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type WatchTasteCanaryMeta = {
  version: "watch-taste-apply-canary-v1";
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

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Rollback: TASTE_GRAMMAR_ENABLED=false — watches-only apply gate. */
export function isWatchTasteApplyEnabled(): boolean {
  return isTasteGrammarApplyEnabled();
}

export function isWatchCanaryQuery(canonicalQuery?: CanonicalQueryContract, query?: string): boolean {
  if (!canonicalQuery || canonicalQuery.category !== "watch") return false;
  const envelope = canonicalQuery.semantic.envelope ?? query ?? "";
  return (
    luxuryWatchIntent01(envelope) >= TASTE_GRAMMAR_INTENT_THRESHOLD ||
    canonicalQuery.semantic.styleIntent.includes("luxury_watch_collector")
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

/**
 * Bounded taste delta for semantic rerank — evidence + trust gated.
 */
export function computeWatchTasteApplyDelta(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): number {
  if (!isWatchTasteApplyEnabled() || !isWatchCanaryQuery(canonicalQuery, query)) return 0;

  const modifiers = luxuryWatchGrammar.computeTasteModifiers(query, product, canonicalQuery);
  const listing = luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery);
  const intent = luxuryWatchGrammar.detectIntent(query, canonicalQuery);

  if (intent.intent01 < TASTE_GRAMMAR_INTENT_THRESHOLD) return 0;

  let delta = 0;

  if (modifiers.violations.includes("fitness_pollution") || listing.violations.includes("fitness_pollution")) {
    return -TASTE_WATCH_APPLY_MAX_DELTA;
  }

  if (listing.violations.length > 0) {
    delta = Math.min(0, modifiers.delta * 0.5);
  }

  const evidenceTier = listing.evidenceTier === "none" ? modifiers.evidenceTier : listing.evidenceTier;
  const tierRank = { none: 0, E0: 1, E1: 2, E2: 3, E3: 4 };
  if (modifiers.delta > 0) {
    if (tierRank[evidenceTier] < tierRank.E1) return 0;
    if (trustCapBlocksPositive(product, canonicalQuery)) return 0;
    if (listing.fit01 < 0.72) return 0;
    delta = modifiers.delta;
  } else {
    delta = modifiers.delta;
  }

  return clamp(delta, -TASTE_WATCH_APPLY_MAX_DELTA, TASTE_WATCH_APPLY_MAX_DELTA);
}

export function buildWatchTasteCanaryMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  preOrderLinks?: string[];
}): WatchTasteCanaryMeta {
  const started = Date.now();
  const { query, canonicalQuery, products, preOrderLinks = [] } = args;
  const applyEnabled = isWatchTasteApplyEnabled();
  const active = applyEnabled && isWatchCanaryQuery(canonicalQuery, query);

  if (!active) {
    return {
      version: "watch-taste-apply-canary-v1",
      active: false,
      applyEnabled,
      grammarId: luxuryWatchGrammar.grammarId,
      grammarLane: null,
      intent01: 0,
      productsEvaluated: 0,
      applyDeltaAvg: 0,
      applyDeltaMax: 0,
      trustCapRespectedPct: 100,
      pollutionTop5: 0,
      storeDiversityTop5: 0,
      rankingDriftCount: 0,
      trayCollapse: false,
      latencyMs: Date.now() - started,
      skippedReason: applyEnabled ? "not_watch_canary_lane" : "apply_disabled",
      top5ApplyTrace: [],
    };
  }

  const intent = luxuryWatchGrammar.detectIntent(query, canonicalQuery);
  const top = products.slice(0, 5);
  const traces: WatchTasteCanaryMeta["top5ApplyTrace"] = [];
  let trustOk = 0;
  let pollution = 0;
  const stores = new Set<string>();
  let deltaSum = 0;
  let deltaMax = 0;

  for (const p of top) {
    const delta = computeWatchTasteApplyDelta(query, p, canonicalQuery);
    const listing = luxuryWatchGrammar.detectListingEvidence(p, canonicalQuery);
    deltaSum += delta;
    deltaMax = Math.max(deltaMax, Math.abs(delta));
    stores.add(p.store.trim().toLowerCase());
    if (!trustCapBlocksPositive(p, canonicalQuery) || delta <= 0) trustOk += 1;
    if (listing.violations.includes("fitness_pollution")) pollution += 1;
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
    version: "watch-taste-apply-canary-v1",
    active: true,
    applyEnabled: true,
    grammarId: luxuryWatchGrammar.grammarId,
    grammarLane: intent.lane,
    intent01: intent.intent01,
    productsEvaluated: top.length,
    applyDeltaAvg: top.length ? Math.round((deltaSum / top.length) * 100) / 100 : 0,
    applyDeltaMax: deltaMax,
    trustCapRespectedPct: top.length ? Math.round((trustOk / top.length) * 100) : 100,
    pollutionTop5: pollution,
    storeDiversityTop5: stores.size,
    rankingDriftCount: drift,
    trayCollapse: products.length > 0 && products.length < 3,
    latencyMs: Date.now() - started,
    top5ApplyTrace: traces,
  };
}

/** Shadow vs apply parity — returns mismatches for eval. */
export function watchTasteShadowApplyParity(
  query: string,
  product: QuantProduct,
  canonicalQuery?: CanonicalQueryContract
): { shadowDelta: number; applyDelta: number; parityOk: boolean; reason?: string } {
  const shadow = luxuryWatchGrammar.computeTasteModifiers(query, product, canonicalQuery);
  const applyDelta = computeWatchTasteApplyDelta(query, product, canonicalQuery);
  const shadowDelta = shadow.delta;

  if (!isWatchCanaryQuery(canonicalQuery, query)) {
    return { shadowDelta: 0, applyDelta: 0, parityOk: true };
  }

  if (shadow.violations.includes("fitness_pollution") && applyDelta >= 0) {
    return { shadowDelta, applyDelta, parityOk: false, reason: "pollution_not_penalized" };
  }

  if (shadow.delta > 0 && applyDelta > 0 && applyDelta > TASTE_WATCH_APPLY_MAX_DELTA) {
    return { shadowDelta, applyDelta, parityOk: false, reason: "apply_exceeds_cap" };
  }

  if (shadow.delta > 0 && applyDelta === 0 && !shadow.violations.length) {
    const listing = luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery);
    if (listing.evidenceTier === "E1" && !trustCapBlocksPositive(product, canonicalQuery)) {
      return { shadowDelta, applyDelta, parityOk: false, reason: "positive_shadow_not_applied" };
    }
  }

  return { shadowDelta, applyDelta, parityOk: true };
}
