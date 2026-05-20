/**
 * Phase 3.1 — Unified Taste Intelligence layer (meta-first; bounded apply off by default).
 * Connects watches, fragrance, and furniture via shared institutional taste graph.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fragranceTasteGrammar } from "@/lib/taste/grammars/fragranceTasteGrammar";
import { furnitureGrammarForCategory } from "@/lib/taste/grammars/furnitureTasteGrammar";
import { luxuryWatchGrammar } from "@/lib/taste/grammars/luxuryWatchGrammar";
import type { TasteGraphVertical } from "@/lib/taste/tasteGraph";
import {
  computeCrossVerticalAlignment,
  identityForLane,
  laneIdentityAffinity,
  restraintCoherence01,
  type UnifiedTasteIdentityId,
} from "@/lib/taste/tasteGraph";
import type { VerticalTasteGrammarLaneId, VerticalTasteShadowMeta } from "@/lib/taste/verticalTasteContracts";
import {
  isUnifiedTasteApplyEnabled,
  TASTE_UNIFIED_APPLY_MAX_DELTA,
  TASTE_UNIFIED_CONFIDENCE_THRESHOLD,
  TASTE_UNIFIED_META_VERSION,
  TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN,
} from "@/lib/taste/unifiedTasteFlags";

export type { UnifiedTasteIdentityId } from "@/lib/taste/tasteGraph";

export type UnifiedTasteMeta = {
  version: typeof TASTE_UNIFIED_META_VERSION;
  active: boolean;
  applyEnabled: boolean;
  identity: UnifiedTasteIdentityId | null;
  confidence: number;
  coherenceScore: number;
  crossVerticalAlignment: number;
  prestigeIntegrity: number;
  boundedInfluenceMax: number;
  verticalLane: VerticalTasteGrammarLaneId | null;
  verticalLanes: Partial<Record<TasteGraphVertical, VerticalTasteGrammarLaneId | null>>;
  latencyMs: number;
  skippedReason?: string;
};

export type UnifiedTasteProductSignal = {
  title: string;
  unifiedDelta: number;
  listingAlignment: number;
  violations: string[];
};

export type UnifiedTasteSignals = {
  meta: UnifiedTasteMeta;
  productSignals: UnifiedTasteProductSignal[];
};

const ALL_IDENTITIES: UnifiedTasteIdentityId[] = [
  "quiet_luxury",
  "institutional_minimal",
  "executive_premium",
  "architectural_modern",
  "haute_collector",
  "creative_studio",
  "performance_technical",
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function envelopeOf(query: string, canonicalQuery?: CanonicalQueryContract): string {
  return canonicalQuery?.semantic.envelope ?? query;
}

/** Query-level identity scoring from shared prestige / aesthetic / restraint semantics. */
function scoreIdentityFromQuery(text: string, identity: UnifiedTasteIdentityId): number {
  const s = text.toLowerCase();
  let score = 0.08;

  switch (identity) {
    case "quiet_luxury":
      if (/\b(quiet luxury|understated|dress watch|designer|libre|ysl|elegant|refined)\b/i.test(s)) score += 0.38;
      if (/\b(minimal|restraint|timeless|parfum|edp)\b/i.test(s)) score += 0.22;
      break;
    case "institutional_minimal":
      if (/\b(minimal|clean|scandi|monochrome|restraint|office minimal|desk setup)\b/i.test(s)) score += 0.42;
      if (/\b(oak|walnut|matte|cable management)\b/i.test(s)) score += 0.2;
      break;
    case "executive_premium":
      if (/\b(executive|office|professional|swiss|gesture|steelcase|herman)\b/i.test(s)) score += 0.4;
      if (/\b(premium|workspace|lumbar|dress)\b/i.test(s)) score += 0.18;
      break;
    case "architectural_modern":
      if (/\b(architectural|bespoke|designer desk|modern|steel frame)\b/i.test(s)) score += 0.44;
      break;
    case "haute_collector":
      if (/\b(haute|extrait|collector|mechanical|niche|artisan|complication|parfum)\b/i.test(s)) score += 0.42;
      if (/\b(luxury|limited|prestige|automatic)\b/i.test(s)) score += 0.2;
      break;
    case "creative_studio":
      if (/\b(studio|creator|white desk|clean desk|monochrome)\b/i.test(s)) score += 0.42;
      break;
    case "performance_technical":
      if (/\b(mechanical|tool watch|chronograph|sport|technical|ergonomic|adjustable)\b/i.test(s)) score += 0.36;
      break;
    default:
      break;
  }

  return clamp01(score);
}

