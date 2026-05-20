/**
 * Phase 3.2 — Controlled unified taste apply canary (secondary to P2.4/P2.5/P2.6).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  computeUnifiedListingDelta,
  detectUnifiedQueryClass,
  isUnifiedApplyEligible,
  isUnifiedTasteApplyEnabled,
  unifiedListingHardSuppressed,
} from "@/lib/taste/unifiedTasteGates";
import { fragranceTasteGrammar } from "@/lib/taste/grammars/fragranceTasteGrammar";
import { furnitureGrammarForCategory } from "@/lib/taste/grammars/furnitureTasteGrammar";
import { luxuryWatchGrammar } from "@/lib/taste/grammars/luxuryWatchGrammar";
import type { UnifiedTasteIdentityId } from "@/lib/taste/tasteGraph";
import { computeUnifiedTasteSignals } from "@/lib/taste/unifiedTasteIdentity";
import { TASTE_UNIFIED_APPLY_CANARY_VERSION } from "@/lib/taste/unifiedTasteFlags";
import type { VerticalTasteShadowMeta } from "@/lib/taste/verticalTasteContracts";
import type { UnifiedQueryClass } from "@/lib/taste/unifiedTasteGates";

export type { UnifiedQueryClass } from "@/lib/taste/unifiedTasteGates";
export {
  detectUnifiedQueryClass,
  identityMatchesQueryClass,
  isUnifiedApplyEligible,
  isUnifiedTasteApplyEnabled,
  unifiedListingHardSuppressed,
} from "@/lib/taste/unifiedTasteGates";

export type UnifiedTasteCanaryMeta = {
  version: typeof TASTE_UNIFIED_APPLY_CANARY_VERSION;
  active: boolean;
  applyEnabled: boolean;
  applyEligible: boolean;
  queryClass: UnifiedQueryClass | null;
  identity: UnifiedTasteIdentityId | null;
  coherenceScore: number;
  prestigeIntegrity: number;
  crossVerticalAlignment: number;
  applyDeltaAvg: number;
  applyDeltaMax: number;
  rankingDriftCount: number;
  pollutionTop2: number;
  storeDiversityTop5: number;
  trayCollapse: boolean;
  latencyMs: number;
  skippedReason?: string;
  top5ApplyTrace: { title: string; unifiedDelta: number; suppressed: boolean }[];
};

function listingViolations(product: QuantProduct, canonicalQuery: CanonicalQueryContract): string[] {
  const cat = canonicalQuery.category;
  if (cat === "watch") return luxuryWatchGrammar.detectListingEvidence(product, canonicalQuery).violations;
  if (cat === "fragrance") return fragranceTasteGrammar.detectListingEvidence(product, canonicalQuery).violations;
  if (cat === "furniture" || cat === "desk_setup") {
    return furnitureGrammarForCategory(cat).detectListingEvidence(product, canonicalQuery).violations;
  }
  return [];
}

export function computeUnifiedTasteApplyDelta(args: {
  query: string;
  product: QuantProduct;
  canonicalQuery: CanonicalQueryContract;
  signals: ReturnType<typeof computeUnifiedTasteSignals>;
  tasteGrammarShadow?: VerticalTasteShadowMeta;
}): number {
  const { query, product, canonicalQuery, signals, tasteGrammarShadow } = args;
  const m = signals.meta;
  return computeUnifiedListingDelta({
    query,
    product,
    canonicalQuery,
    meta: {
      active: m.active,
      identity: m.identity,
      coherenceScore: m.coherenceScore,
      prestigeIntegrity: m.prestigeIntegrity,
      crossVerticalAlignment: m.crossVerticalAlignment,
      verticalLane: m.verticalLane,
    },
    tasteGrammarShadow,
  });
}

/** Stable partition: hard-suppressed listings sink after clean listings when apply gates pass. */
export function stabilizeUnifiedHardSuppressionOrder(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  tasteGrammarShadow?: VerticalTasteShadowMeta;
}): QuantProduct[] {
  const { query, canonicalQuery, products, tasteGrammarShadow } = args;
  if (!isUnifiedTasteApplyEnabled() || products.length <= 1) return products;

  const text = canonicalQuery.semantic.envelope ?? query;
  const queryClass = detectUnifiedQueryClass(text);
  const signals = computeUnifiedTasteSignals({ query, canonicalQuery, products, tasteGrammarShadow });
  const m = signals.meta;
  const applyEligible = isUnifiedApplyEligible(
    {
      active: m.active,
      identity: m.identity,
      coherenceScore: m.coherenceScore,
      prestigeIntegrity: m.prestigeIntegrity,
      crossVerticalAlignment: m.crossVerticalAlignment,
      verticalLane: m.verticalLane,
    },
    queryClass
  );
  if (!applyEligible) return products;

  const clean: QuantProduct[] = [];
  const suppressed: QuantProduct[] = [];
  for (const p of products) {
    const violations = listingViolations(p, canonicalQuery);
    if (unifiedListingHardSuppressed(p.title, violations)) suppressed.push(p);
    else clean.push(p);
  }
  if (!suppressed.length) return products;
  return [...clean, ...suppressed].map((p, i) => ({ ...p, qiRank: i }));
}

export function buildUnifiedTasteCanaryMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  products: QuantProduct[];
  tasteGrammarShadow?: VerticalTasteShadowMeta;
  preOrderLinks?: string[];
}): UnifiedTasteCanaryMeta {
  const started = Date.now();
  const { query, canonicalQuery, products, tasteGrammarShadow, preOrderLinks = [] } = args;
  const applyEnabled = isUnifiedTasteApplyEnabled();
  const text = canonicalQuery.semantic.envelope ?? query;
  const queryClass = detectUnifiedQueryClass(text);
  const signals = computeUnifiedTasteSignals({ query, canonicalQuery, products, tasteGrammarShadow });
  const meta = signals.meta;
  const applyEligible = isUnifiedApplyEligible(
    {
      active: meta.active,
      identity: meta.identity,
      coherenceScore: meta.coherenceScore,
      prestigeIntegrity: meta.prestigeIntegrity,
      crossVerticalAlignment: meta.crossVerticalAlignment,
      verticalLane: meta.verticalLane,
    },
    queryClass
  );

  if (!meta.active) {
    return {
      version: TASTE_UNIFIED_APPLY_CANARY_VERSION,
      active: false,
      applyEnabled,
      applyEligible: false,
      queryClass,
      identity: null,
      coherenceScore: 0,
      prestigeIntegrity: meta.prestigeIntegrity,
      crossVerticalAlignment: 0,
      applyDeltaAvg: 0,
      applyDeltaMax: 0,
      rankingDriftCount: 0,
      pollutionTop2: 0,
      storeDiversityTop5: 0,
      trayCollapse: false,
      latencyMs: Date.now() - started,
      skippedReason: meta.skippedReason ?? "inactive",
      top5ApplyTrace: [],
    };
  }

  const top = products.slice(0, 5);
  const top2 = products.slice(0, 2);
  const traces: UnifiedTasteCanaryMeta["top5ApplyTrace"] = [];
  let deltaSum = 0;
  let deltaMax = 0;
  let pollutionTop2 = 0;
  const stores = new Set<string>();

  for (const p of top) {
    const violations = listingViolations(p, canonicalQuery);
    const suppressed = unifiedListingHardSuppressed(p.title, violations);
    const delta = computeUnifiedTasteApplyDelta({ query, product: p, canonicalQuery, signals, tasteGrammarShadow });
    deltaSum += delta;
    deltaMax = Math.max(deltaMax, Math.abs(delta));
    stores.add(p.store.trim().toLowerCase());
    traces.push({ title: p.title.slice(0, 72), unifiedDelta: delta, suppressed });
  }

  for (const p of top2) {
    if (unifiedListingHardSuppressed(p.title, listingViolations(p, canonicalQuery))) pollutionTop2 += 1;
  }

  const postLinks = top.map((p) => p.link || p.title);
  const preLinks = preOrderLinks.slice(0, 5);
  let drift = 0;
  for (let i = 0; i < Math.min(preLinks.length, postLinks.length); i += 1) {
    if (preLinks[i] !== postLinks[i]) drift += 1;
  }

  return {
    version: TASTE_UNIFIED_APPLY_CANARY_VERSION,
    active: true,
    applyEnabled,
    applyEligible,
    queryClass,
    identity: meta.identity,
    coherenceScore: meta.coherenceScore,
    prestigeIntegrity: meta.prestigeIntegrity,
    crossVerticalAlignment: meta.crossVerticalAlignment,
    applyDeltaAvg: top.length ? Math.round((deltaSum / top.length) * 100) / 100 : 0,
    applyDeltaMax: deltaMax,
    rankingDriftCount: drift,
    pollutionTop2,
    storeDiversityTop5: stores.size,
    trayCollapse: products.length > 0 && products.length < 2,
    latencyMs: Date.now() - started,
    top5ApplyTrace: traces,
  };
}
