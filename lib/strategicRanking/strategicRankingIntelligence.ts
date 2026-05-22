/**
 * P6.3 — Adaptive strategic ranking intelligence (deterministic bounded synthesis; no personalization).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  ADAPTIVE_STRATEGIC_RANKING_VERSION,
  STRATEGIC_RANKING_MAX_DRIFT,
  isAdaptiveStrategicRankingEnabled,
  isAdaptiveStrategicRankingEnvironmentAllowed,
  isAdaptiveStrategicRankingMutationEnabled,
  isAdaptiveStrategicRankingShadowMode,
  resolveAdaptiveStrategicRankingMode,
} from "@/lib/strategicRanking/strategicRankingFlags";
import { resolveAdaptiveStrategicRankingProfile } from "@/lib/strategicRanking/strategicRankingProfiles";
import { runStrategicRankingEngine } from "@/lib/strategicRanking/strategicRankingEngine";
import {
  applyStrategicRankingStabilization,
  computeStrategicRankingReplayIntegrity,
} from "@/lib/strategicRanking/strategicRankingRanking";
import { validateDeterministicStrategicRankingReplay } from "@/lib/strategicRanking/strategicRankingReplay";
import type { StrategicRankingSignalBundle } from "@/lib/strategicRanking/strategicRankingConfidence";
import {
  buildStrategicRankingAnalytics,
  buildStrategicRankingMonitoring,
  type AdaptiveStrategicRankingAnalytics,
  type AdaptiveStrategicRankingMeta,
  type AdaptiveStrategicRankingMonitoring,
} from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type { AdaptiveStrategicRankingMeta, AdaptiveStrategicRankingAnalytics, AdaptiveStrategicRankingMonitoring };

export type AdaptiveStrategicRankingApplyResult = {
  products: QuantProduct[];
  meta: AdaptiveStrategicRankingMeta;
  signals: StrategicRankingSignalBundle;
};

function countTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

export function applyControlledAdaptiveStrategicRanking(args: {
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
  preOrderLinks?: string[];
  trayId?: string;
}): AdaptiveStrategicRankingApplyResult {
  const started = Date.now();
  const { products, governance, multiObjective, intent, preOrderLinks } = args;

  const mode = resolveAdaptiveStrategicRankingMode();
  const profile = resolveAdaptiveStrategicRankingProfile(mode);
  const baseline = [...products];
  const preLinks = (preOrderLinks ?? baseline.map((p) => p.link || p.title)).slice(0, 5);

  const engine = runStrategicRankingEngine({ multiObjective, intent, governance, profile });

  const emptyAnalytics: AdaptiveStrategicRankingAnalytics = {
    trustValueAnalytics: 0,
    premiumAffordabilityAnalytics: 0,
    conversionStabilityAnalytics: 0,
    aestheticPracticalityAnalytics: 0,
    harmonyAnalytics: 0,
    continuityAnalytics: 0,
    inflationGuardAnalytics: 0,
    trustDominanceAnalytics: 0,
    contradictionAnalytics: 0,
    replayIntegrityAnalytics: 0,
    topDriftCount: 0,
  };

  const emptyMonitoring = buildStrategicRankingMonitoring({
    influence: {
      strategicRankingDelta: 0,
      trustInfluence: 0,
      valueInfluence: 0,
      premiumInfluence: 0,
      affordabilityInfluence: 0,
      conversionInfluence: 0,
      stabilityInfluence: 0,
      aestheticInfluence: 0,
      practicalityInfluence: 0,
      continuityStrength: 0,
    },
    replayIntegrity: 0,
    rollbackTriggered: false,
    balance: engine.balance,
    guards: engine.guards,
    contradictions: engine.contradictions,
    signals: engine.signals,
    topDrift: 0,
    profile,
  });

  if (!isAdaptiveStrategicRankingEnabled()) {
    return {
      products: baseline.map((p, i) => ({ ...p, qiRank: i })),
      signals: engine.signals,
      meta: {
        version: ADAPTIVE_STRATEGIC_RANKING_VERSION,
        strategicRankingActive: false,
        strategicRankingProfile: mode,
        strategicRankingScore: 0,
        strategicRankingDelta: 0,
        strategicRankingConfidence: engine.balance.strategicRankingConfidence,
        trustValueBalance: engine.signals.trustValueBalance,
        premiumAffordabilityBalance: engine.signals.premiumAffordabilityBalance,
        conversionStabilityBalance: engine.signals.conversionStabilityBalance,
        aestheticPracticalityBalance: engine.signals.aestheticPracticalityBalance,
        rankingContinuity: engine.signals.rankingContinuity,
        inflationGuardActive: engine.guards.inflationGuardActive,
        trustDominanceGuardActive: engine.guards.trustDominanceGuardActive,
        contradictionCount: 0,
        routingLane: "hold",
        rollbackTriggered: false,
        strategicWarnings: ["adaptive_strategic_ranking_disabled"],
        strategicAnomalies: [],
        analytics: emptyAnalytics,
        monitoring: emptyMonitoring,
        mutationApplied: false,
        signalHash: engine.signals.signalHash,
        graphExecutionHash: engine.signals.graphExecutionHash,
        latencyMs: Date.now() - started,
      },
    };
  }

  const projected = applyStrategicRankingStabilization({
    products: baseline,
    influence: engine.influence,
    balance: engine.balance,
    signals: engine.signals,
    profile,
  });
  const projectedLinks = projected.map((p) => p.link || p.title);
  const projectedDrift = countTopDrift(preLinks, projectedLinks);
  const projectedReplayIntegrity = computeStrategicRankingReplayIntegrity({
    preLinks,
    postLinks: projectedLinks,
    signals: engine.signals,
  });

  const anomalies = [...engine.anomalies];
  if (projectedDrift > STRATEGIC_RANKING_MAX_DRIFT) anomalies.push("drift_escalation");
  if (engine.contradictions.contradictionCount >= 3) anomalies.push("contradiction_gate");
  if (multiObjective.rollbackTriggered || intent.rollbackTriggered) anomalies.push("upstream_instability");

  const blockMutation =
    anomalies.length > 0 ||
    (profile.id === "full-safe-strategic" && (!engine.balance.multiObjectiveStable || projectedReplayIntegrity < 70));

  const mutationAllowed =
    isAdaptiveStrategicRankingMutationEnabled(mode) &&
    profile.allowsMutation &&
    !blockMutation &&
    !isAdaptiveStrategicRankingShadowMode(mode) &&
    engine.balance.routingLane !== "hold" &&
    engine.balance.routingLane !== "stabilize" &&
    engine.balance.routingLane !== "replay-protect" &&
    engine.balance.routingLane !== "inflation-check" &&
    engine.balance.routingLane !== "trust-check" &&
    engine.balance.routingLane !== "contradiction-check" &&
    engine.balance.routingLane !== "conversion-check";

  let output = baseline;
  let rollbackTriggered = false;
  let mutationApplied = false;

  if (mutationAllowed) {
    output = projected;
    mutationApplied = true;
    const postDrift = countTopDrift(preLinks, output.map((p) => p.link || p.title));
    if (postDrift > STRATEGIC_RANKING_MAX_DRIFT || engine.influence.strategicRankingDelta > profile.maxDelta) {
      output = baseline;
      rollbackTriggered = true;
      mutationApplied = false;
    }
  }

  const postLinks = output.map((p) => p.link || p.title);
  const topDrift = countTopDrift(preLinks, postLinks);
  let replayIntegrity = computeStrategicRankingReplayIntegrity({ preLinks, postLinks, signals: engine.signals });

  if (replayIntegrity < 70 && mutationApplied) {
    output = baseline;
    rollbackTriggered = true;
    mutationApplied = false;
    replayIntegrity = computeStrategicRankingReplayIntegrity({
      preLinks,
      postLinks: output.map((p) => p.link || p.title),
      signals: engine.signals,
    });
  }

  const finalPostLinks = output.map((p) => p.link || p.title);
  const finalReplayIntegrity = computeStrategicRankingReplayIntegrity({
    preLinks,
    postLinks: finalPostLinks,
    signals: engine.signals,
  });

  const strategicWarnings: string[] = [];
  if (!isAdaptiveStrategicRankingEnvironmentAllowed()) strategicWarnings.push("production_strategic_ranking_blocked");
  if (engine.balance.routingLane === "contradiction-check") strategicWarnings.push("contradiction_gate");
  if (engine.guards.inflationGuardActive) strategicWarnings.push("inflation_guard");
  if (engine.guards.trustDominanceGuardActive) strategicWarnings.push("trust_dominance_guard");

  const analytics = buildStrategicRankingAnalytics({
    signals: engine.signals,
    influence: engine.influence,
    guards: engine.guards,
    contradictions: engine.contradictions,
    replayIntegrity: finalReplayIntegrity,
    topDrift,
  });

  const monitoring = buildStrategicRankingMonitoring({
    influence: engine.influence,
    replayIntegrity: finalReplayIntegrity,
    rollbackTriggered,
    balance: engine.balance,
    guards: engine.guards,
    contradictions: engine.contradictions,
    signals: engine.signals,
    topDrift,
    profile,
  });

  return {
    products: output.map((p, i) => ({ ...p, qiRank: i })),
    signals: engine.signals,
    meta: {
      version: ADAPTIVE_STRATEGIC_RANKING_VERSION,
      strategicRankingActive: isAdaptiveStrategicRankingEnabled() && isAdaptiveStrategicRankingEnvironmentAllowed(),
      strategicRankingProfile: mode,
      strategicRankingScore: engine.strategicRankingScore,
      strategicRankingDelta: engine.influence.strategicRankingDelta,
      strategicRankingConfidence: engine.balance.strategicRankingConfidence,
      trustValueBalance: engine.signals.trustValueBalance,
      premiumAffordabilityBalance: engine.signals.premiumAffordabilityBalance,
      conversionStabilityBalance: engine.signals.conversionStabilityBalance,
      aestheticPracticalityBalance: engine.signals.aestheticPracticalityBalance,
      rankingContinuity: engine.signals.rankingContinuity,
      inflationGuardActive: engine.guards.inflationGuardActive,
      trustDominanceGuardActive: engine.guards.trustDominanceGuardActive,
      contradictionCount: engine.contradictions.contradictionCount,
      routingLane: engine.balance.routingLane,
      rollbackTriggered,
      strategicWarnings: strategicWarnings.slice(0, 10),
      strategicAnomalies: anomalies.slice(0, 8),
      analytics,
      monitoring,
      mutationApplied,
      signalHash: engine.signals.signalHash,
      graphExecutionHash: engine.signals.graphExecutionHash,
      latencyMs: Date.now() - started,
    },
  };
}

export { validateDeterministicStrategicRankingReplay };

export {
  isAdaptiveStrategicRankingEnabled,
  isAdaptiveStrategicRankingMutationEnabled,
  resolveAdaptiveStrategicRankingMode,
  isAdaptiveStrategicRankingEnvironmentAllowed,
} from "@/lib/strategicRanking/strategicRankingFlags";

export { ADAPTIVE_STRATEGIC_RANKING_PROFILES } from "@/lib/strategicRanking/strategicRankingProfiles";
