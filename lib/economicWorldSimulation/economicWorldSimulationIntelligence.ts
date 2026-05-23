/**
 * P6.9 — Economic world simulation (deterministic only; no autonomous agents).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceTelemetry";
import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  isEconomicWorldSimulationEnabled,
  isEconomicWorldSimulationEnvironmentAllowed,
  isEconomicWorldSimulationMutationEnabled,
  isEconomicWorldSimulationShadowMode,
  ECONOMIC_WORLD_SIMULATION_VERSION,
  ECONOMIC_WORLD_SIMULATION_MAX_DRIFT,
  resolveEconomicWorldSimulationMode,
} from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";
import { resolveEconomicWorldSimulationProfile } from "@/lib/economicWorldSimulation/economicWorldSimulationProfiles";
import { runEconomicWorldSimulationEngine } from "@/lib/economicWorldSimulation/economicWorldSimulationEngine";
import {
  applyEconomicWorldSimulationStabilizationRanking,
  computeEconomicWorldSimulationReplayIntegrity,
} from "@/lib/economicWorldSimulation/economicWorldSimulationRanking";
import { validateDeterministicEconomicWorldSimulationReplay } from "@/lib/economicWorldSimulation/economicWorldSimulationReplay";
import type { EconomicWorldSimulationSignalBundle } from "@/lib/economicWorldSimulation/economicWorldSimulationConfidence";
import {
  buildEconomicWorldSimulationAnalytics,
  buildEconomicWorldSimulationMonitoring,
  type EconomicWorldSimulationAnalytics,
  type EconomicWorldSimulationMeta,
  type EconomicWorldSimulationMonitoring,
} from "@/lib/economicWorldSimulation/economicWorldSimulationTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { EconomicWorldSimulationMeta, EconomicWorldSimulationAnalytics, EconomicWorldSimulationMonitoring };

export type EconomicWorldSimulationApplyResult = {
  products: QuantProduct[];
  meta: EconomicWorldSimulationMeta;
  signals: EconomicWorldSimulationSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

const CHECK_LANES = new Set([
  "economic-check",
  "momentum-check",
  "ecosystem-check",
  "merchant-check",
  "volatility-check",
  "confidence-check",
  "contradiction-check",
  "system-safe",
  "rollback-safe",
]);

export function applyControlledEconomicWorldSimulation(args: {
  products: QuantProduct[];
  query: string;
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  cognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  preOrderLinks?: string[];
  trayId?: string;
}): EconomicWorldSimulationApplyResult {
  const started = Date.now();
  const { products, governance, cognitiveGovernance, marketReality, commerceDecision, preOrderLinks } = args;

  const mode = resolveEconomicWorldSimulationMode();
  const profile = resolveEconomicWorldSimulationProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runEconomicWorldSimulationEngine({
    cognitiveGovernance,
    marketReality,
    commerceDecision,
    governance,
    profile,
  });

  const emptyAnalytics: EconomicWorldSimulationAnalytics = {
    pressureAnalytics: 0,
    equilibriumAnalytics: 0,
    merchantAnalytics: 0,
    momentumAnalytics: 0,
    durabilityAnalytics: 0,
    fatigueAnalytics: 0,
    ecosystemAnalytics: 0,
    protectionAnalytics: 0,
    continuityAnalytics: 0,
    harmonyAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildEconomicWorldSimulationMonitoring({
    influence: {
      simulationDelta: 0,
      pressureInfluence: 0,
      equilibriumInfluence: 0,
      continuityStabilization: 0,
      durabilityReinforcement: 0,
      momentumSuppression: 0,
      volatilitySuppression: 0,
      recursiveSuppression: 0,
      simulationReinforcement: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    detection: engine.detection,
    governors: engine.governors,
    contradictions: engine.contradictions,
    profile,
  });

  if (!isEconomicWorldSimulationEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: ECONOMIC_WORLD_SIMULATION_VERSION,
        simulationActive: false,
        simulationProfile: mode,
        simulationScore: 0,
        simulationDelta: 0,
        simulationConfidence: engine.balance.simulationConfidence,
        simulationIntegrityScore: engine.detection.simulationIntegrityScore,
        economicPressureDetected: engine.detection.economicPressureDetected,
        demandSupplyInstabilityDetected: engine.detection.demandSupplyInstabilityDetected,
        merchantSurvivabilityRiskDetected: engine.detection.merchantSurvivabilityRiskDetected,
        pricingMomentumDecayDetected: engine.detection.pricingMomentumDecayDetected,
        longTermValueDurabilityRiskDetected: engine.detection.longTermValueDurabilityRiskDetected,
        economicFatigueDetected: engine.detection.economicFatigueDetected,
        fakeMomentumDetected: engine.detection.fakeMomentumDetected,
        unstableEconomyDetected: engine.detection.unstableEconomyDetected,
        economicInstabilityRollback: engine.governors.economicInstabilityRollback,
        fakeMomentumSuppression: engine.governors.fakeMomentumSuppression,
        priceVolatilityBlockade: engine.governors.priceVolatilityBlockade,
        ecosystemCollapseProtection: engine.governors.ecosystemCollapseProtection,
        recursiveEconomicAmplificationSuppression: engine.governors.recursiveEconomicAmplificationSuppression,
        unstableMerchantPressureRollback: engine.governors.unstableMerchantPressureRollback,
        confidenceInflationRollback: engine.governors.confidenceInflationRollback,
        contradictionCascadeProtection: engine.governors.contradictionCascadeProtection,
        pricingPressureBalance: engine.signals.pricingPressureBalance,
        commerceEcosystemEquilibrium: engine.signals.commerceEcosystemEquilibrium,
        simulationContinuity: engine.signals.simulationContinuity,
        longTermValueDurability: engine.signals.longTermValueDurability,
        simulationSnapshotHash: engine.signals.simulationSnapshotHash,
        simulationExecutionHash: engine.signals.simulationExecutionHash,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        simulationWarnings: ["economic_world_simulation_disabled"],
        simulationAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        economicExecutionHash: engine.signals.economicExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyEconomicWorldSimulationStabilizationRanking({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeEconomicWorldSimulationReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > ECONOMIC_WORLD_SIMULATION_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (cognitiveGovernance.rollbackTriggered || marketReality.rollbackTriggered || commerceDecision.rollbackTriggered) {
    anomalies.push("upstream_instability");
  }
  if (engine.governors.ecosystemCollapseProtection) anomalies.push("ecosystem_collapse");
  if (engine.governors.recursiveEconomicAmplificationSuppression) anomalies.push("recursive_amplification");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-simulation" && (!engine.balance.governanceStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isEconomicWorldSimulationMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isEconomicWorldSimulationShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "rollback-safe" &&
    !CHECK_LANES.has(engine.balance.routingLane);

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > ECONOMIC_WORLD_SIMULATION_MAX_DRIFT || engine.influence.simulationDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeEconomicWorldSimulationReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeEconomicWorldSimulationReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeEconomicWorldSimulationReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const simulationWarnings: string[] = [];
  if (!isEconomicWorldSimulationEnvironmentAllowed()) simulationWarnings.push("production_simulation_blocked");
  if (engine.governors.fakeMomentumSuppression) simulationWarnings.push("fake_momentum");
  if (engine.governors.priceVolatilityBlockade) simulationWarnings.push("price_volatility");
  if (engine.balance.routingLane === "contradiction-check") simulationWarnings.push("contradiction_gate");

  const analytics = buildEconomicWorldSimulationAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    detection: engine.detection,
    governors: engine.governors,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildEconomicWorldSimulationMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    detection: engine.detection,
    governors: engine.governors,
    contradictions: engine.contradictions,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: ECONOMIC_WORLD_SIMULATION_VERSION,
      simulationActive: isEconomicWorldSimulationEnabled() && isEconomicWorldSimulationEnvironmentAllowed(),
      simulationProfile: mode,
      simulationScore: engine.simulationScore,
      simulationDelta: engine.influence.simulationDelta,
      simulationConfidence: engine.balance.simulationConfidence,
      simulationIntegrityScore: engine.detection.simulationIntegrityScore,
      economicPressureDetected: engine.detection.economicPressureDetected,
      demandSupplyInstabilityDetected: engine.detection.demandSupplyInstabilityDetected,
      merchantSurvivabilityRiskDetected: engine.detection.merchantSurvivabilityRiskDetected,
      pricingMomentumDecayDetected: engine.detection.pricingMomentumDecayDetected,
      longTermValueDurabilityRiskDetected: engine.detection.longTermValueDurabilityRiskDetected,
      economicFatigueDetected: engine.detection.economicFatigueDetected,
      fakeMomentumDetected: engine.detection.fakeMomentumDetected,
      unstableEconomyDetected: engine.detection.unstableEconomyDetected,
      economicInstabilityRollback: engine.governors.economicInstabilityRollback,
      fakeMomentumSuppression: engine.governors.fakeMomentumSuppression,
      priceVolatilityBlockade: engine.governors.priceVolatilityBlockade,
      ecosystemCollapseProtection: engine.governors.ecosystemCollapseProtection,
      recursiveEconomicAmplificationSuppression: engine.governors.recursiveEconomicAmplificationSuppression,
      unstableMerchantPressureRollback: engine.governors.unstableMerchantPressureRollback,
      confidenceInflationRollback: engine.governors.confidenceInflationRollback,
      contradictionCascadeProtection: engine.governors.contradictionCascadeProtection,
      pricingPressureBalance: engine.signals.pricingPressureBalance,
      commerceEcosystemEquilibrium: engine.signals.commerceEcosystemEquilibrium,
      simulationContinuity: engine.signals.simulationContinuity,
      longTermValueDurability: engine.signals.longTermValueDurability,
      simulationSnapshotHash: engine.signals.simulationSnapshotHash,
      simulationExecutionHash: engine.signals.simulationExecutionHash,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      simulationWarnings: simulationWarnings.slice(0, 10),
      simulationAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      economicExecutionHash: engine.signals.economicExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicEconomicWorldSimulationReplay };

export {
  isEconomicWorldSimulationEnabled,
  isEconomicWorldSimulationMutationEnabled,
  resolveEconomicWorldSimulationMode,
  isEconomicWorldSimulationEnvironmentAllowed,
} from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";

export { ECONOMIC_WORLD_SIMULATION_PROFILES } from "@/lib/economicWorldSimulation/economicWorldSimulationProfiles";
