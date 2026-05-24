/**
 * Phase 2 — One-layer APPLY canary gates (staging / explicit confirm only).
 * Production APPLY remains blocked unless all gates + explicit env confirm.
 */

import { readNormalizationFlags } from "./flags";
import type { Phase2ApplyReadinessVerdict } from "./applyReadiness";

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return defaultValue;
}

export type ApplyCanaryConfig = {
  canaryRequested: boolean;
  canaryConfirmed: boolean;
  canaryMode: "dedup" | "shadow" | "meta_only" | "collapse";
  productionApplyConfirmed: boolean;
  effectiveApply: boolean;
  blockedReason: string | null;
};

/** Resolve canary env without enabling production APPLY accidentally. */
export function readApplyCanaryConfig(env: NodeJS.ProcessEnv = process.env): ApplyCanaryConfig {
  const flags = readNormalizationFlags(env);
  const canaryRequested = parseBool(env.QUANTAI_NORMALIZATION_APPLY_CANARY, false);
  const canaryConfirmed = parseBool(env.QUANTAI_NORMALIZATION_CANARY_CONFIRMED, false);
  const productionApplyConfirmed = parseBool(
    env.QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED,
    false
  );
  const canaryModeRaw = (env.QUANTAI_NORMALIZATION_CANARY_MODE ?? "dedup").trim().toLowerCase();

  let blockedReason: string | null = null;
  let effectiveApply = false;

  if (!flags.enabled) {
    blockedReason = "normalization_disabled";
  } else if (flags.mode === "shadow" || flags.mode === "meta_only") {
    blockedReason = "shadow_mode_blocks_apply";
    effectiveApply = false;
  } else if (canaryRequested && canaryConfirmed) {
    effectiveApply = flags.apply && canaryModeRaw === "dedup";
    if (!effectiveApply) blockedReason = "canary_requires_mode_dedup_and_apply_true";
  } else if (flags.apply && !productionApplyConfirmed) {
    blockedReason = "production_apply_requires_QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED";
    effectiveApply = false;
  } else {
    effectiveApply = flags.apply;
  }

  return {
    canaryRequested,
    canaryConfirmed,
    canaryMode: canaryModeRaw === "dedup" ? "dedup" : flags.mode,
    productionApplyConfirmed,
    effectiveApply,
    blockedReason,
  };
}

export type ApplyCanaryGateSummary = {
  canaryEligible: boolean;
  productionApplyBlocked: boolean;
  requiredEnv: string[];
  readinessVerdict: Phase2ApplyReadinessVerdict["verdict"];
};

export function summarizeApplyCanaryGates(
  readiness: Phase2ApplyReadinessVerdict
): ApplyCanaryGateSummary {
  const config = readApplyCanaryConfig();
  const canaryEligible =
    readiness.verdict === "READY_FOR_CANARY" &&
    readiness.allCriticalPassed &&
    !config.effectiveApply;

  return {
    canaryEligible,
    productionApplyBlocked: true,
    requiredEnv: [
      "QUANTAI_NORMALIZATION_ENABLED=true",
      "QUANTAI_NORMALIZATION_MODE=dedup",
      "QUANTAI_NORMALIZATION_APPLY=true",
      "QUANTAI_NORMALIZATION_APPLY_CANARY=true",
      "QUANTAI_NORMALIZATION_CANARY_CONFIRMED=true",
      "# Staging only — never enable APPLY in production until sign-off",
    ],
    readinessVerdict: readiness.verdict,
  };
}
