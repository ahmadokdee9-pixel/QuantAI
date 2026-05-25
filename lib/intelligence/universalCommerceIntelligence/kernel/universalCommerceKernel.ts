/**
 * Phase 16 — Universal commerce kernel.
 */

import type { UniversalCommerceIntelligenceInput, UniversalAxisId, UniversalVerticalId } from "../types";
import { resolveUniversalCategoryCognition } from "../cognition/universalCategoryCognition";
import { buildVerticalIntelligence } from "../verticals/categoryIntelligenceModules";
import { buildCrossCategoryIntelligenceGraph } from "../graph/crossCategoryIntelligenceGraph";
import { buildCategoryTimingGraph } from "../graph/categoryTimingGraph";
import { buildUniversalCommerceOntology } from "../ontology/universalCommerceOntology";
import { modelAestheticPreference } from "../aesthetic/aestheticPreferenceEngine";
import { resolveCategoryLifecycle } from "../lifecycle/categoryLifecycleEngines";
import { reasonUniversalPremiumUtility } from "../premium/premiumVsUtilityReasoning";
import { normalizeUniversalTrust } from "../trust/universalTrustNormalization";
import { calibrateCrossCategoryTrust } from "../trust/crossCategoryTrustCalibration";
import { analyzeUniversalMerchants } from "../merchant/universalMerchantIntelligence";
import { modelCategoryVolatility } from "../volatility/categoryVolatilityModels";
import { adaptRegionalCategory } from "../regional/regionalCategoryAdaptation";
import {
  fuseDeterministicCategorySignals,
  computeFusedUniversalScore,
} from "../fusion/deterministicCategoryFusion";
import { buildReplaySafeUniversalMemory } from "../memory/replaySafeUniversalMemory";
import { arbitrateUniversalCognition } from "../governance/cognitionArbitration";
import { buildShadowUniversalCandidates } from "../candidates/shadowUniversalCandidates";
import { buildUniversalExplainability } from "../explain/universalExplainability";

export type UniversalCommerceKernelResult = Omit<
  import("../types").UniversalCommerceIntelligenceResult,
  "products" | "meta" | "replayFingerprint"
> & {
  universalConfidence01: number;
  governanceAllowed: boolean;
  verticalCount: number;
};

export function runUniversalCommerceKernel(
  input: UniversalCommerceIntelligenceInput,
  maxInfluence01: number
): UniversalCommerceKernelResult {
  const cognition = resolveUniversalCategoryCognition({
    query: input.query,
    products: input.products,
  });

  const verticalIntelligence = buildVerticalIntelligence({
    query: input.query,
    verticalScores: cognition.verticalScores,
  });

  const trustNorm = normalizeUniversalTrust({
    trust: input.trust,
    dominantVertical: cognition.dominantVertical,
    query: input.query,
  });
  const trustCalibrated = calibrateCrossCategoryTrust(verticalIntelligence, trustNorm);

  const aesthetic = modelAestheticPreference({
    query: input.query,
    dominantVertical: cognition.dominantVertical,
    commerceIdentity: input.commerceIdentity,
  });
  const lifecycle = resolveCategoryLifecycle({
    dominantVertical: cognition.dominantVertical,
    predictive: input.predictiveIntent,
  });
  const premiumUtility = reasonUniversalPremiumUtility({
    dominantVertical: cognition.dominantVertical,
    commerceStrategy: input.commerceStrategy,
  });
  const merchant = analyzeUniversalMerchants({
    products: input.products,
    dominantVertical: cognition.dominantVertical,
  });
  const volatility = modelCategoryVolatility({
    dominantVertical: cognition.dominantVertical,
    query: input.query,
    commerceStrategy: input.commerceStrategy,
  });
  const regional = adaptRegionalCategory({
    query: input.query,
    commerceIdentity: input.commerceIdentity,
  });

  const crossCategoryGraph = buildCrossCategoryIntelligenceGraph(verticalIntelligence);
  const activeVerticals = crossCategoryGraph.map((n) => n.verticalId);
  const timingGraph = buildCategoryTimingGraph({ query: input.query, activeVerticals });
  const ontology = buildUniversalCommerceOntology({
    query: input.query,
    dominantVertical: cognition.dominantVertical,
  });

  void buildReplaySafeUniversalMemory({
    query: input.query,
    dominantVertical: cognition.dominantVertical,
  });

  const dom = cognition.dominantVertical;
  const rawAxes: { axisId: UniversalAxisId; verticalId: UniversalVerticalId; strength01: number }[] = [
    { axisId: "category_cognition", verticalId: dom, strength01: cognition.spread01 + 0.4 },
    { axisId: "cross_category", verticalId: dom, strength01: crossCategoryGraph.length / 10 },
    { axisId: "aesthetic", verticalId: dom, strength01: aesthetic.aesthetic01 },
    { axisId: "lifecycle", verticalId: dom, strength01: lifecycle.verticalTiming01 },
    { axisId: "timing", verticalId: dom, strength01: timingGraph[0]?.timingScore01 ?? 0.25 },
    { axisId: "trust", verticalId: dom, strength01: trustCalibrated },
    { axisId: "merchant", verticalId: dom, strength01: merchant.merchantDiversity01 },
    { axisId: "volatility", verticalId: dom, strength01: volatility.volatility01 },
    { axisId: "premium_utility", verticalId: dom, strength01: premiumUtility.score01 },
    { axisId: "regional", verticalId: dom, strength01: regional.weight01 },
    { axisId: "ontology", verticalId: dom, strength01: ontology.length / 8 },
  ];

  const fusedSignals = fuseDeterministicCategorySignals(rawAxes, trustNorm);
  const fusedScore = computeFusedUniversalScore(fusedSignals);

  const universalConfidence01 = Math.min(
    1,
    fusedScore * 0.45 +
      trustCalibrated * 0.25 +
      (input.commerceStrategy?.meta.strategyConfidence01 ?? 0.3) * 0.2 +
      0.05
  );

  const governance = arbitrateUniversalCognition(input, universalConfidence01);
  const shadowCandidates = buildShadowUniversalCandidates({
    dominantVertical: dom,
    verticalScores: verticalIntelligence,
    governance,
    maxInfluence01,
  });

  const traceExamples = fusedSignals.map((s) => `${s.axisId}:${s.verticalId}:${s.trustAdjusted01}`);
  const explain = buildUniversalExplainability({
    dominantVertical: dom,
    spread01: cognition.spread01,
    aestheticLabel: aesthetic.label,
    merchantVerdict: merchant.verdict,
    premiumBias: premiumUtility.bias,
    governance,
    fusedCount: fusedSignals.length,
    traceExamples,
  });

  const verticalCount = Object.values(verticalIntelligence).filter((v) => v.active).length;

  return {
    categoryCognition: {
      dominantVertical: cognition.dominantVertical,
      spread01: cognition.spread01,
    },
    verticalIntelligence,
    premiumUtility,
    aesthetic,
    lifecycle,
    crossCategoryGraph,
    ontology,
    timingGraph,
    fusedSignals,
    shadowCandidates,
    explain,
    universalConfidence01: Math.round(universalConfidence01 * 10000) / 10000,
    governanceAllowed: governance.allowed,
    verticalCount,
  };
}
