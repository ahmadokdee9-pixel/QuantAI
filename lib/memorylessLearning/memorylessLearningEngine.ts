/**
 * P6.4 — Memoryless commerce learning engine orchestration.
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import {
  computeMemorylessLearningBalance,
  computeMemorylessLearningBlendInfluence,
  type MemorylessLearningBalanceResult,
  type MemorylessLearningBlendInfluence,
} from "@/lib/memorylessLearning/memorylessLearningBalancer";
import {
  buildMemorylessLearningSignalBundle,
  computeMemorylessLearningConfidence,
  type MemorylessLearningSignalBundle,
} from "@/lib/memorylessLearning/memorylessLearningConfidence";
import { detectMemorylessLearningContradictions, type MemorylessLearningContradictionResult } from "@/lib/memorylessLearning/memorylessLearningContradictions";
import { detectMemorylessLearningSignals, type MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";
import { synthesizeUnifiedMemorylessLearningState } from "@/lib/memorylessLearning/memorylessLearningFusion";
import type { MemorylessCommerceLearningProfile } from "@/lib/memorylessLearning/memorylessLearningProfiles";
import { computeMemorylessLearningStabilization } from "@/lib/memorylessLearning/memorylessLearningStabilization";

export type MemorylessLearningEngineResult = {
  signals: MemorylessLearningSignalBundle;
  detection: MemorylessLearningDetection;
  contradictions: MemorylessLearningContradictionResult;
  balance: MemorylessLearningBalanceResult;
  influence: MemorylessLearningBlendInfluence;
  learningScore: number;
  anomalies: string[];
};

export function runMemorylessLearningEngine(args: {
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  governance: IntentGovernanceMeta;
  profile: MemorylessCommerceLearningProfile;
}): MemorylessLearningEngineResult {
  const detection = detectMemorylessLearningSignals({
    intent: args.intent,
    multiObjective: args.multiObjective,
    strategic: args.strategic,
  });

  const stabilization = computeMemorylessLearningStabilization({
    multiObjective: args.multiObjective,
    strategic: args.strategic,
    detection,
  });

  const state = synthesizeUnifiedMemorylessLearningState({ detection, stabilization });
  const signals = buildMemorylessLearningSignalBundle(state);

  const contradictions = detectMemorylessLearningContradictions({
    state,
    detection,
    strategic: args.strategic,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const learningConfidence = computeMemorylessLearningConfidence({
    signals,
    multiObjective: args.multiObjective,
    strategic: args.strategic,
    detection,
    contradictions,
    governanceDampen,
  });

  const balance = computeMemorylessLearningBalance({
    signals,
    learningConfidence,
    governance: args.governance,
    strategic: args.strategic,
    detection,
    contradictions,
    profile: args.profile,
  });

  const influence = computeMemorylessLearningBlendInfluence({
    signals,
    detection,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresStrategicStable && !balance.strategicStable) anomalies.push("strategic_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.learningDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (learningConfidence < 0.3) anomalies.push("low_confidence");

  const learningScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + learningConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, detection, contradictions, balance, influence, learningScore, anomalies };
}
