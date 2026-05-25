/**
 * Controlled activation infrastructure — canary prep only (no global APPLY).
 */

import type { ControlledActivationInput, ControlledActivationResult, ControlledActivationMeta } from "./types";
import { CONTROLLED_ACTIVATION_VERSION } from "./types";
import { readControlledActivationFlags } from "./flags";
import { runCanaryActivationKernel } from "./canary/canaryActivationKernel";
import { runMutationGovernanceKernel } from "./mutation/mutationGovernanceKernel";
import { runEmergencyRollbackKernel } from "./rollback/emergencyRollbackKernel";
import { getCognitionFreezeState } from "./rollback/cognitionFreezeController";
import { prepareShadowRecommendationMutation } from "./apply/shadowRecommendationMutation";
import { computeBoundedInfluence } from "./influence/boundedRecommendationInfluence";
import { computeMerchantDiversityScore } from "./influence/diversityProtectionKernel";
import { evaluateAntiManipulation } from "./influence/antiManipulationGovernor";
import { buildActivationReplayFingerprint } from "./replay/deterministicActivationExecution";
import { resolveGlobalMutationPolicy } from "@/lib/governance/applyMutationGuard";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Evaluate controlled activation path. Never applies live ranking mutation.
 */
export function buildControlledActivation(
  input: ControlledActivationInput
): ControlledActivationResult {
  const started = Date.now();
  const flags = readControlledActivationFlags();
  const policy = resolveGlobalMutationPolicy();
  const cognitionConf =
    input.commerceOsResult?.meta.avgStrategicConfidence ??
    input.recommendationResult?.meta.avgConfidence01 ??
    0;

  const empty = (): ControlledActivationResult => ({
    products: input.products,
    meta: {
      version: CONTROLLED_ACTIVATION_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      globalApplyBlocked: true,
      inCanary: false,
      mutationApproved: false,
      governanceConfidence: 0,
      emergencyDisabled: flags.emergencyDisable,
      latencyMs: Date.now() - started,
    },
    activation: {
      inCanary: false,
      mutationAllowed: false,
      routeReason: "disabled",
      trafficBucket: 0,
    },
    governance: {
      approved: false,
      shadowOnly: true,
      blockedReasons: ["activation_disabled"],
      checks: {},
      confidence01: 0,
    },
    shadowMutation: {
      prepared: false,
      candidateCount: 0,
      maxInfluence01: 0,
      rankingMutation: false,
      applyContractVersion: "none",
    },
    rollback: {
      frozen: getCognitionFreezeState().frozen,
      restoreId: "rst_disabled",
      preMutationLinks: input.preMutationLinks.slice(0, 12),
      replayFingerprint: "act_disabled",
    },
    replayFingerprint: "act_disabled",
  });

  if (!flags.enabled || input.products.length === 0) return empty();

  const activation = runCanaryActivationKernel({
    flags,
    sessionKey: input.sessionKey,
    query: input.query,
    category: input.category ?? null,
    products: input.products,
    cognitionConfidence01: cognitionConf,
  });

  let governance = runMutationGovernanceKernel(input);

  const diversity01 = computeMerchantDiversityScore(input.products);
  const antiManip = evaluateAntiManipulation({
    recommendationResult: input.recommendationResult,
    merchantDiversity01: diversity01,
    priorLinkCount: input.preMutationLinks.length,
  });
  if (!antiManip.allowed) {
    governance = {
      ...governance,
      approved: false,
      blockedReasons: [...governance.blockedReasons, ...antiManip.reasons].slice(0, 10),
    };
  }

  if (policy.controlledStackMutationBlocked) {
    governance = {
      ...governance,
      approved: false,
      blockedReasons: [...governance.blockedReasons, "production_mutation_hard_block"],
    };
  }

  const stackFp = [
    input.trustResult?.replayFingerprint,
    input.recommendationResult?.replayFingerprint,
    input.commerceOsResult?.replayFingerprint,
  ]
    .filter(Boolean)
    .join("|");

  const rollbackResult = runEmergencyRollbackKernel({
    products: input.products,
    preMutationLinks: input.preMutationLinks,
    governance,
    stackFingerprint: stackFp || "stack",
    forceRollback: flags.emergencyDisable,
  });

  const maxInfluence = computeBoundedInfluence(
    input.recommendationResult,
    governance.confidence01
  );
  const shadowMutation = prepareShadowRecommendationMutation({
    activation,
    governance,
    recommendationResult: input.recommendationResult,
    maxInfluence01: maxInfluence,
  });

  const meta: ControlledActivationMeta = {
    version: CONTROLLED_ACTIVATION_VERSION,
    enabled: true,
    shadowOnly: true,
    globalApplyBlocked: true,
    inCanary: activation.inCanary,
    mutationApproved: governance.approved && shadowMutation.prepared,
    governanceConfidence: round4(governance.confidence01),
    emergencyDisabled: flags.emergencyDisable,
    latencyMs: Date.now() - started,
  };

  const result: ControlledActivationResult = {
    products: rollbackResult.products,
    meta,
    activation,
    governance,
    shadowMutation,
    rollback: rollbackResult.rollback,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildActivationReplayFingerprint(result);
  result.rollback.replayFingerprint = result.replayFingerprint;
  return result;
}

export function controlledActivationMetaForSearch(
  result: ControlledActivationResult
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    controlledActivation: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      activation: result.activation,
      governance: {
        approved: result.governance.approved,
        confidence01: result.governance.confidence01,
        blockedReasons: result.governance.blockedReasons.slice(0, 6),
        checks: result.governance.checks,
      },
    },
    controlledActivationShadow: {
      canaryTelemetry: {
        trafficBucket: result.activation.trafficBucket,
        routeReason: result.activation.routeReason,
        mutationAllowed: result.activation.mutationAllowed,
      },
      mutationConfidence: result.governance.confidence01,
      shadowMutation: result.shadowMutation,
      rollbackMetrics: {
        frozen: result.rollback.frozen,
        restoreId: result.rollback.restoreId,
        rolledBackLinks: result.rollback.preMutationLinks.length,
      },
      failureReasons: result.governance.blockedReasons,
      boundedCognition: {
        maxInfluence01: result.shadowMutation.maxInfluence01,
        candidateCount: result.shadowMutation.candidateCount,
      },
    },
  };
}
