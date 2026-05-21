/**
 * P5.0 — Runtime safety monitors, rollback triggers, emergency shutdown.
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import {
  INTENT_RUNTIME_HARD_ROLLBACK_DRIFT,
  isIntentRuntimeEmergencyShutdown,
  isIntentRuntimeHardRollback,
  type IntentRuntimeMode,
} from "@/lib/intent/intentRuntimeFlags";
import { resolveRuntimeProfile, type IntentRuntimeProfile } from "@/lib/intent/intentRuntimeProfiles";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";

export type RuntimeSafetyInput = {
  mode: IntentRuntimeMode;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  observability: IntentObservabilityMeta;
  products: QuantProduct[];
  rankingStable: boolean;
  projectedDrift: number;
  runtimeDeltaMax: number;
  trustAppliedMax: number;
  suppressionAppliedCount: number;
};

export type RuntimeSafetyResult = {
  profile: IntentRuntimeProfile;
  instabilityDetected: boolean;
  driftOverflow: boolean;
  overSuppression: boolean;
  trustInflation: boolean;
  merchantDomination: boolean;
  shouldRollback: boolean;
  emergencyShutdown: boolean;
  blockMutation: boolean;
  warnings: string[];
  anomalies: string[];
};

function topMerchantCount(products: QuantProduct[], n = 5): number {
  return new Set(products.slice(0, n).map((p) => p.store.toLowerCase().trim())).size;
}

export function evaluateRuntimeSafety(input: RuntimeSafetyInput): RuntimeSafetyResult {
  const {
    mode,
    governance,
    calibration,
    observability,
    products,
    rankingStable,
    projectedDrift,
    runtimeDeltaMax,
    trustAppliedMax,
    suppressionAppliedCount,
  } = input;

  const profile = resolveRuntimeProfile(mode);
  const warnings: string[] = [];
  const anomalies: string[] = [];

  const emergencyShutdown =
    isIntentRuntimeEmergencyShutdown() || isIntentRuntimeHardRollback();
  const instabilityDetected = !rankingStable || governance.monitoring.rankingInstability;
  const driftOverflow = projectedDrift > INTENT_RUNTIME_HARD_ROLLBACK_DRIFT || observability.driftCount > INTENT_RUNTIME_HARD_ROLLBACK_DRIFT;
  const overSuppression =
    suppressionAppliedCount > 3 ||
    observability.overSuppression ||
    governance.monitoring.suppressionAnomaly;
  const trustInflation = trustAppliedMax > profile.trustBoostCap || calibration.monitoring.trustOverweight;
  const merchantDomination = topMerchantCount(products) < 2 && products.length >= 3;

  if (instabilityDetected) warnings.push("runtime_instability");
  if (driftOverflow) warnings.push("drift_overflow");
  if (overSuppression) warnings.push("over_suppression");
  if (trustInflation) warnings.push("trust_inflation");
  if (merchantDomination) warnings.push("merchant_domination");

  if (profile.requiresGovernancePass && governance.anomalyDetected) {
    anomalies.push("governance_anomaly");
  }
  if (profile.requiresCalibrationPass && calibration.monitoring.unstableCalibration) {
    anomalies.push("unstable_calibration");
  }
  if (runtimeDeltaMax > profile.maxDelta) anomalies.push("delta_cap_exceeded");

  let blockMutation = emergencyShutdown;
  if (profile.requiresGovernancePass && governance.governanceScore < 55) blockMutation = true;
  if (profile.requiresCalibrationPass && calibration.calibrationScore < 55) blockMutation = true;
  if (mode === "full-safe-runtime" && (instabilityDetected || driftOverflow || overSuppression)) {
    blockMutation = true;
  }

  const shouldRollback =
    emergencyShutdown ||
    driftOverflow ||
    (mode === "full-safe-runtime" && anomalies.length > 0) ||
    runtimeDeltaMax > profile.maxDelta;

  if (shouldRollback) anomalies.push("rollback_auto_trigger");

  return {
    profile,
    instabilityDetected,
    driftOverflow,
    overSuppression,
    trustInflation,
    merchantDomination,
    shouldRollback,
    emergencyShutdown,
    blockMutation,
    warnings,
    anomalies,
  };
}

export type RuntimeMonitoring = {
  runtimeInstability: boolean;
  driftOverflow: boolean;
  deterministicReplayReady: boolean;
  rankingMutationValid: boolean;
  suppressionAnomaly: boolean;
  trustRisk: boolean;
};

export function buildRuntimeMonitoring(args: {
  safety: RuntimeSafetyResult;
  rankingStable: boolean;
  mutationApplied: boolean;
  driftCount: number;
}): RuntimeMonitoring {
  const { safety, rankingStable, mutationApplied, driftCount } = args;
  return {
    runtimeInstability: safety.instabilityDetected,
    driftOverflow: safety.driftOverflow || driftCount > INTENT_RUNTIME_HARD_ROLLBACK_DRIFT,
    deterministicReplayReady: rankingStable,
    rankingMutationValid: mutationApplied ? driftCount <= INTENT_RUNTIME_HARD_ROLLBACK_DRIFT : true,
    suppressionAnomaly: safety.overSuppression,
    trustRisk: safety.trustInflation,
  };
}