function detectVerticalHints(text: string): Partial<Record<TasteGraphVertical, number>> {
  const hints: Partial<Record<TasteGraphVertical, number>> = {};
  if (/\b(watch|horloge|timepiece|automatic|swiss|chronograph|ساعة)\b/i.test(text)) hints.watch = 0.85;
  if (/\b(perfume|fragrance|parfum|edp|edt|libre|ysl|عطر)\b/i.test(text)) hints.fragrance = 0.85;
  if (/\b(desk|chair|office|workspace|sofa|furniture|minimal desk|كرسي|مكتب)\b/i.test(text)) hints.furniture = 0.85;
  return hints;
}

function resolveVerticalLane(
  query: string,
  canonicalQuery: CanonicalQueryContract
): { lane: VerticalTasteGrammarLaneId | null; lanes: UnifiedTasteMeta["verticalLanes"] } {
  const cat = canonicalQuery.category;
  const lanes: UnifiedTasteMeta["verticalLanes"] = {};

  if (cat === "watch" || /\b(watch|timepiece|horloge|ساعة)\b/i.test(envelopeOf(query, canonicalQuery))) {
    const lane = luxuryWatchGrammar.resolveGrammarLane(query, canonicalQuery);
    lanes.watch = lane;
    return { lane, lanes };
  }
  if (cat === "fragrance" || /\b(perfume|fragrance|parfum|edp|عطر)\b/i.test(envelopeOf(query, canonicalQuery))) {
    const lane = fragranceTasteGrammar.resolveGrammarLane(query, canonicalQuery);
    lanes.fragrance = lane;
    return { lane, lanes };
  }
  if (cat === "furniture" || cat === "desk_setup" || /\b(desk|chair|office|workspace|كرسي)\b/i.test(envelopeOf(query, canonicalQuery))) {
    const grammar = furnitureGrammarForCategory(cat);
    const lane = grammar.resolveGrammarLane(query, canonicalQuery);
    lanes.furniture = lane;
    return { lane, lanes };
  }

  return { lane: null, lanes };
}

function pickIdentity(args: {
  text: string;
  verticalLane: VerticalTasteGrammarLaneId | null;
}): { identity: UnifiedTasteIdentityId | null; confidence: number } {
  const { text, verticalLane } = args;

  if (/\bquiet luxury\b/i.test(text)) {
    const score = clamp01(scoreIdentityFromQuery(text, "quiet_luxury") + 0.25);
    return { identity: "quiet_luxury", confidence: score };
  }

  let best: UnifiedTasteIdentityId | null = null;
  let bestScore = 0;

  for (const id of ALL_IDENTITIES) {
    let score = scoreIdentityFromQuery(text, id);
    if (verticalLane) score = Math.max(score, laneIdentityAffinity(verticalLane, id) * 0.92);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }

  if (!best || bestScore < 0.28) return { identity: null, confidence: 0 };
  const laneBoost = verticalLane && identityForLane(verticalLane) === best ? 0.12 : 0;
  return { identity: best, confidence: clamp01(bestScore + laneBoost) };
}

