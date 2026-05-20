/**
 * Phase 3.2 — Unified taste apply gates (no circular deps on identity/apply modules).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fragranceTasteGrammar } from "@/lib/taste/grammars/fragranceTasteGrammar";
import { furnitureGrammarForCategory } from "@/lib/taste/grammars/furnitureTasteGrammar";
import { luxuryWatchGrammar } from "@/lib/taste/grammars/luxuryWatchGrammar";
import { laneIdentityAffinity, type UnifiedTasteIdentityId } from "@/lib/taste/tasteGraph";
import type { VerticalTasteShadowMeta } from "@/lib/taste/verticalTasteContracts";
import {
  isUnifiedTasteApplyEnabled,
  TASTE_UNIFIED_APPLY_MAX_DELTA,
  TASTE_UNIFIED_COHERENCE_MIN,
  TASTE_UNIFIED_CROSS_VERTICAL_MIN,
  TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN,
} from "@/lib/taste/unifiedTasteFlags";

export type UnifiedQueryClass =
  | "luxury"
  | "minimal"
  | "institutional"
  | "executive"
  | "architectural"
  | "collector";

export type UnifiedApplyMetaSlice = {
  active: boolean;
  identity: UnifiedTasteIdentityId | null;
  coherenceScore: number;
  prestigeIntegrity: number;
  crossVerticalAlignment: number;
  verticalLane: import("@/lib/taste/verticalTasteContracts").VerticalTasteGrammarLaneId | null;
};

const HARD_SUPPRESSION_RX =
  /\b(gaming|rgb|led trim|gamer|racer|fitness|smart watch|inspired by|dupe|clone|fake luxury|luxury look|premium look|viral|tiktok|must have|hot deal|smell like|type scent)\b/i;

const HARD_VIOLATION_RX =
  /gaming|rgb|fitness|dupe|inspired|false_luxury|false_minimal|fake_ergonomic|authenticity|low_material|aesthetic_mismatch/i;

const IDENTITY_ALLOWED_CLASSES: Record<UnifiedTasteIdentityId, UnifiedQueryClass[]> = {
  quiet_luxury: ["luxury", "minimal"],
  institutional_minimal: ["minimal", "institutional"],
  executive_premium: ["executive", "luxury"],
  architectural_modern: ["architectural", "minimal"],
  haute_collector: ["collector", "luxury"],
  creative_studio: ["minimal", "institutional"],
  performance_technical: ["collector"],
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function detectUnifiedQueryClass(text: string): UnifiedQueryClass | null {
  const s = text.toLowerCase();
  if (/\b(collector|haute|extrait|mechanical watch|niche artisan|complication)\b/i.test(s)) return "collector";
  if (/\b(architectural|bespoke|designer desk)\b/i.test(s)) return "architectural";
  if (/\b(executive|premium workspace|professional office|steelcase|herman miller)\b/i.test(s)) {
    return "executive";
  }
  if (/\b(institutional|office minimal|desk setup|workspace setup)\b/i.test(s)) return "institutional";
  if (/\b(minimal|clean desk|scandi|monochrome|oak desk|walnut desk)\b/i.test(s)) return "minimal";
  if (/\b(luxury|quiet luxury|designer|premium|elegant|refined|parfum|ysl|libre)\b/i.test(s)) return "luxury";
  return null;
}

export function identityMatchesQueryClass(
  identity: UnifiedTasteIdentityId,
  queryClass: UnifiedQueryClass
): boolean {
  return IDENTITY_ALLOWED_CLASSES[identity]?.includes(queryClass) ?? false;
}

export function unifiedListingHardSuppressed(title: string, violations: string[]): boolean {
  if (HARD_SUPPRESSION_RX.test(title)) return true;
  return violations.some((v) => HARD_VIOLATION_RX.test(v));
}

export function isUnifiedApplyEligible(meta: UnifiedApplyMetaSlice, queryClass: UnifiedQueryClass | null): boolean {
  if (!isUnifiedTasteApplyEnabled()) return false;
  if (!meta.active || !meta.identity || !queryClass) return false;
  if (meta.coherenceScore < TASTE_UNIFIED_COHERENCE_MIN) return false;
  if (meta.prestigeIntegrity < TASTE_UNIFIED_PRESTIGE_INTEGRITY_MIN) return false;
  if (meta.crossVerticalAlignment < TASTE_UNIFIED_CROSS_VERTICAL_MIN) return false;
  return identityMatchesQueryClass(meta.identity, queryClass);
}

function listingViolations(product: QuantProduct, canonicalQuery: CanonicalQueryContract): string[] {
  const cat = canonicalQuery.category;
  if (cat === "watch") return luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery).violations;
  if (cat === "fragrance") return fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery).violations;
  if (cat === "furniture" || cat === "desk_setup") {
    return furnitureGrammarForCategory(cat).detectListingEvidence(product, canonicalQuery).violations;
  }
  return [];
}

function listingFit(product: QuantProduct, canonicalQuery: CanonicalQueryContract): number {
  const cat = canonicalQuery.category;
  if (cat === "watch") return luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery).fit01;
  if (cat === "fragrance") return fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery).fit01;
  if (cat === "furniture" || cat === "desk_setup") {
    return furnitureGrammarForCategory(cat).detectListingEvidence(product, canonicalQuery).fit01;
  }
  return 0.5;
}

/** Bounded per-listing unified delta (max ±4). */
export function computeUnifiedListingDelta(args: {
  query: string;
  product: QuantProduct;
  canonicalQuery: CanonicalQueryContract;
  meta: UnifiedApplyMetaSlice;
  tasteGrammarShadow?: VerticalTasteShadowMeta;
}): number {
  const { query, product, canonicalQuery, meta, tasteGrammarShadow } = args;
  const text = canonicalQuery.semantic.envelope ?? query;
  const queryClass = detectUnifiedQueryClass(text);

  if (!isUnifiedApplyEligible(meta, queryClass)) return 0;

  const shadowViolations = tasteGrammarShadow?.violations ?? tasteGrammarShadow?.tasteViolations ?? [];
  const violations = listingViolations(product, canonicalQuery);

  if (shadowViolations.some((v) => HARD_VIOLATION_RX.test(v))) {
    return unifiedListingHardSuppressed(product.title, violations) ? -TASTE_UNIFIED_APPLY_MAX_DELTA : 0;
  }

  if (unifiedListingHardSuppressed(product.title, violations)) {
    return -TASTE_UNIFIED_APPLY_MAX_DELTA;
  }

  const fit = listingFit(product, canonicalQuery);
  const alignment = laneIdentityAffinity(meta.verticalLane, meta.identity!);
  if (fit >= 0.72 && alignment >= 0.68) {
    return clamp(Math.round(TASTE_UNIFIED_APPLY_MAX_DELTA * 10) / 10, 0, TASTE_UNIFIED_APPLY_MAX_DELTA);
  }

  return 0;
}

export { isUnifiedTasteApplyEnabled, TASTE_UNIFIED_APPLY_MAX_DELTA };
