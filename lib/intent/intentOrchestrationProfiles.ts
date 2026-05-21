/**
 * P5.1 — Orchestration profile registry per rollout mode.
 */

import type { IntentOrchestrationMode } from "@/lib/intent/intentOrchestrationFlags";
import {
  INTENT_ORCH_MAX_DELTA,
  INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
  INTENT_ORCH_MAX_TRUST_REBALANCE,
} from "@/lib/intent/intentOrchestrationFlags";

export type IntentOrchestrationProfile = {
  id: IntentOrchestrationMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresCalibrationPass: boolean;
  requiresRuntimeStable: boolean;
  maxDelta: number;
  maxTrustRebalance: number;
  maxSuppressionCorrection: number;
  maxDiversityIntervention: number;
};

export const INTENT_ORCHESTRATION_PROFILES: IntentOrchestrationProfile[] = [
  {
    id: "telemetry-only",
    description: "Orchestration telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    requiresRuntimeStable: false,
    maxDelta: INTENT_ORCH_MAX_DELTA,
    maxTrustRebalance: INTENT_ORCH_MAX_TRUST_REBALANCE,
    maxSuppressionCorrection: INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
    maxDiversityIntervention: INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "passive-balance",
    description: "Passive adaptive balancing signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    requiresRuntimeStable: false,
    maxDelta: INTENT_ORCH_MAX_DELTA,
    maxTrustRebalance: INTENT_ORCH_MAX_TRUST_REBALANCE,
    maxSuppressionCorrection: INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
    maxDiversityIntervention: INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "shadow-orchestration",
    description: "Shadow orchestration deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    requiresRuntimeStable: false,
    maxDelta: INTENT_ORCH_MAX_DELTA,
    maxTrustRebalance: INTENT_ORCH_MAX_TRUST_REBALANCE,
    maxSuppressionCorrection: INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
    maxDiversityIntervention: INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "bounded-orchestration",
    description: "Bounded orchestration mutation with drift cap ≤ 2.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresCalibrationPass: false,
    requiresRuntimeStable: true,
    maxDelta: INTENT_ORCH_MAX_DELTA,
    maxTrustRebalance: INTENT_ORCH_MAX_TRUST_REBALANCE,
    maxSuppressionCorrection: INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
    maxDiversityIntervention: INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "protected-runtime",
    description: "Orchestration gated by governance, calibration, and runtime stability.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCalibrationPass: true,
    requiresRuntimeStable: true,
    maxDelta: INTENT_ORCH_MAX_DELTA,
    maxTrustRebalance: INTENT_ORCH_MAX_TRUST_REBALANCE,
    maxSuppressionCorrection: INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
    maxDiversityIntervention: INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  },
  {
    id: "full-safe-orchestration",
    description: "Full orchestration only when all monitors pass.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresCalibrationPass: true,
    requiresRuntimeStable: true,
    maxDelta: INTENT_ORCH_MAX_DELTA,
    maxTrustRebalance: INTENT_ORCH_MAX_TRUST_REBALANCE,
    maxSuppressionCorrection: INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
    maxDiversityIntervention: INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  },
];

export function resolveOrchestrationProfile(mode: IntentOrchestrationMode): IntentOrchestrationProfile {
  return INTENT_ORCHESTRATION_PROFILES.find((p) => p.id === mode) ?? INTENT_ORCHESTRATION_PROFILES[0];
}
