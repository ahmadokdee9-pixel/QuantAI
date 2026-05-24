/**
 * Phase 6 — Memory explainability layer (meta-only traces).
 */

import type { MemoryExplainability } from "../types";
import type { CanonicalUserTaste } from "../types";
import type { TasteProfileEngineResult } from "../taste/tasteProfileEngine";
import type { CommerceMemoryKernelResult } from "../memory/commerceMemoryKernel";
import type { DeterministicPreferenceSignals } from "../types";

export function buildMemoryExplainability(args: {
  taste: TasteProfileEngineResult;
  memory: CommerceMemoryKernelResult;
  preferenceSignals: DeterministicPreferenceSignals;
  canonicalTaste: CanonicalUserTaste;
}): MemoryExplainability {
  const { taste, memory, preferenceSignals, canonicalTaste } = args;
  const whyRecommended: string[] = [];
  const whyPreferenceDetected: string[] = [];
  const whyBrandAffinity: string[] = [];
  const whyPriceSensitivity: string[] = [];
  const whyTrustPreference: string[] = [];

  if (preferenceSignals.preferenceScore >= 55) {
    whyRecommended.push("preference_confidence_above_threshold");
  }
  if (taste.aestheticGraph.dominantAxis) {
    whyPreferenceDetected.push(`dominant_aesthetic_${taste.aestheticGraph.dominantAxis}`);
  }
  if (memory.intentMemory.repeatSearch01 > 0.2) {
    whyPreferenceDetected.push("repeat_search_pattern");
  }

  for (const brand of canonicalTaste.merchantSensitivity.preferredStores.slice(0, 3)) {
    whyBrandAffinity.push(`brand_affinity_${brand}`);
  }

  if (canonicalTaste.pricingBehavior.priceSensitivity01 >= 0.5) {
    whyPriceSensitivity.push("price_sensitive_shopper");
  } else if (canonicalTaste.premiumIntent.premiumPreference01 >= 0.5) {
    whyPriceSensitivity.push("premium_price_tolerance");
  }

  if (canonicalTaste.trustProfile.trustSensitivity01 >= 0.55) {
    whyTrustPreference.push("trust_weighted_selection");
  }
  if (memory.interactionGraph.trustSelection01 >= 0.6) {
    whyTrustPreference.push("tray_trust_signals_elevated");
  }

  return {
    whyRecommended: whyRecommended.slice(0, 6),
    whyPreferenceDetected: whyPreferenceDetected.slice(0, 6),
    whyBrandAffinity: whyBrandAffinity.slice(0, 6),
    whyPriceSensitivity: whyPriceSensitivity.slice(0, 6),
    whyTrustPreference: whyTrustPreference.slice(0, 6),
  };
}
