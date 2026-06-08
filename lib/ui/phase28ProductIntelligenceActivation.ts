/**
 * Phase 28 — Universal Product Intelligence activation (after Phase 27.5).
 * Product-first verdict and reasoning; pricing is one signal among many.
 */

import type { CoherentProductDecision } from "@/lib/ui/decisionCoherenceActivation";
import type { ExposureChip } from "@/lib/ui/intelligenceExposureActivation";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import { buildIntegrityUniversalProductDecisionMap } from "@/lib/ui/phase275PresentationActivation";
import type { ProductTrayMeta } from "@/lib/ui/productDifferentiationEngine";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { activateProductUnderstanding } from "@/lib/ui/productUnderstandingActivation";
import type { UniversalProductIntelligenceResult } from "@/lib/ui/universalProductIntelligenceEngine";
import type { VerdictReasonAuthority } from "@/lib/ui/verdictReasonAuthority";
import { buildSurfaceSummaryLines } from "@/lib/ui/verdictReasonAuthority";

function trayMedianPrice(metaByLink: Map<string, ProductTrayMeta>): number {
  const prices = [...metaByLink.values()].map((row) => row.price).filter((price) => price > 0);
  if (!prices.length) return 0;
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
}

function buildProductIntelligenceReasonAuthority(
  intelligence: UniversalProductIntelligenceResult,
  prior: VerdictReasonAuthority
): VerdictReasonAuthority {
  const primaryCode =
    intelligence.finalVerdict === "BUY READY"
      ? "QUALITY"
      : intelligence.finalVerdict === "COMPARE"
        ? "COMPARE_OPTIONS"
        : intelligence.finalVerdict === "AVOID"
          ? "TRUST_RISK"
          : "INSUFFICIENT_DATA";

  const secondaryCode = intelligence.finalVerdict === "BUY READY" ? "FIT" : "QUALITY";

  return {
    verdict: intelligence.finalVerdict,
    primaryReason: {
      code: primaryCode,
      label: intelligence.segmentLabel || "Product",
      line: intelligence.primaryReason,
    },
    secondaryReasons: [
      {
        code: secondaryCode,
        label: "Product understanding",
        line: intelligence.secondaryReason,
      },
    ],
    rejectedReasons: prior.rejectedReasons.filter(
      (row) => row.code === "PRICE" || row.code === "PRICE_TOO_HIGH"
    ),
  };
}

function buildProductDimensionChips(intelligence: UniversalProductIntelligenceResult): ExposureChip[] {
  return intelligence.dimensions
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((row) => ({
      label: `${row.label} ${row.score}`,
      tone: row.score >= 68 ? "emerald" : row.score >= 50 ? "blue" : "amber",
      evidence: row.score >= 50 ? "positive" : "caution",
    }));
}

function mergeProductIntelligenceDecision(
  base: UniversalProductDecision,
  intelligence: UniversalProductIntelligenceResult
): UniversalProductDecision {
  const reasonAuthority = buildProductIntelligenceReasonAuthority(intelligence, base.reasonAuthority);
  const displayChips =
    buildProductDimensionChips(intelligence).length > 0
      ? buildProductDimensionChips(intelligence)
      : base.displayChips;

  return {
    ...base,
    verdict: intelligence.finalVerdict,
    reasonLine: intelligence.primaryReason,
    primaryReason: intelligence.primaryReason,
    secondaryReason: intelligence.secondaryReason,
    reasonAuthority,
    displayChips,
    summaryLines: buildSurfaceSummaryLines(reasonAuthority),
    confidenceReason: intelligence.secondaryReason,
    productIntelligence: {
      productQualityScore: intelligence.productQualityScore,
      categoryFitScore: intelligence.categoryFitScore,
      valueScore: intelligence.valueScore,
      trustScore: intelligence.trustScore,
      pricingScore: intelligence.pricingScore,
      alternativePressure: intelligence.alternativePressure,
      finalVerdict: intelligence.finalVerdict,
      segment: intelligence.segment,
      segmentLabel: intelligence.segmentLabel,
      dimensions: intelligence.dimensions,
      productUnderstandingLine: intelligence.productUnderstandingLine,
    },
  };
}

export function buildUniversalProductIntelligenceMap(
  coherenceByLink: Map<string, CoherentProductDecision>,
  metaByLink: Map<string, ProductTrayMeta>,
  productsByLink: Map<string, { product: import("@/lib/shoppingScore").QuantProduct; searchQuery: string }>
): Map<string, UniversalProductDecision> {
  const integrityMap = buildIntegrityUniversalProductDecisionMap(coherenceByLink, metaByLink);
  const median = trayMedianPrice(metaByLink);
  const enriched = new Map<string, UniversalProductDecision>();

  for (const [link, base] of integrityMap) {
    const coherent = coherenceByLink.get(link);
    const productRow = productsByLink.get(link);
    if (!coherent || !productRow) {
      enriched.set(link, base);
      continue;
    }

    const intelligence = activateProductUnderstanding({
      product: productRow.product,
      searchQuery: productRow.searchQuery,
      coherent,
      alternativePressure: base.alternativePressureScore,
      trayMedianPrice: median,
    });

    enriched.set(link, mergeProductIntelligenceDecision(base, intelligence));
  }

  return enriched;
}
