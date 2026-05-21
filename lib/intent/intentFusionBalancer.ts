/**
 * P5.4 — Fusion balancer (bounded weighted blending with upstream dampening).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionProfile } from "@/lib/intent/intentFusionProfiles";
import type { IntentFusionRoutingLane } from "@/lib/intent/intentFusionFlags";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { FusedCommerceSignals } from "@/lib/intent/intentSignalFusion";

export type FusionBalanceResult = {
  routingLane: IntentFusionRoutingLane;
  governanceDampen: number;
  calibrationScale: number;
  orchestrationStable: boolean;
  memoryStable: boolean;
  coordinationStable: boolean;
  balanceScore: number;
};

export type FusionBlendInfluence = {
  fusionDelta: number;
  trustFusion: number;
  valueFusion: number;
  premiumFusion: number;
  qualityFusion: number;
  urgencyFusion: number;
  suppressionRecovery: number;
  diversityBalance: number;
  rankingContinuity: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveFusionRoutingLane(args: {
  signals: FusedCommerceSignals;
  coordination: IntentCoordinationMeta;
  orchestration: IntentOrchestrationMeta;
  governance: IntentGovernanceMeta;
}): IntentFusionRoutingLane {
  const { signals, coordination, orchestration, governance } = args;

  if (governance.anomalyDetected || orchestration.monitoring.orchestrationInstability) return "stabilize";
  if (coordination.routingLane === "conflict") return "balance";
  if (orchestration.monitoring.suppressionImbalance) return "suppress";
  if (signals.comparisonQuality >= 0.6) return "compare";
  if (signals.fusionConfidence < 0.45) return "confidence-check";
  if (coordination.routingLane === "reinforce") return "reinforce";
  if (orchestration.monitoring.suppressionImbalance === false && signals.suppression > 0.5) return "recover";
  if (signals.trust >= 0.5 && signals.value >= 0.4) return "balance";
  return "hold";
}

export function computeFusionBalance(args: {
  signals: FusedCommerceSignals;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  profile: IntentFusionProfile;
}): FusionBalanceResult {
  const { signals, governance, calibration, orchestration, memory, coordination, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const calibrationScale = clamp(calibration.calibrationScore / 100, 0.5, 1);
  const orchestrationStable =
    !orchestration.monitoring.orchestrationInstability &&
    !orchestration.rollbackTriggered &&
    orchestration.stabilizationScore >= 50;
  const memoryStable = !memory.rollbackTriggered && memory.replayMemoryIntegrity >= 50;
  const coordinationStable =
    !coordination.rollbackTriggered && coordination.reasoningStability >= 50 && coordination.graphIntegrity >= 50;

  const routingLane = resolveFusionRoutingLane({ signals, coordination, orchestration, governance });

  const balanceScore = Math.min(
    100,
    Math.round(
      signals.fusionConfidence * 40 +
        orchestration.orchestrationScore * 0.2 +
        memory.memoryScore * 0.15 +
        coordination.coordinationScore * 0.15 +
        calibration.calibrationScore * 0.1
    )
  );

  return {
    routingLane: !profile.allowsMutation ? "hold" : routingLane,
    governanceDampen,
    calibrationScale,
    orchestrationStable,
    memoryStable,
    coordinationStable,
    balanceScore,
  };
}

export function computeFusionBlendInfluence(args: {
  signals: FusedCommerceSignals;
  balance: FusionBalanceResult;
  profile: IntentFusionProfile;
}): FusionBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen * balance.calibrationScale;

  const trustFusion = clamp(signals.trust * profile.maxTrustAmplification * damp, 0, profile.maxTrustAmplification);
  const valueFusion = clamp(signals.value * 0.7 * damp, 0, profile.maxDelta);
  const premiumFusion = clamp(
    signals.premium * profile.maxPremiumAmplification * damp,
    0,
    profile.maxPremiumAmplification
  );
  const qualityFusion = clamp(signals.quality * 0.65 * damp, 0, profile.maxDelta);
  const urgencyFusion = clamp(signals.urgency * 0.55 * damp, 0, profile.maxDelta);
  const suppressionRecovery = clamp(
    signals.suppression * profile.maxSuppressionRecovery * damp * 0.5,
    0,
    profile.maxSuppressionRecovery
  );
  const diversityBalance = clamp(
    signals.diversity * profile.maxDiversityIntervention * damp,
    0,
    profile.maxDiversityIntervention
  );
  const rankingContinuity = clamp(signals.rankingContinuity * damp, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "reinforce"
      ? 1.05
      : balance.routingLane === "balance"
        ? 1
        : balance.routingLane === "suppress" || balance.routingLane === "confidence-check"
          ? 0.85
          : 0.95;

  const fusionDelta = clamp(
    (trustFusion + valueFusion + premiumFusion + qualityFusion + urgencyFusion + suppressionRecovery + diversityBalance) *
      0.12 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    fusionDelta: round3(fusionDelta),
    trustFusion: round3(trustFusion),
    valueFusion: round3(valueFusion),
    premiumFusion: round3(premiumFusion),
    qualityFusion: round3(qualityFusion),
    urgencyFusion: round3(urgencyFusion),
    suppressionRecovery: round3(suppressionRecovery),
    diversityBalance: round3(diversityBalance),
    rankingContinuity: round3(rankingContinuity),
  };
}