function listingUnifiedDelta(
  identity: UnifiedTasteIdentityId,
  product: QuantProduct,
  canonicalQuery: CanonicalQueryContract,
  violations: string[]
): number {
  if (!isUnifiedTasteApplyEnabled()) return 0;
  if (violations.some((v) => /gaming|rgb|fitness|dupe|inspired|false_luxury|false_minimal|fake_ergonomic/i.test(v))) {
    return -TASTE_UNIFIED_APPLY_MAX_DELTA;
  }

  const cat = canonicalQuery.category;
  let fit = 0.5;
  if (cat === "watch") fit = luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery).fit01;
  else if (cat === "fragrance") fit = fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery).fit01;
  else if (cat === "furniture" || cat === "desk_setup") {
    fit = furnitureGrammarForCategory(cat).detectListingEvidence(product, canonicalQuery).fit01;
  }

  const alignment = laneIdentityAffinity(
    resolveVerticalLane(canonicalQuery.originalQuery, canonicalQuery).lane,
    identity
  );
  if (fit >= 0.72 && alignment >= 0.7) {
    return clamp(TASTE_UNIFIED_APPLY_MAX_DELTA * 0.5, 0, TASTE_UNIFIED_APPLY_MAX_DELTA);
  }
  return 0;
}

/**
 * Primary P3.1 API — unified taste signals for telemetry (+ optional bounded apply).
 */
export function computeUnifiedTasteSignals(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  tasteGrammarShadow?: VerticalTasteShadowMeta;
}): UnifiedTasteSignals {
  const started = Date.now();
  const { query, canonicalQuery, products, tasteGrammarShadow } = args;
  const text = envelopeOf(query, canonicalQuery);
  const applyEnabled = isUnifiedTasteApplyEnabled();

  const supported =
    canonicalQuery.category === "watch" ||
    canonicalQuery.category === "fragrance" ||
    canonicalQuery.category === "furniture" ||
    canonicalQuery.category === "desk_setup" ||
    detectVerticalHints(text).watch ||
    detectVerticalHints(text).fragrance ||
    detectVerticalHints(text).furniture;

  if (!supported) {
    return {
      meta: {
        version: TASTE_UNIFIED_META_VERSION,
        active: false,
        applyEnabled,
        identity: null,
        confidence: 0,
        coherenceScore: 0,
        crossVerticalAlignment: 0,
        prestigeIntegrity: 1,
        boundedInfluenceMax: TASTE_UNIFIED_APPLY_MAX_DELTA,
        verticalLane: null,
        verticalLanes: {},
        latencyMs: Date.now() - started,
        skippedReason: "unsupported_category",
      },
      productSignals: [],
    };
  }

  const { lane: verticalLane, lanes: verticalLanes } = resolveVerticalLane(query, canonicalQuery);
  const { identity, confidence } = pickIdentity({ text, verticalLane });

  if (!identity || confidence < 0.28) {
    return {
      meta: {
        version: TASTE_UNIFIED_META_VERSION,
        active: false,
        applyEnabled,
        identity: null,
        confidence,
        coherenceScore: 0,
        crossVerticalAlignment: 0,
        prestigeIntegrity: 1,
        boundedInfluenceMax: TASTE_UNIFIED_APPLY_MAX_DELTA,
        verticalLane,
        verticalLanes,
        latencyMs: Date.now() - started,
        skippedReason: "identity_below_threshold",
      },
      productSignals: [],
    };
  }

  const verticalHints = detectVerticalHints(text);
  const crossVerticalAlignment = computeCrossVerticalAlignment({ identity, verticalHints });
  const violations = tasteGrammarShadow?.violations ?? tasteGrammarShadow?.tasteViolations ?? [];
  const explicitIdentity = /\bquiet luxury\b/i.test(text);
  const laneCoherence = verticalLane
    ? Math.max(
        laneIdentityAffinity(verticalLane, identity),
        explicitIdentity && identity === "quiet_luxury" ? 0.78 : 0
      )
    : 0.55;
  const restraint = restraintCoherence01(identity, violations);
  const coherenceScore = clamp01(laneCoherence * 0.55 + crossVerticalAlignment * 0.45);
  const prestigeIntegrity = clamp01(laneCoherence * 0.4 + crossVerticalAlignment * 0.35 + restraint * 0.25);

  const productSignals: UnifiedTasteProductSignal[] = [];
  for (const p of products.slice(0, 5)) {
    let listingViolations: string[] = [];
    if (canonicalQuery.category === "watch") {
      listingViolations = luxuryWatchGrammar.detectListingEvidence(p, canonicalQuery).violations;
    } else if (canonicalQuery.category === "fragrance") {
      listingViolations = fragranceTasteGrammar.detectListingEvidence(p, canonicalQuery).violations;
    } else if (canonicalQuery.category === "furniture" || canonicalQuery.category === "desk_setup") {
      listingViolations = furnitureGrammarForCategory(canonicalQuery.category).detectListingEvidence(p, canonicalQuery)
        .violations;
    }

    const allViolations = [...new Set([...violations, ...listingViolations])];
    let unifiedDelta = 0;
    if (
      applyEnabled &&
      confidence >= TASTE_UNIFIED_CONFIDENCE_THRESHOLD &&
      prestigeIntegrity >= TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN
    ) {
      unifiedDelta = listingUnifiedDelta(identity, p, canonicalQuery, allViolations);
    }

    productSignals.push({
      title: p.title.slice(0, 72),
      unifiedDelta,
      listingAlignment: laneIdentityAffinity(verticalLane, identity),
      violations: allViolations,
    });
  }

  return {
    meta: {
      version: TASTE_UNIFIED_META_VERSION,
      active: true,
      applyEnabled,
      identity,
      confidence: Math.round(confidence * 1000) / 1000,
      coherenceScore: Math.round(coherenceScore * 1000) / 1000,
      crossVerticalAlignment: Math.round(crossVerticalAlignment * 1000) / 1000,
      prestigeIntegrity: Math.round(prestigeIntegrity * 1000) / 1000,
      boundedInfluenceMax: TASTE_UNIFIED_APPLY_MAX_DELTA,
      verticalLane,
      verticalLanes,
      latencyMs: Date.now() - started,
    },
    productSignals,
  };
}

