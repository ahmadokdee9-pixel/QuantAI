/**
 * P4.3 — Production-safe intent apply activation telemetry (meta-only; no ranking changes).
 */

import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import {
  INTENT_PRODUCTION_APPLY_VERSION,
  isIntentApplyBlockedInProduction,
  isIntentApplyHardRollback,
  isIntentCanaryApplyOptIn,
  isIntentIntelligenceApplyEnabled,
  isIntentProdApplyOptIn,
  resolveIntentRolloutMode,
  type IntentRolloutMode,
} from "@/lib/intent/intentIntelligenceFlags";

export type IntentProductionApplyMeta = {
  version: typeof INTENT_PRODUCTION_APPLY_VERSION;
  active: boolean;
  environment: string;
  rolloutMode: IntentRolloutMode;
  deltaApplied: number;
  rollbackAvailable: boolean;
  applyEnabled: boolean;
  prodOptIn: boolean;
  canaryOptIn: boolean;
  blockedInProduction: boolean;
  latencyMs: number;
};

function runtimeEnvironment(): string {
  return process.env.NODE_ENV === "production" ? "production" : "non-production";
}

export function buildIntentProductionApplyMeta(args: { intentApply: IntentApplyMeta }): IntentProductionApplyMeta {
  const started = Date.now();
  const { intentApply } = args;
  const applyEnabled = isIntentIntelligenceApplyEnabled();
  const rolloutMode = resolveIntentRolloutMode();
  const active = applyEnabled && rolloutMode !== "off" && intentApply.applied;

  return {
    version: INTENT_PRODUCTION_APPLY_VERSION,
    active,
    environment: runtimeEnvironment(),
    rolloutMode,
    deltaApplied: intentApply.deltaApplied,
    rollbackAvailable: !isIntentApplyHardRollback(),
    applyEnabled,
    prodOptIn: isIntentProdApplyOptIn(),
    canaryOptIn: isIntentCanaryApplyOptIn(),
    blockedInProduction: isIntentApplyBlockedInProduction(),
    latencyMs: Date.now() - started,
  };
}

export {
  resolveIntentRolloutMode,
  isIntentApplyBlockedInProduction,
  isIntentIntelligenceApplyEnabled,
};
