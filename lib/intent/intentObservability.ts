/**
 * P4.4 — Live production intent intelligence observability (meta-only).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import type { IntentIntelligenceMeta } from "@/lib/intent/intentIntelligenceEngine";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import {
  INTENT_APPLY_MAX_DELTA,
  isIntentApplyBlockedInProduction,
  isIntentApplyHardRollback,
  isIntentIntelligenceApplyEnabled,
  resolveIntentRolloutMode,
} from "@/lib/intent/intentIntelligenceFlags";
import {
  INTENT_OBSERVABILITY_VERSION,
  INTENT_OBS_CONFIDENCE_HIGH,
  INTENT_OBS_CONFIDENCE_LOW,
  INTENT_OBS_INSTABILITY_CEILING,
  INTENT_OBS_MAX_DRIFT,
  INTENT_OBS_SUPPRESSION_RATE_MAX,
  isIntentObservabilityEnabled,
} from "@/lib/intent/intentObservabilityFlags";
import { isFragranceTasteApplyEnabled } from "@/lib/taste/fragranceTasteApply";
import { isFurnitureTasteApplyEnabled } from "@/lib/taste/furnitureTasteApply";
import { isUnifiedTasteApplyEnabled } from "@/lib/taste/unifiedTasteFlags";
import { isWatchTasteApplyEnabled } from "@/lib/taste/watchTasteApply";

export type ConfidenceDistribution = {
  low: number;
  medium: number;
  high: number;
};

export type IntentObservabilityMeta = {
  version: typeof INTENT_OBSERVABILITY_VERSION;
  active: boolean;
  environment: string;
  rolloutMode: ReturnType<typeof resolveIntentRolloutMode>;
  confidenceDistribution: ConfidenceDistribution;
  avgDelta: number;
  suppressionRate: number;
  trustActivationRate: number;
  comparisonActivationRate: number;
  rollbackEvents: number;
  instabilityWarnings: string[];
  integrityPass: boolean;
  driftCount: number;
  rankingStable: boolean;
  crossLayerContamination: boolean;
  overSuppression: boolean;
  rollbackWarning: boolean;
  latencyMs: number;
};

function runtimeEnvironment(): string {
  return process.env.NODE_ENV === "production" ? "production" : "non-production";
}

function confidenceBucket(confidence: number): keyof ConfidenceDistribution {
  if (confidence < INTENT_OBS_CONFIDENCE_LOW) return "low";
  if (confidence >= INTENT_OBS_CONFIDENCE_HIGH) return "high";
  return "medium";
}

function detectCrossLayerContamination(): boolean {
  return (
    isUnifiedTasteApplyEnabled() ||
    isWatchTasteApplyEnabled() ||
    isFragranceTasteApplyEnabled() ||
    isFurnitureTasteApplyEnabled()
  );
}

function countRollbackEvents(productionApply: IntentProductionApplyMeta): number {
  let events = 0;
  if (isIntentApplyHardRollback()) events += 1;
  if (productionApply.blockedInProduction && productionApply.applyEnabled) events += 1;
  if (!productionApply.rollbackAvailable) events += 1;
  return events;
}

export function buildIntentObservabilityMeta(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  intentIntelligence: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  intentProductionApply: IntentProductionApplyMeta;
  products: QuantProduct[];
  preOrderLinks?: string[];
  rankingStable?: boolean;
}): IntentObservabilityMeta {
  const started = Date.now();
  const {
    intentIntelligence,
    intentApply,
    intentProductionApply,
    products,
    preOrderLinks = [],
    rankingStable = true,
  } = args;

  if (!isIntentObservabilityEnabled()) {
    return {
      version: INTENT_OBSERVABILITY_VERSION,
      active: false,
      environment: runtimeEnvironment(),
      rolloutMode: "off",
      confidenceDistribution: { low: 0, medium: 0, high: 0 },
      avgDelta: 0,
      suppressionRate: 0,
      trustActivationRate: 0,
      comparisonActivationRate: 0,
      rollbackEvents: 0,
      instabilityWarnings: ["observability_disabled"],
      integrityPass: true,
      driftCount: 0,
      rankingStable: true,
      crossLayerContamination: false,
      overSuppression: false,
      rollbackWarning: false,
      latencyMs: Date.now() - started,
    };
  }

  const bucket = confidenceBucket(intentIntelligence.confidence);
  const confidenceDistribution: ConfidenceDistribution = { low: 0, medium: 0, high: 0 };
  confidenceDistribution[bucket] = 1;

  const topN = Math.max(1, Math.min(5, products.length));
  const suppressionRate =
    intentApply.applied && topN > 0 ? intentApply.suppressionEvents / topN : 0;

  const trustActivationRate = intentIntelligence.detectedIntents.trust.active ? 1 : 0;
  const uc = intentIntelligence.detectedIntents.urgencyComparison;
  const comparisonActivationRate =
    uc.comparison || uc.alternativeSeeking ? 1 : 0;

  const rollbackEvents = countRollbackEvents(intentProductionApply);
  const driftCount = intentApply.driftCount;
  const avgDelta = intentApply.applied ? intentApply.deltaApplied : 0;

  const crossLayerContamination = detectCrossLayerContamination();
  const overSuppression = suppressionRate > INTENT_OBS_SUPPRESSION_RATE_MAX;
  const excessiveDrift = driftCount > INTENT_OBS_MAX_DRIFT;
  const deltaOverCap = avgDelta > INTENT_APPLY_MAX_DELTA;
  const applySwitchOn = process.env.INTENT_INTELLIGENCE_APPLY_ENABLED === "true";
  const rollbackWarning =
    isIntentApplyHardRollback() ||
    rollbackEvents > 0 ||
    (applySwitchOn && isIntentApplyBlockedInProduction()) ||
    (applySwitchOn && !isIntentIntelligenceApplyEnabled() && intentProductionApply.blockedInProduction);

  const instabilityWarnings: string[] = [];
  if (excessiveDrift) instabilityWarnings.push("excessive_ranking_drift");
  if (!rankingStable) instabilityWarnings.push("unstable_rerank");
  if (crossLayerContamination) instabilityWarnings.push("cross_layer_contamination");
  if (overSuppression) instabilityWarnings.push("over_suppression");
  if (deltaOverCap) instabilityWarnings.push("delta_over_cap");
  if (rollbackWarning) instabilityWarnings.push("rollback_auto_warning");
  if (!intentApply.integrityPass) instabilityWarnings.push("institutional_integrity_fail");
  if (intentApply.applied && !isIntentIntelligenceApplyEnabled()) {
    instabilityWarnings.push("hidden_activation_path");
  }

  const integrityPass =
    instabilityWarnings.length <= INTENT_OBS_INSTABILITY_CEILING &&
    !excessiveDrift &&
    !crossLayerContamination &&
    !deltaOverCap &&
    rankingStable;

  return {
    version: INTENT_OBSERVABILITY_VERSION,
    active: intentIntelligence.active,
    environment: runtimeEnvironment(),
    rolloutMode: resolveIntentRolloutMode(),
    confidenceDistribution,
    avgDelta,
    suppressionRate: Math.round(suppressionRate * 1000) / 1000,
    trustActivationRate,
    comparisonActivationRate,
    rollbackEvents,
    instabilityWarnings,
    integrityPass,
    driftCount,
    rankingStable,
    crossLayerContamination,
    overSuppression,
    rollbackWarning,
    latencyMs: Date.now() - started,
  };
}

export {
  INTENT_OBS_MAX_DRIFT,
  INTENT_OBS_INSTABILITY_CEILING,
  INTENT_OBS_SUPPRESSION_RATE_MAX,
  isIntentObservabilityEnabled,
};
