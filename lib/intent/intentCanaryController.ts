/**
 * P4.5 — Controlled real-production canary rollout controller.
 * Bounded, reversible, deterministic session buckets; no autonomous ranking.
 */

import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import { INTENT_OBS_INSTABILITY_CEILING, INTENT_OBS_MAX_DRIFT, INTENT_OBS_SUPPRESSION_RATE_MAX } from "@/lib/intent/intentObservabilityFlags";
import {
  INTENT_CANARY_BUCKET_COUNT,
  INTENT_CANARY_HASH_SALT,
  INTENT_CANARY_STAGES,
  INTENT_CANARY_VERSION,
  type IntentCanaryRolloutStage,
} from "@/lib/intent/intentCanaryFlags";
import {
  isIntentApplyBlockedInProduction,
  isIntentApplyHardRollback,
  isIntentCanaryApplyOptIn,
  isIntentIntelligenceMetaEnabled,
  isIntentProdApplyOptIn,
  resolveIntentRolloutMode,
} from "@/lib/intent/intentIntelligenceFlags";

export type IntentCanaryActivationBuckets = {
  bucketId: number;
  totalBuckets: number;
  activeBuckets: number;
  inCanary: boolean;
};

export type IntentCanaryMeta = {
  version: typeof INTENT_CANARY_VERSION;
  active: boolean;
  canaryPercentage: number;
  activationBuckets: IntentCanaryActivationBuckets;
  rolloutStage: IntentCanaryRolloutStage | null;
  emergencyDisable: boolean;
  rollbackReason: string | null;
  sessionKey: string;
  applyEligible: boolean;
  canaryHealthScore: number;
  driftTrend: number;
  activationQualityScore: number;
  rollbackReadinessScore: number;
  autoRollbackTriggered: boolean;
  instabilityAutoDisable: boolean;
  suppressionAnomalyWarning: boolean;
  latencyMs: number;
};

let activeCanarySessionKey: string | null = null;

export function setIntentCanarySessionKey(key: string | null): void {
  activeCanarySessionKey = key?.trim() || null;
}

export function getIntentCanarySessionKey(): string | null {
  return activeCanarySessionKey;
}

/** Stable session id: authenticated user > request fingerprint > query hash. */
export function resolveIntentCanarySessionKey(args: {
  userId?: string | null;
  requestId?: string | null;
  query?: string;
}): string {
  const q = (args.query ?? "").trim().toLowerCase().slice(0, 120);
  if (args.userId?.trim()) return `user:${args.userId.trim()}`;
  if (args.requestId?.trim() && args.requestId !== "unknown") return `req:${args.requestId.trim()}`;
  return `query:${fnv1aHex(q || "anonymous")}`;
}

function fnv1aHex(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Deterministic bucket 0..99 from session key. */
export function hashSessionToBucket(sessionKey: string): number {
  const raw = fnv1aHex(`${INTENT_CANARY_HASH_SALT}:${sessionKey}`);
  return parseInt(raw.slice(0, 8), 16) % INTENT_CANARY_BUCKET_COUNT;
}

export function isIntentCanaryEmergencyDisabled(): boolean {
  return process.env.INTENT_CANARY_EMERGENCY_DISABLE === "true";
}

export function resolveCanaryRolloutStage(): IntentCanaryRolloutStage | null {
  const raw = process.env.INTENT_CANARY_ROLLOUT_STAGE?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return (INTENT_CANARY_STAGES as readonly number[]).includes(n) ? (n as IntentCanaryRolloutStage) : null;
}

export function resolveCanaryPercentage(): number {
  if (isIntentCanaryEmergencyDisabled()) return 0;
  const stage = resolveCanaryRolloutStage();
  if (stage != null) return stage;
  const raw = Number.parseInt(process.env.INTENT_CANARY_PERCENTAGE ?? "0", 10);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw));
}

export function isSessionInCanaryBucket(sessionKey: string, percentage?: number): boolean {
  const pct = percentage ?? resolveCanaryPercentage();
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  return hashSessionToBucket(sessionKey) < pct;
}

export function buildActivationBuckets(sessionKey: string, percentage?: number): IntentCanaryActivationBuckets {
  const pct = percentage ?? resolveCanaryPercentage();
  const bucketId = hashSessionToBucket(sessionKey);
  const activeBuckets = Math.min(INTENT_CANARY_BUCKET_COUNT, Math.max(0, pct));
  return {
    bucketId,
    totalBuckets: INTENT_CANARY_BUCKET_COUNT,
    activeBuckets,
    inCanary: bucketId < activeBuckets,
  };
}

export type CanarySafeguardResult = {
  blocked: boolean;
  autoRollbackTriggered: boolean;
  instabilityAutoDisable: boolean;
  suppressionAnomalyWarning: boolean;
  rollbackReason: string | null;
};

export function evaluateCanarySafeguards(
  observability?: Pick<
    IntentObservabilityMeta,
    | "driftCount"
    | "instabilityWarnings"
    | "suppressionRate"
    | "integrityPass"
    | "rollbackWarning"
    | "overSuppression"
  >
): CanarySafeguardResult {
  if (!observability) {
    return {
      blocked: false,
      autoRollbackTriggered: false,
      instabilityAutoDisable: false,
      suppressionAnomalyWarning: false,
      rollbackReason: null,
    };
  }

  const warnings = observability.instabilityWarnings ?? [];
  const driftExceeded = observability.driftCount > INTENT_OBS_MAX_DRIFT;
  const instabilityAutoDisable =
    !observability.integrityPass || warnings.length > INTENT_OBS_INSTABILITY_CEILING;
  const suppressionAnomalyWarning =
    observability.overSuppression || observability.suppressionRate > INTENT_OBS_SUPPRESSION_RATE_MAX;
  const autoRollbackTriggered =
    driftExceeded || instabilityAutoDisable || observability.rollbackWarning === true;

  let rollbackReason: string | null = null;
  if (driftExceeded) rollbackReason = "drift_ceiling_enforced";
  else if (instabilityAutoDisable) rollbackReason = "instability_auto_disable";
  else if (observability.rollbackWarning) rollbackReason = "rollback_warning";
  else if (suppressionAnomalyWarning) rollbackReason = "suppression_anomaly_warning";

  const blocked = autoRollbackTriggered && (driftExceeded || instabilityAutoDisable);

  return {
    blocked,
    autoRollbackTriggered,
    instabilityAutoDisable,
    suppressionAnomalyWarning,
    rollbackReason,
  };
}

