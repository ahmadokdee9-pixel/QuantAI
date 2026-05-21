/**
 * P5.1 — Adaptive bounded intelligence orchestration (multi-layer stabilization).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import {
  computeAdaptiveBalance,
  computeOrchestrationProductAdjustments,
} from "@/lib/intent/intentAdaptiveBalancer";
import {
  INTENT_ORCH_MAX_DELTA,
  INTENT_ORCH_MAX_DRIFT,
  INTENT_ORCHESTRATION_VERSION,
  isIntentOrchestrationEnabled,
  isIntentOrchestrationEnvironmentAllowed,
  isIntentOrchestrationMutationEnabled,
  isIntentOrchestrationShadowMode,
  resolveIntentOrchestrationMode,
  type IntentOrchestrationMode,
} from "@/lib/intent/intentOrchestrationFlags";
import { resolveOrchestrationProfile } from "@/lib/intent/intentOrchestrationProfiles";
import {
  buildOrchestrationMonitoring,
  coordinateRuntimeSignals,
  type OrchestrationMonitoring,
} from "@/lib/intent/intentRuntimeCoordinator";
import type { QuantProduct } from "@/lib/shoppingScore";

export type IntentOrchestrationAnalytics = {
  signalConflictAnalysis: number;
  balancingEffectiveness: number;
  rankingStabilizationAnalysis: number;
  confidenceVarianceAnalysis: number;
  trustRiskReductionMetrics: number;
  suppressionRecoveryMetrics: number;
  merchantFairnessMetrics: number;
  orchestrationDriftTrends: number;
  topDriftCount: number;
};

export type IntentOrchestrationMeta = {
  version: typeof INTENT_ORCHESTRATION_VERSION;
  orchestrationActive: boolean;
  orchestrationProfile: IntentOrchestrationMode;
  orchestrationScore: number;
  orchestrationDelta: number;
  adaptiveBalanceScore: number;
  confidenceNormalization: number;
  trustBalance: number;
  suppressionBalance: number;
  diversityBalance: number;
  stabilizationScore: number;
  driftCompensation: number;
  orchestrationWarnings: string[];
  orchestrationAnomalies: string[];
  rollbackTriggered: boolean;
  analytics: IntentOrchestrationAnalytics;
  monitoring: OrchestrationMonitoring;
  mutationApplied: boolean;
  routingLane: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

function applyDeterministicOrchestrationRanking(args: {
  products: QuantProduct[];
  adjustments: { index: number; adjustment: number }[];
}): QuantProduct[] {
  const { products, adjustments } = args;
  if (products.length <= 1) return products;

  const scored = products.map((p, index) => {
    const adj = adjustments.find((a) => a.index === index)?.adjustment ?? 0;
    const base = (products.length - index) * 10;
    return { p, index, score: Math.round((base + adj) * 1000) / 1000 };
  });

  return scored
    .sort((a, b) => {
      const d = b.score - a.score;
      if (Math.abs(d) > 0.0001) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);
}

function evaluateOrchestrationSafety(args: {
  profile: ReturnType<typeof resolveOrchestrationProfile>;
  coordinated: ReturnType<typeof coordinateRuntimeSignals>;
  balance: ReturnType<typeof computeAdaptiveBalance>;
  runtime: IntentRuntimeMeta;
  orchestrationDelta: number;
  projectedDrift: number;
}): { blockMutation: boolean; shouldRollback: boolean; anomalies: string[] } {
  const { profile, coordinated, balance, runtime, orchestrationDelta, projectedDrift } = args;
  const anomalies: string[] = [];

  if (profile.requiresGovernancePass && !coordinated.governanceClear) anomalies.push("governance_gate");
  if (profile.requiresCalibrationPass && !coordinated.calibrationStable) anomalies.push("calibration_gate");
  if (profile.requiresRuntimeStable && !coordinated.runtimeStable) anomalies.push("runtime_unstable");
  if (orchestrationDelta > profile.maxDelta) anomalies.push("delta_exceeded");
  if (projectedDrift > INTENT_ORCH_MAX_DRIFT) anomalies.push("drift_escalation");
  if (runtime.emergencyShutdown) anomalies.push("runtime_emergency");

  let blockMutation = anomalies.length > 0;
  if (profile.id === "full-safe-orchestration" && (balance.signalConflicts.length > 0 || !coordinated.runtimeStable)) {
    blockMutation = true;
  }

  const shouldRollback =
    projectedDrift > INTENT_ORCH_MAX_DRIFT ||
    orchestrationDelta > profile.maxDelta ||
    (profile.id === "full-safe-orchestration" && anomalies.length > 0);

  return { blockMutation, shouldRollback, anomalies };
}

function buildOrchestrationAnalytics(args: {
  balance: ReturnType<typeof computeAdaptiveBalance>;
  coordinated: ReturnType<typeof coordinateRuntimeSignals>;
  runtime: IntentRuntimeMeta;
  orchestrationDrift: number;
  rollbackTriggered: boolean;
}): IntentOrchestrationAnalytics {
  const { balance, coordinated, runtime, orchestrationDrift, rollbackTriggered } = args;
  return {
    signalConflictAnalysis: clampScore(100 - balance.signalConflicts.length * 18),
    balancingEffectiveness: balance.adaptiveBalanceScore,
    rankingStabilizationAnalysis: balance.stabilizationScore,
    confidenceVarianceAnalysis: clampScore(balance.confidenceNormalization * 100),
    trustRiskReductionMetrics: clampScore(runtime.analytics.trustImpactAnalysis * 0.5 + balance.trustBalance * 30),
    suppressionRecoveryMetrics: clampScore(runtime.analytics.suppressionPrecisionImpact),
    merchantFairnessMetrics: clampScore(balance.diversityBalance * 55),
    orchestrationDriftTrends: clampScore(100 - orchestrationDrift * 25 - (rollbackTriggered ? 20 : 0)),
    topDriftCount: orchestrationDrift,
  };
}

export type IntentOrchestrationApplyResult = {
  products: QuantProduct[];
  meta: IntentOrchestrationMeta;
};

export function applyControlledIntentOrchestration(args: {
  products: QuantProduct[];
  evaluation: IntentEvaluationMeta;
  optimization: IntentOptimizationMeta;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  preOrderLinks?: string[];
}): IntentOrchestrationApplyResult {
  const started = Date.now();
  const { products, evaluation, optimization, governance, calibration, runtime, preOrderLinks } = args;

  const mode = resolveIntentOrchestrationMode();
  const profile = resolveOrchestrationProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const emptyAnalytics: IntentOrchestrationAnalytics = {
    signalConflictAnalysis: 0,
    balancingEffectiveness: 0,
    rankingStabilizationAnalysis: 0,
    confidenceVarianceAnalysis: 0,
    trustRiskReductionMetrics: 0,
    suppressionRecoveryMetrics: 0,
    merchantFairnessMetrics: 0,
    orchestrationDriftTrends: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildOrchestrationMonitoring({
    balance: {
      adaptiveBalanceScore: 0,
      confidenceNormalization: 0,
      trustBalance: 0,
      suppressionBalance: 0,
      diversityBalance: 0,
      stabilizationScore: 0,
      driftCompensation: 0,
      signalConflicts: [],
      warnings: [],
    },
    runtime,
    coordinated: {
      runtimeStable: false,
      governanceClear: false,
      calibrationStable: false,
      optimizationRiskLow: false,
      evaluationQualityOk: false,
      coordinatedScore: 0,
      dampeningFactor: 1,
      routingLane: "hold",
    },
    orchestrationDrift: 0,
    rollbackTriggered: false,
  });

  if (!isIntentOrchestrationEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      meta: {
        version: INTENT_ORCHESTRATION_VERSION,
        orchestrationActive: false,
        orchestrationProfile: mode,
        orchestrationScore: 0,
        orchestrationDelta: 0,
        adaptiveBalanceScore: 0,
        confidenceNormalization: 0,
        trustBalance: 0,
        suppressionBalance: 0,
        diversityBalance: 0,
        stabilizationScore: 0,
        driftCompensation: 0,
        orchestrationWarnings: ["orchestration_disabled"],
        orchestrationAnomalies: [],
        rollbackTriggered: false,
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        routingLane: "hold",
        latencyMs: Date.now() - started,
      },
    };
  }

  const balance = computeAdaptiveBalance({ evaluation, governance, calibration, runtime, products: baseline });
  const coordinated = coordinateRuntimeSignals({
    evaluation,
    optimization,
    governance,
    calibration,
    runtime,
    balance,
    profile,
  });

  const rawAdjustments = computeOrchestrationProductAdjustments({ products: baseline, balance, profile });
  const adjustments = rawAdjustments.map((a) => ({
    index: a.index,
    adjustment: Math.round(a.adjustment * coordinated.dampeningFactor * 1000) / 1000,
  }));

  const orchestrationDelta = Math.min(
    INTENT_ORCH_MAX_DELTA,
    Math.round(Math.max(...adjustments.map((a) => Math.abs(a.adjustment)), 0) * 10) / 10
  );

  const projected = applyDeterministicOrchestrationRanking({ products: baseline, adjustments });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);

  const safety = evaluateOrchestrationSafety({
    profile,
    coordinated,
    balance,
    runtime,
    orchestrationDelta,
    projectedDrift,
  });

  const mutationAllowed =
    isIntentOrchestrationMutationEnabled(mode) &&
    profile.allowsMutation &&
    !safety.blockMutation &&
    !isIntentOrchestrationShadowMode(mode) &&
    coordinated.routingLane !== "hold";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (safety.shouldRollback || postDrift > INTENT_ORCH_MAX_DRIFT) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const orchestrationDrift = countTopDrift(preLinks, postLinks);

  const orchestrationWarnings = [...balance.warnings];
  if (!isIntentOrchestrationEnvironmentAllowed()) orchestrationWarnings.push("production_orchestration_blocked");
  if (coordinated.routingLane === "stabilize") orchestrationWarnings.push("instability_dampening");
  if (coordinated.routingLane === "correct") orchestrationWarnings.push("precision_correction");

  const orchestrationScore = clampScore(
    coordinated.coordinatedScore * 0.4 + balance.adaptiveBalanceScore * 0.35 + (100 - orchestrationDrift * 20) * 0.25
  );

  const analytics = buildOrchestrationAnalytics({
    balance,
    coordinated,
    runtime,
    orchestrationDrift,
    rollbackTriggered,
  });

  const monitoring = buildOrchestrationMonitoring({
    balance,
    runtime,
    coordinated,
    orchestrationDrift,
    rollbackTriggered,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    meta: {
      version: INTENT_ORCHESTRATION_VERSION,
      orchestrationActive: isIntentOrchestrationEnabled() && isIntentOrchestrationEnvironmentAllowed(),
      orchestrationProfile: mode,
      orchestrationScore,
      orchestrationDelta,
      adaptiveBalanceScore: balance.adaptiveBalanceScore,
      confidenceNormalization: balance.confidenceNormalization,
      trustBalance: balance.trustBalance,
      suppressionBalance: balance.suppressionBalance,
      diversityBalance: balance.diversityBalance,
      stabilizationScore: balance.stabilizationScore,
      driftCompensation: balance.driftCompensation,
      orchestrationWarnings: orchestrationWarnings.slice(0, 10),
      orchestrationAnomalies: [...safety.anomalies, ...balance.signalConflicts].slice(0, 8),
      rollbackTriggered,
      analytics,
      monitoring,
      mutationApplied,
      routingLane: coordinated.routingLane,
      latencyMs: Date.now() - started,
    },
  };
}

export function validateDeterministicOrchestrationReplay(
  runA: IntentOrchestrationApplyResult,
  runB: IntentOrchestrationApplyResult
): boolean {
  const linksA = runA.products.map((p) => p.link || p.title).join("|");
  const linksB = runB.products.map((p) => p.link || p.title).join("|");
  if (linksA !== linksB) return false;
  const metaA = { ...runA.meta, latencyMs: 0 };
  const metaB = { ...runB.meta, latencyMs: 0 };
  return JSON.stringify(metaA) === JSON.stringify(metaB);
}

export {
  isIntentOrchestrationEnabled,
  isIntentOrchestrationMutationEnabled,
  resolveIntentOrchestrationMode,
  isIntentOrchestrationEnvironmentAllowed,
};
