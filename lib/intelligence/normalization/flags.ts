/**
 * Phase 0 normalization feature flags — OFF by default, shadow-safe migration.
 */

import type { NormalizationMode } from "./types";

export type NormalizationFlags = {
  enabled: boolean;
  mode: NormalizationMode;
  apply: boolean;
  shadowTelemetry: boolean;
};

const VALID_MODES: NormalizationMode[] = ["shadow", "meta_only", "dedup", "collapse"];

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return defaultValue;
}

function parseMode(raw: string | undefined): NormalizationMode {
  const v = (raw ?? "shadow").trim().toLowerCase();
  if (VALID_MODES.includes(v as NormalizationMode)) return v as NormalizationMode;
  return "shadow";
}

/** Read normalization flags from process.env (server-side). Defaults: disabled, shadow, no apply. */
export function readNormalizationFlags(env: NodeJS.ProcessEnv = process.env): NormalizationFlags {
  const enabled = parseBool(env.QUANTAI_NORMALIZATION_ENABLED, false);
  const mode = parseMode(env.QUANTAI_NORMALIZATION_MODE);
  const applyRaw = parseBool(env.QUANTAI_NORMALIZATION_APPLY, false);
  const productionConfirmed = parseBool(env.QUANTAI_NORMALIZATION_APPLY_PRODUCTION_CONFIRMED, false);
  // Production safety: shadow/meta_only never mutate tray regardless of APPLY env typo.
  let apply = mode === "shadow" || mode === "meta_only" ? false : applyRaw;
  // Phase 2: production APPLY requires explicit double-confirm env (staging canary uses separate flags).
  if (apply && process.env.NODE_ENV === "production" && !productionConfirmed) {
    apply = false;
  }
  const shadowTelemetry = parseBool(
    env.QUANTAI_NORMALIZATION_SHADOW_TELEMETRY,
    enabled
  );
  return { enabled, mode, apply, shadowTelemetry };
}

/** Stage 1 production shadow rollout — telemetry on, no ranking mutation. */
export function isStage1ShadowRollout(env: NodeJS.ProcessEnv = process.env): boolean {
  const flags = readNormalizationFlags(env);
  return flags.enabled && flags.mode === "shadow" && !flags.apply && flags.shadowTelemetry;
}

/** Phase 2 shadow observation — alias for Stage 1 discipline (telemetry only). */
export function isPhase2ShadowObservation(env: NodeJS.ProcessEnv = process.env): boolean {
  return isStage1ShadowRollout(env);
}
