/**
 * P5.4 — Fusion engine (deterministic multi-signal synthesis orchestration).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentFusionProfile } from "@/lib/intent/intentFusionProfiles";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import {
  computeFusionBalance,
  computeFusionBlendInfluence,
  type FusionBalanceResult,
  type FusionBlendInfluence,
} from "@/lib/intent/intentFusionBalancer";
import { fuseCommerceSignals, type FusedCommerceSignals } from "@/lib/intent/intentSignalFusion";
import type { QuantProduct } from "@/lib/shoppingScore";

export type FusionEngineResult = {
  signals: FusedCommerceSignals;
  balance: FusionBalanceResult;
  influence: FusionBlendInfluence;
  fusionScore: number;
  anomalies: string[];
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function runFusionEngine(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  profile: IntentFusionProfile;
}): FusionEngineResult {
  const { products, canonicalQuery, governance, calibration, runtime, orchestration, memory, coordination, profile } =
    args;

  const signals = fuseCommerceSignals({
    products,
    canonicalQuery,
    governance,
    calibration,
    runtime,
    orchestration,
    memory,
    coordination,
  });

  const balance = computeFusionBalance({
    signals,
    governance,
    calibration,
    orchestration,
    memory,
    coordination,
    profile,
  });

  const influence = computeFusionBlendInfluence({ signals, balance, profile });

  const anomalies: string[] = [];
  if (profile.requiresGovernancePass && governance.anomalyDetected) anomalies.push("governance_gate");
  if (profile.requiresCoordinationStable && !balance.coordinationStable) anomalies.push("coordination_unstable");
  if (profile.requiresMemoryStable && !balance.memoryStable) anomalies.push("memory_unstable");
  if (influence.fusionDelta > profile.maxDelta) anomalies.push("delta_exceeded");
  if (signals.fusionConfidence < 0.35) anomalies.push("low_confidence");

  const fusionScore = clampScore(
    balance.balanceScore * 0.4 +
      signals.fusionConfidence * 40 +
      (100 - anomalies.length * 12) * 0.2
  );

  return { signals, balance, influence, fusionScore, anomalies };
}
