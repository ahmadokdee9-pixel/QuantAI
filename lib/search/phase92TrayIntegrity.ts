/**
 * Phase 9.2 — Tray integrity orchestrator (diversity + compare, post-upgrade only).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  applyCompareIntentIntegrity,
  type CompareIntegrityMeta,
} from "@/lib/search/compareIntentIntegrity";
import {
  applyMerchantConcentrationControls,
  applyTop3DiversityProtection,
  type Top3DiversityMeta,
} from "@/lib/search/top3DiversityIntegrity";

export type Phase92TrayIntegrityMeta = {
  version: "phase9.2-v1";
  compareIntegrity: CompareIntegrityMeta;
  top3Diversity: Top3DiversityMeta;
};

export function applyPhase92TrayIntegrity(
  products: QuantProduct[],
  query: string,
  intent: ExtractedSearchIntent,
  canonical?: CanonicalQueryContract
): { products: QuantProduct[]; meta: Phase92TrayIntegrityMeta } {
  const concentrated = applyMerchantConcentrationControls(products);
  const comparePass = applyCompareIntentIntegrity(concentrated, query, intent, canonical);
  const diversityPass = applyTop3DiversityProtection(comparePass.products, { preserveTop1: true });

  return {
    products: diversityPass.products,
    meta: {
      version: "phase9.2-v1",
      compareIntegrity: comparePass.meta,
      top3Diversity: diversityPass.meta,
    },
  };
}