function computeCanaryHealthScore(args: {
  observability?: IntentObservabilityMeta;
  safeguards: CanarySafeguardResult;
  inCanary: boolean;
}): number {
  const { observability, safeguards, inCanary } = args;
  let score = inCanary ? 72 : 88;
  if (observability?.integrityPass) score += 12;
  else score -= 18;
  score -= (observability?.instabilityWarnings.length ?? 0) * 4;
  if (safeguards.autoRollbackTriggered) score -= 22;
  if (safeguards.suppressionAnomalyWarning) score -= 8;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function computeActivationQualityScore(args: {
  observability?: IntentObservabilityMeta;
  applyEligible: boolean;
}): number {
  const { observability, applyEligible } = args;
  if (!applyEligible) return 40;
  const conf =
    (observability?.confidenceDistribution.high ?? 0) * 1 +
    (observability?.confidenceDistribution.medium ?? 0) * 0.6;
  let score = 55 + conf * 25;
  if (observability?.integrityPass) score += 15;
  if ((observability?.avgDelta ?? 0) <= 3) score += 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function computeRollbackReadinessScore(safeguards: CanarySafeguardResult): number {
  let score = 92;
  if (safeguards.autoRollbackTriggered) score -= 28;
  if (safeguards.instabilityAutoDisable) score -= 18;
  if (isIntentApplyHardRollback()) score = 100;
  if (isIntentCanaryEmergencyDisabled()) score = 100;
  return Math.min(100, Math.max(0, score));
}

/**
 * Whether bounded intent apply runs for this session (production canary gating).
 */
export function isIntentIntelligenceApplyEnabled(sessionKey?: string | null): boolean {
  if (!isIntentIntelligenceMetaEnabled()) return false;
  if (isIntentApplyHardRollback()) return false;
  if (process.env.INTENT_INTELLIGENCE_APPLY_ENABLED !== "true") return false;

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!isIntentCanaryApplyOptIn() && !isIntentProdApplyOptIn()) {
    return false;
  }

  if (isIntentCanaryEmergencyDisabled()) return false;

  const pct = resolveCanaryPercentage();

  if (isIntentProdApplyOptIn() && pct >= 100) return true;
  if (isIntentCanaryApplyOptIn() && pct >= 100) return true;

  const key = sessionKey ?? activeCanarySessionKey;
  if (!key) return false;

  if (!isIntentCanaryApplyOptIn() && !isIntentProdApplyOptIn()) return false;

  return isSessionInCanaryBucket(key, pct);
}

export function isIntentApplyEnabledForCurrentRequest(
  observability?: IntentObservabilityMeta
): boolean {
  if (!isIntentIntelligenceApplyEnabled(activeCanarySessionKey)) return false;
  const safeguards = evaluateCanarySafeguards(observability);
  if (safeguards.blocked) return false;
  return true;
}

export function buildIntentCanaryMeta(args: {
  sessionKey: string;
  observability?: IntentObservabilityMeta;
}): IntentCanaryMeta {
  const started = Date.now();
  const { sessionKey, observability } = args;
  const emergencyDisable = isIntentCanaryEmergencyDisabled();
  const canaryPercentage = resolveCanaryPercentage();
  const activationBuckets = buildActivationBuckets(sessionKey, canaryPercentage);
  const rolloutStage = resolveCanaryRolloutStage();
  const safeguards = evaluateCanarySafeguards(observability);

  const baseEligible = isIntentIntelligenceApplyEnabled(sessionKey);
  const applyEligible = baseEligible && !safeguards.blocked && !emergencyDisable;

  const driftTrend = observability?.driftCount ?? 0;
  const canaryHealthScore = computeCanaryHealthScore({ observability, safeguards, inCanary: activationBuckets.inCanary });
  const activationQualityScore = computeActivationQualityScore({ observability, applyEligible });
  const rollbackReadinessScore = computeRollbackReadinessScore(safeguards);

  const active =
    isIntentCanaryApplyOptIn() &&
    !emergencyDisable &&
    canaryPercentage > 0 &&
    resolveIntentRolloutMode() === "canary";

  return {
    version: INTENT_CANARY_VERSION,
    active,
    canaryPercentage,
    activationBuckets,
    rolloutStage,
    emergencyDisable,
    rollbackReason: safeguards.rollbackReason,
    sessionKey: sessionKey.slice(0, 64),
    applyEligible,
    canaryHealthScore,
    driftTrend,
    activationQualityScore,
    rollbackReadinessScore,
    autoRollbackTriggered: safeguards.autoRollbackTriggered,
    instabilityAutoDisable: safeguards.instabilityAutoDisable,
    suppressionAnomalyWarning: safeguards.suppressionAnomalyWarning,
    latencyMs: Date.now() - started,
  };
}

export {
  INTENT_CANARY_STAGES,
  INTENT_CANARY_VERSION,
  isIntentApplyBlockedInProduction,
  resolveIntentRolloutMode,
};
