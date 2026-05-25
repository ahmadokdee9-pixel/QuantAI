/**
 * Phase 17 — Emotional commerce kernel.
 */

import type { EmotionalCommerceIntelligenceInput, EmotionalAxisId } from "../types";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "@/lib/intelligence/commerceSessionMemory";
import { runAestheticReasoning } from "../aesthetic/aestheticReasoningEngine";
import { modelAestheticIdentity } from "../aesthetic/aestheticIdentityModeling";
import { detectMinimalismMaximalism } from "../style/minimalismMaximalismDetection";
import { mapStylePersonality } from "../style/stylePersonalityMapping";
import { resolveLifestylePreference } from "../lifestyle/lifestylePreferenceIntelligence";
import { measureLifestyleContinuity } from "../lifestyle/lifestyleContinuityEngine";
import { reasonPremiumAttraction } from "../premium/premiumAttractionReasoning";
import { modelLuxuryPsychology } from "../premium/luxuryPsychologyEngine";
import { resolveEmotionalPurchaseDrivers } from "../drivers/emotionalPurchaseDrivers";
import { balanceImpulseRational } from "../balance/impulseRationalBalancing";
import { balanceComfortStatusUtility } from "../balance/comfortStatusUtilityBalancing";
import { scoreEmotionalTrust } from "../trust/emotionalTrustScoring";
import { analyzeConfidenceAspiration } from "../trust/confidenceAspirationAnalysis";
import { detectEmotionalTiming } from "../timing/emotionalTimingDetection";
import { adaptRegionalEmotionalCommerce } from "../regional/regionalEmotionalAdaptation";
import { resolveEmotionalCommerceLifecycle } from "../lifecycle/emotionalCommerceLifecycle";
import { readAestheticContinuity } from "../memory/aestheticContinuityMemory";
import { buildReplaySafeEmotionalMemory } from "../memory/replaySafeEmotionalMemory";
import { buildEmotionalCommerceGraph } from "../graph/emotionalCommerceGraph";
import { buildTasteCognitionGraph } from "../graph/tasteCognitionGraph";
import { buildEmotionalLifecycleGraph } from "../graph/emotionalLifecycleGraph";
import { buildEmotionalCommerceOntology } from "../ontology/emotionalCommerceOntology";
import {
  fuseDeterministicEmotionalSignals,
  computeFusedEmotionalScore,
} from "../fusion/deterministicEmotionalFusion";
import { arbitrateEmotionalCognition } from "../governance/emotionalGovernanceVeto";
import { buildShadowEmotionalCandidates } from "../candidates/shadowEmotionalCandidates";
import { buildEmotionalExplainability } from "../explain/emotionalExplainability";

export type EmotionalCommerceKernelResult = Omit<
  import("../types").EmotionalCommerceIntelligenceResult,
  "products" | "meta" | "replayFingerprint"
> & {
  emotionalConfidence01: number;
  governanceAllowed: boolean;
  ontologyNodeCount: number;
};