/** Bounded per-listing unified delta when apply flag is on. */
export function computeUnifiedListingApplyDelta(
  query: string,
  product: QuantProduct,
  canonicalQuery: CanonicalQueryContract,
  meta: UnifiedTasteMeta
): number {
  if (!isUnifiedTasteApplyEnabled() || !meta.active || !meta.identity) return 0;
  if (meta.confidence < TASTE_UNIFIED_CONFIDENCE_THRESHOLD) return 0;
  if (meta.prestigeIntegrity < TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN) return 0;

  let listingViolations: string[] = [];
  if (canonicalQuery.category === "watch") {
    listingViolations = luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery).violations;
  } else if (canonicalQuery.category === "fragrance") {
    listingViolations = fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery).violations;
  } else if (canonicalQuery.category === "furniture" || canonicalQuery.category === "desk_setup") {
    listingViolations = furnitureGrammarForCategory(canonicalQuery.category).detectListingEvidence(product, canonicalQuery)
      .violations;
  }

  return listingUnifiedDelta(meta.identity, product, canonicalQuery, listingViolations);
}

/** Bounded per-product unified delta — only when unified apply flag is on. */
export function computeUnifiedTasteApplyDelta(
  query: string,
  product: QuantProduct,
  canonicalQuery: CanonicalQueryContract,
  signals: UnifiedTasteSignals
): number {
  if (!isUnifiedTasteApplyEnabled() || !signals.meta.active || !signals.meta.identity) return 0;
  if (signals.meta.confidence < TASTE_UNIFIED_CONFIDENCE_THRESHOLD) return 0;
  if (signals.meta.prestigeIntegrity < TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN) return 0;

  const row = signals.productSignals.find((r) => r.title === product.title.slice(0, 72));
  return clamp(row?.unifiedDelta ?? 0, -TASTE_UNIFIED_APPLY_MAX_DELTA, TASTE_UNIFIED_APPLY_MAX_DELTA);
}

export function buildUnifiedTasteMeta(
  args: Parameters<typeof computeUnifiedTasteSignals>[0]
): UnifiedTasteMeta {
  return computeUnifiedTasteSignals(args).meta;
}
