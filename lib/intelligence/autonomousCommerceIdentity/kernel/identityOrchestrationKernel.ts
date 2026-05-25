/**
 * Phase 13 — Identity orchestration kernel.
 */

import type { AutonomousCommerceIdentityInput, IdentityAxisId } from "../types";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import { buildPersistentTasteFingerprint } from "../taste/persistentTasteFingerprint";
import { evolveCategoryAffinity } from "../affinity/categoryAffinityEvolution";
import { modelPremiumValueLuxury } from "../persona/premiumValueLuxuryModel";
import { resolveCrossSessionPersonality } from "../persona/crossSessionBuyingPersonality";
import { trackLifecycleIdentityTransitions } from "../lifecycle/lifecycleIdentityTransitions";
import { scoreCommerceMaturity } from "../maturity/commerceMaturityScoring";
import { computePreferenceContinuity } from "../continuity/deterministicPreferenceContinuity";
import { buildIdentityContinuityMemory } from "../memory/identityContinuityMemory";
import { detectIdentityDrift } from "../drift/identityDriftDetection";
import { adaptSeasonalIdentity } from "../seasonal/seasonalIdentityAdaptation";
import { calibrateRegionalIdentity } from "../regional/regionalIdentityCalibration";
import { resolveCommerceIntentPersistence } from "../intent/commerceIntentPersistence";
import {
  fuseDeterministicIdentitySignals,
  computeFusedIdentityScore,
} from "../fusion/deterministicIdentityFusionEngine";
import { applyTrustAwareIdentityWeighting } from "../trust/trustAwareIdentityWeighting";
import { buildLongTermCommerceIdentityGraph } from "../graph/longTermCommerceIdentityGraph";
import { buildCommercePersonaGraph } from "../graph/commercePersonaGraph";
import { trackBoundedIdentityEvolution } from "../evolution/boundedIdentityEvolutionTracker";
import { buildAutonomousIdentitySnapshots } from "../snapshots/autonomousIdentitySnapshots";
import { buildShadowIdentityRecommendationCandidates } from "../candidates/shadowIdentityRecommendationCandidates";
import { arbitrateIdentityGovernance } from "../governance/identityArbitration";
import { scoreIdentityConfidence } from "../scoring/identityConfidenceScoring";
import { computeShadowIdentityInfluence } from "../influence/shadowIdentityInfluenceSystem";
import { buildIdentityExplainability } from "../explain/identityExplainability";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type IdentityOrchestrationKernelResult = {
  tasteFingerprint: ReturnType<typeof buildPersistentTasteFingerprint>;
  categoryAffinity: ReturnType<typeof evolveCategoryAffinity>;
  luxuryModel: ReturnType<typeof modelPremiumValueLuxury>;
  crossSessionPersonality: ReturnType<typeof resolveCrossSessionPersonality>;
  lifecycleTransition: ReturnType<typeof trackLifecycleIdentityTransitions>;
  maturity: ReturnType<typeof scoreCommerceMaturity>;
  preferenceContinuity: ReturnType<typeof computePreferenceContinuity>;
  intentPersistence: ReturnType<typeof resolveCommerceIntentPersistence>;
  regionalCalibration: ReturnType<typeof calibrateRegionalIdentity>;
  seasonalAdaptation: ReturnType<typeof adaptSeasonalIdentity>;
  fusedSignals: ReturnType<typeof fuseDeterministicIdentitySignals>;
  personaGraph: ReturnType<typeof buildCommercePersonaGraph>;
  identityGraph: ReturnType<typeof buildLongTermCommerceIdentityGraph>;
  snapshots: ReturnType<typeof buildAutonomousIdentitySnapshots>;
  shadowCandidates: ReturnType<typeof buildShadowIdentityRecommendationCandidates>;
  explain: ReturnType<typeof buildIdentityExplainability>;
  identityConfidence01: number;
  governanceAllowed: boolean;
  driftBand: "stable" | "moderate" | "elevated";
  drift01: number;
  influence: ReturnType<typeof computeShadowIdentityInfluence>;
};

