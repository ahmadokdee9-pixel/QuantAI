/**
 * Phase 6 — Taste profile engine (canonical user taste model).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CanonicalUserTaste, TasteSensitivityProfile } from "../types";
import { resolveStyleSignals } from "./styleSignalResolver";
import { trackBrandAffinity, topBrands } from "./brandAffinityTracker";
import { buildAestheticPreferenceGraph, type AestheticPreferenceGraph } from "./aestheticPreferenceGraph";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type TasteProfileEngineResult = {
  canonicalTaste: CanonicalUserTaste;
  sensitivity: TasteSensitivityProfile;
  aestheticGraph: AestheticPreferenceGraph;
  confidence01: number;
};

export function runTasteProfileEngine(args: {
  query: string;
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
  trustResult?: TrustEngineResult | null;
}): TasteProfileEngineResult {
  const styleTags = [...args.sessionMemory.styleTags, ...args.sessionMemory.aestheticsRecurring];
  const axes = resolveStyleSignals({
    query: args.query,
    sessionMemory: args.sessionMemory,
    styleTags,
  });
  const brandAffinity = trackBrandAffinity({
    query: args.query,
    products: args.products,
    sessionMemory: args.sessionMemory,
  });

  const prices = args.products.map((p) => p.price).filter((n) => n > 0);
  const med = prices.length ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]! : 0;
  const comfort = args.sessionMemory.priceComfortCenter || med;

  let priceSensitivity01 = 0.35;
  if (comfort > 0 && med > 0) {
    const ratio = med / comfort;
    priceSensitivity01 = clamp01(ratio > 1.2 ? 0.7 : ratio < 0.8 ? 0.25 : 0.45);
  }
  if (/\b(cheap|budget|deal|discount|under)\b/i.test(args.query)) priceSensitivity01 = clamp01(priceSensitivity01 + 0.25);

  const premiumPreference01 = round4(clamp01(axes.luxury01 * 0.5 + (comfort > 400 ? 0.35 : 0.15)));
  const qualitySensitivity01 = round4(
    clamp01(axes.professional01 * 0.3 + axes.luxury01 * 0.35 + (args.sessionMemory.interactionCount > 3 ? 0.2 : 0.1))
  );

  const trustPrep = args.trustResult
    ? Object.values(args.trustResult.rankingPrepByLink)
    : [];
  const avgTrust =
    trustPrep.length > 0 ? trustPrep.reduce((s, p) => s + p.trustScore, 0) / trustPrep.length / 100 : 0.5;
  const trustSensitivity01 = round4(clamp01(avgTrust < 0.55 ? 0.75 : 0.4));

  const sensitivity: TasteSensitivityProfile = {
    qualitySensitivity01,
    priceSensitivity01: round4(priceSensitivity01),
    premiumPreference01,
    trustSensitivity01,
    aestheticConsistency01: round4(
      clamp01(Math.max(...Object.values(axes)) - Math.min(...Object.values(axes)) < 0.35 ? 0.7 : 0.45)
    ),
  };

  const aestheticGraph = buildAestheticPreferenceGraph({ axes, sensitivity, brandAffinity });

  const categoryPreferences = { ...args.sessionMemory.categoryAffinity };
  for (const p of args.products.slice(0, 8)) {
    const slug = p.qiCategory ?? "general";
    categoryPreferences[slug] = (categoryPreferences[slug] ?? 0) + 0.1;
  }

  const canonicalTaste: CanonicalUserTaste = {
    aestheticProfile: axes,
    trustProfile: {
      trustSensitivity01,
      merchantSensitivity01: round4(clamp01(trustSensitivity01 * 0.85)),
    },
    pricingBehavior: {
      priceSensitivity01: sensitivity.priceSensitivity01,
      dealSeeking01: round4(clamp01(sensitivity.priceSensitivity01 * 0.7 + (1 - premiumPreference01) * 0.2)),
    },
    categoryPreferences,
    qualityExpectations: { qualitySensitivity01 },
    premiumIntent: { premiumPreference01 },
    merchantSensitivity: {
      preferredStores: topBrands(brandAffinity, 4),
      avoidedRisk01: round4(clamp01(1 - avgTrust)),
    },
  };

  const confidence01 = round4(
    clamp01(
      args.sessionMemory.interactionCount / 12 * 0.4 +
        (Object.keys(brandAffinity).length > 0 ? 0.25 : 0.1) +
        aestheticGraph.nodes.length / 12 * 0.2 +
        0.15
    )
  );

  return { canonicalTaste, sensitivity, aestheticGraph, confidence01 };
}
