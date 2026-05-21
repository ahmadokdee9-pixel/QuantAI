/**
 * P5.4 — Commerce intelligence fusion (deterministic bounded blending; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import {
  INTENT_FUSION_MAX_DRIFT,
  INTENT_FUSION_VERSION,
  isIntentFusionEnabled,
  isIntentFusionEnvironmentAllowed,
  isIntentFusionMutationEnabled,
  isIntentFusionShadowMode,
  resolveIntentFusionMode,
  type IntentFusionMode,
} from "@/lib/intent/intentFusionFlags";
import { resolveFusionProfile } from "@/lib/intent/intentFusionProfiles";
import { runFusionEngine } from "@/lib/intent/intentFusionEngine";
import {
  applyFusionStabilizationRanking,
  computeFusionReplayIntegrity,
  computeMerchantFairnessScore,
} from "@/lib/intent/intentFusionStabilizer";
import { validateDeterministicFusionReplay } from "@/lib/intent/intentFusionReplay";
import {
  buildFusionAnalytics,
  buildFusionMonitoring,
  type IntentFusionAnalytics,
  type IntentFusionMeta,
  type FusionMonitoring,
} from "@/lib/intent/intentFusionTelemetry";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { FusedCommerceSignals } from "@/lib/intent/intentSignalFusion";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { IntentFusionMeta, IntentFusionAnalytics, FusionMonitoring };

export type IntentFusionApplyResult = {
  products: QuantProduct[];
  meta: IntentFusionMeta;
  signals: FusedCommerceSignals;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function applyControlledIntentFusion(args: {
  products: QuantProduct[];
  query: string;
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): IntentFusionApplyResult {
  const started = Date.now();
  const { products, canonicalQuery, governance, calibration, runtime, orchestration, memory, coordination, preOrderLinks } =
    args;

  const mode = resolveIntentFusionMode();
  const profile = resolveFusionProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runFusionEngine({
    products: baseline,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
    profile,
  });

  const emptyAnalytics: IntentFusionAnalytics = {
    trustValueAnalytics: 0,
    premiumBudgetAnalytics: 0,
    suppressionRecoveryAnalytics: 0,
    diversityPreservationAnalytics: 0,
    continuityAnalytics: 0,
    commerceConfidenceAnalytics: 0,
    comparisonFusionAnalytics: 0,
    rankingStabilizationAnalytics: 0,
    merchantFairnessAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildFusionMonitoring({
    influence: {
      fusionDelta: 0,
      trustFusion: 0,
      valueFusion: 0,
      premiumFusion: 0,
      qualityFusion: 0,
      urgencyFusion: 0,
      suppressionRecovery: 0,
      diversityBalance: 0,
      rankingContinuity: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    signals: engine.signals,
    merchantFairness: 0,
    topDrift: 0,
    profile,
  });

  if (!isIntentFusionEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: INTENT_FUSION_VERSION,
        fusionActive: false,
        fusionProfile: mode,
        fusionScore: 0,
        fusionDelta: 0,
        fusionConfidence: engine.signals.fusionConfidence,
        trustFusion: 0,
        valueFusion: 0,
        premiumFusion: 0,
        qualityFusion: 0,
        urgencyFusion: 0,
        suppressionRecovery: 0,
        diversityBalance: 0,
        rankingContinuity: 0,
        replayIntegrity: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        fusionWarnings: ["fusion_disabled"],
        fusionAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyFusionStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);

  const merchantFairness = computeMerchantFairnessScore(baseline);
  const projectedReplayIntegrity = computeFusionReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > INTENT_FUSION_MAX_DRIFT) anomalies.push("drift_escalation");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-fusion" &&
      (!engine.balance.coordinationStable ||
        !engine.balance.memoryStable ||
        projectedReplayIntegrity < 70));

  const mutationAllowed =
    isIntentFusionMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isIntentFusionShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "confidence-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > INTENT_FUSION_MAX_DRIFT || engine.influence.fusionDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);

  const replayIntegrity = computeFusionReplayIntegrity({
    preLinks,
    postLinks,
    signals: engine.signals,
  });

  const fusionWarnings: string[] = [];
  if (!isIntentFusionEnvironmentAllowed()) fusionWarnings.push("production_fusion_blocked");
  if (engine.balance.routingLane === "confidence-check") fusionWarnings.push("confidence_gate");
  if (coordination.routingLane === "conflict") fusionWarnings.push("coordination_conflict_dampening");

  const analytics = buildFusionAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    balance: engine.balance,
    merchantFairness,
    topDrift,
  });

  const monitoring = buildFusionMonitoring({
    influence: engine.influence,
    replayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    signals: engine.signals,
    merchantFairness,
    topDrift,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: INTENT_FUSION_VERSION,
      fusionActive: isIntentFusionEnabled() && isIntentFusionEnvironmentAllowed(),
      fusionProfile: mode,
      fusionScore: engine.fusionScore,
      fusionDelta: engine.influence.fusionDelta,
      fusionConfidence: engine.signals.fusionConfidence,
      trustFusion: engine.influence.trustFusion,
      valueFusion: engine.influence.valueFusion,
      premiumFusion: engine.influence.premiumFusion,
      qualityFusion: engine.influence.qualityFusion,
      urgencyFusion: engine.influence.urgencyFusion,
      suppressionRecovery: engine.influence.suppressionRecovery,
      diversityBalance: engine.influence.diversityBalance,
      rankingContinuity: engine.influence.rankingContinuity,
      replayIntegrity,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      fusionWarnings: fusionWarnings.slice(0, 10),
      fusionAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicFusionReplay };

export {
  isIntentFusionEnabled,
  isIntentFusionMutationEnabled,
  resolveIntentFusionMode,
  isIntentFusionEnvironmentAllowed,
} from "@/lib/intent/intentFusionFlags";