export function runEmotionalCommerceKernel(
  input: EmotionalCommerceIntelligenceInput,
  maxInfluence01: number
): EmotionalCommerceKernelResult {
  const sessionMemory = input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const aestheticReasoning = runAestheticReasoning({
    query: input.query,
    sessionMemory,
    memory: input.memory,
  });
  const aestheticIdentity = modelAestheticIdentity({
    query: input.query,
    commerceIdentity: input.commerceIdentity,
  });
  void detectMinimalismMaximalism(aestheticIdentity);
  const stylePersonality = mapStylePersonality({
    query: input.query,
    sessionMemory,
    shopperPersona: input.shopperPersona,
  });
  const lifestyle = resolveLifestylePreference({ query: input.query, sessionMemory });
  const lifestyleContinuity = measureLifestyleContinuity(sessionMemory);
  const premiumAttraction = reasonPremiumAttraction({
    query: input.query,
    commerceStrategy: input.commerceStrategy,
  });
  const luxuryPsychology = modelLuxuryPsychology({
    query: input.query,
    universalCommerce: input.universalCommerce,
  });
  const purchaseDrivers = resolveEmotionalPurchaseDrivers(input.query);
  const impulseRational = balanceImpulseRational({
    query: input.query,
    impulseSignals: input.universalCommerce?.lifecycle.verticalTiming01 ?? 0.3,
  });
  const emotionalTrust = scoreEmotionalTrust({
    trust: input.trust,
    impulse01: impulseRational.impulse01,
  });
  const confidenceAspiration = analyzeConfidenceAspiration({
    styleConfidence01: stylePersonality.confidence01,
    aspiration01: luxuryPsychology.aspiration01,
    emotionalTrust01: emotionalTrust.score01,
  });
  const comfortStatusUtility = balanceComfortStatusUtility({
    query: input.query,
    status01: luxuryPsychology.status01,
    utilityBias: input.universalCommerce?.premiumUtility.score01 ?? 0.35,
  });
  const emotionalTiming = detectEmotionalTiming(input.query);
  const aestheticContinuity = readAestheticContinuity({ sessionMemory, memory: input.memory });
  const emotionalLifecycle = resolveEmotionalCommerceLifecycle({
    query: input.query,
    universalCommerce: input.universalCommerce,
    continuity01: aestheticContinuity.continuity01,
  });
  const regional = adaptRegionalEmotionalCommerce({
    query: input.query,
    commerceIdentity: input.commerceIdentity,
  });

  void buildReplaySafeEmotionalMemory({
    query: input.query,
    stylePersonality: stylePersonality.personality,
    continuity01: aestheticContinuity.continuity01,
  });

  const emotionalGraph = buildEmotionalCommerceGraph({
    query: input.query,
    driver: purchaseDrivers.driver,
    impulse01: impulseRational.impulse01,
    aspiration01: luxuryPsychology.aspiration01,
  });
  const tasteCognitionGraph = buildTasteCognitionGraph({
    minimalist01: aestheticIdentity.minimalist01,
    maximalist01: aestheticIdentity.maximalist01,
    aestheticScore01: aestheticReasoning.aestheticScore01,
    personality: stylePersonality.personality,
  });
  const lifecycleGraph = buildEmotionalLifecycleGraph({
    phase: emotionalLifecycle.phase,
    continuity01: emotionalLifecycle.continuity01,
    urgency01: emotionalTiming.urgency01,
  });
  const ontology = buildEmotionalCommerceOntology(input.query);

  const rawAxes: { axisId: EmotionalAxisId; strength01: number }[] = [
    { axisId: "aesthetic", strength01: aestheticReasoning.aestheticScore01 },
    { axisId: "lifestyle", strength01: lifestyle.alignment01 },
    { axisId: "premium_attraction", strength01: premiumAttraction.attraction01 },
    { axisId: "luxury_psychology", strength01: luxuryPsychology.status01 },
    { axisId: "purchase_driver", strength01: purchaseDrivers.strength01 },
    { axisId: "impulse_rational", strength01: impulseRational.impulse01 },
    { axisId: "style_personality", strength01: stylePersonality.confidence01 },
    { axisId: "emotional_trust", strength01: emotionalTrust.score01 },
    { axisId: "confidence_aspiration", strength01: confidenceAspiration.aspiration01 },
    { axisId: "comfort_status_utility", strength01: comfortStatusUtility.status01 },
    { axisId: "emotional_timing", strength01: emotionalTiming.urgency01 },
    { axisId: "lifecycle", strength01: lifestyleContinuity.continuity01 },
    { axisId: "regional", strength01: regional.weight01 },
  ];

  const fusedSignals = fuseDeterministicEmotionalSignals(rawAxes, emotionalTrust.score01);
  const fusedScore = computeFusedEmotionalScore(fusedSignals);

  const emotionalConfidence01 = Math.min(
    1,
    fusedScore * 0.42 +
      emotionalTrust.score01 * 0.28 +
      (input.universalCommerce?.meta.universalConfidence01 ?? 0.3) * 0.2 +
      lifestyleContinuity.continuity01 * 0.05 +
      0.05
  );

  const governance = arbitrateEmotionalCognition(input, emotionalConfidence01);
  const shadowCandidates = buildShadowEmotionalCandidates({
    fusedSignals,
    governance,
    maxInfluence01,
  });

  const traceExamples = fusedSignals.map((s) => `${s.axisId}:${s.trustAdjusted01}`);
  const explain = buildEmotionalExplainability({
    driver: purchaseDrivers.driver,
    aestheticLabel: aestheticIdentity.label,
    lifestyleLabel: lifestyle.lifestyleLabel,
    premiumLabel: premiumAttraction.label,
    governance,
    fusedCount: fusedSignals.length,
    traceExamples,
  });

  return {
    aestheticIdentity,
    lifestyle,
    premiumAttraction,
    luxuryPsychology,
    purchaseDrivers,
    impulseRational,
    stylePersonality,
    emotionalTrust,
    confidenceAspiration,
    comfortStatusUtility,
    emotionalTiming,
    emotionalLifecycle,
    emotionalGraph,
    tasteCognitionGraph,
    lifecycleGraph,
    fusedSignals,
    shadowCandidates,
    explain,
    emotionalConfidence01,
    governanceAllowed: governance.allowed,
    ontologyNodeCount: ontology.length,
  };
}
