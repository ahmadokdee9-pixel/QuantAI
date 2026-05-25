/**
 * Controlled activation flags — canary prep only; global APPLY remains blocked.
 */

import { readNormalizationFlags } from "@/lib/intelligence/normalization/flags";

export type ControlledActivationFlags = {
  enabled: boolean;
  shadowOnly: true;
  observability: boolean;
  canaryPercent: number;
  categoryScope: string | null;
  merchantScope: string | null;
  confidenceMin01: number;
  emergencyDisable: boolean;
  globalApplyBlocked: true;
};

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return defaultValue;
}

export function readControlledActivationFlags(
  env: NodeJS.ProcessEnv = process.env
): ControlledActivationFlags {
  const enabled = parseBool(env.QUANTAI_CONTROLLED_ACTIVATION_ENABLED, false);
  const rawPct = parseFloat(env.QUANTAI_CANARY_ACTIVATION_PERCENT ?? "0");
  const canaryPercent = Number.isFinite(rawPct) ? Math.min(1, Math.max(0, rawPct)) : 0;
  const norm = readNormalizationFlags(env);
  const globalApplyAttempt = norm.apply || parseBool(env.QUANTAI_NORMALIZATION_APPLY, false);

  return {
    enabled,
    shadowOnly: true,
    observability: parseBool(env.QUANTAI_CONTROLLED_ACTIVATION_OBSERVABILITY, enabled),
    canaryPercent: globalApplyAttempt && canaryPercent > 0 ? 0 : canaryPercent,
    categoryScope: env.QUANTAI_CANARY_CATEGORY_SCOPE?.trim() || null,
    merchantScope: env.QUANTAI_CANARY_MERCHANT_SCOPE?.trim() || null,
    confidenceMin01: 0.55,
    emergencyDisable: parseBool(env.QUANTAI_CANARY_EMERGENCY_DISABLE, false),
    globalApplyBlocked: true,
  };
}