export function runIdentityOrchestrationKernel(
  input: AutonomousCommerceIdentityInput,
  sessionMemory: CommerceSessionMemoryV1,
  maxInfluence01: number
): IdentityOrchestrationKernelResult {
  const tasteFingerprint = buildPersistentTasteFingerprint({
    sessionMemory,
    memory: input.memory,
  });
  const categoryAffinity = evolveCategoryAffinity({
    sessionMemory,
    products: input.products,
  });
  const luxuryModel = modelPremiumValueLuxury({
    query: input.query,
    sessionMemory,
    memory: input.memory,
  });
  const crossSessionPersonality = resolveCrossSessionPersonality({
    sessionMemory,
    shopperPersona: input.shopperPersona,
  });
  const lifecycleTransition = trackLifecycleIdentityTransitions(input.evolution);
  const maturity = scoreCommerceMaturity(sessionMemory);
  const preferenceContinuity = computePreferenceContinuity({
    sessionMemory,
    memory: input.memory,
  });
  const intentPersistence = resolveCommerceIntentPersistence({
    query: input.query,
    evolution: input.evolution,
  });
  const regionalCalibration = calibrateRegionalIdentity({
    query: input.query,
    liveSignals: input.liveSignals,
  });
  const seasonalAdaptation = adaptSeasonalIdentity({
    query: input.query,
    evolution: input.evolution,
  });
  const drift = detectIdentityDrift(input.evolution);
  void buildIdentityContinuityMemory(sessionMemory);
  void trackBoundedIdentityEvolution(sessionMemory);

  const rawAxes: { axisId: IdentityAxisId; strength01: number }[] = [
    { axisId: "taste", strength01: tasteFingerprint.aesthetic01 },
    { axisId: "category", strength01: categoryAffinity.evolution01 },
    { axisId: "premium", strength01: luxuryModel.score01 },
    { axisId: "value", strength01: tasteFingerprint.value01 },
    { axisId: "luxury", strength01: luxuryModel.score01 },
    { axisId: "lifecycle", strength01: lifecycleTransition.strength01 },
    { axisId: "regional", strength01: regionalCalibration.calibration01 },
    { axisId: "intent", strength01: intentPersistence.persistence01 },
    { axisId: "maturity", strength01: maturity.maturity01 },
    { axisId: "trust", strength01: input.trust?.meta.enabled ? 0.7 : 0.4 },
  ];

  let fusedSignals = fuseDeterministicIdentitySignals(rawAxes);
  fusedSignals = applyTrustAwareIdentityWeighting(fusedSignals, input.trust);
  const fusedScore = computeFusedIdentityScore(fusedSignals);

  const identityGraph = buildLongTermCommerceIdentityGraph(
    rawAxes.map((a) => ({ axis: a.axisId, score01: a.strength01 }))
  );
  const personaGraph = buildCommercePersonaGraph({
    personaId: crossSessionPersonality.personaId,
    luxuryBand: luxuryModel.band,
    dominantCategory: categoryAffinity.dominantCategory,
    maturity01: maturity.maturity01,
  });

  const identityConfidence01 = scoreIdentityConfidence({
    fusedScore01: fusedScore,
    continuity01: preferenceContinuity.continuity01,
    maturity01: maturity.maturity01,
    stability01: crossSessionPersonality.stability01,
    trustEnabled: input.trust?.meta.enabled ?? false,
  });

  const governance = arbitrateIdentityGovernance(input, identityConfidence01, drift.band);
  const snapshots = buildAutonomousIdentitySnapshots({
    maturity01: maturity.maturity01,
    drift01: drift.drift01,
    continuity01: preferenceContinuity.continuity01,
    governanceAllowed: governance.allowed,
  });
  const shadowCandidates = buildShadowIdentityRecommendationCandidates({
    signals: fusedSignals,
    governance,
    maxInfluence01,
  });
  const influence = computeShadowIdentityInfluence(
    fusedSignals,
    maxInfluence01,
    governance.allowed
  );
  void influence;

  const traceExamples = fusedSignals.map((s) => `${s.axisId}:${s.trustAdjusted01}`);
  const explain = buildIdentityExplainability({
    personaId: crossSessionPersonality.personaId,
    luxuryBand: luxuryModel.band,
    dominantCategory: categoryAffinity.dominantCategory,
    maturityLabel: maturity.label,
    driftBand: drift.band,
    governance,
    fusedCount: fusedSignals.length,
    traceExamples,
  });

  return {
    tasteFingerprint,
    categoryAffinity,
    luxuryModel,
    crossSessionPersonality,
    lifecycleTransition,
    maturity,
    preferenceContinuity,
    intentPersistence,
    regionalCalibration,
    seasonalAdaptation,
    fusedSignals,
    personaGraph,
    identityGraph,
    snapshots,
    shadowCandidates,
    explain,
    identityConfidence01,
    governanceAllowed: governance.allowed,
    driftBand: drift.band,
    drift01: drift.drift01,
    influence,
  };
}

export { EMPTY_COMMERCE_SESSION_MEMORY };
