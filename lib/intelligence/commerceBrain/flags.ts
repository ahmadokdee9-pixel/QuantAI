/**
 * Phase 11 unified commerce brain flags — shadow-only.
 */

export type CommerceBrainFlags = {
  enabled: boolean;
  shadowOnly: true;
  observability: boolean;
  maxInfluence01: number;
};

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return defaultValue;
}

export function readCommerceBrainFlags(env: NodeJS.ProcessEnv = process.env): CommerceBrainFlags {
  const enabled = parseBool(env.QUANTAI_COMMERCE_BRAIN_ENABLED, false);
  const rawMax = parseFloat(env.QUANTAI_COMMERCE_BRAIN_MAX_INFLUENCE ?? "0.15");
  const maxInfluence01 = Number.isFinite(rawMax) ? Math.min(0.2, Math.max(0, rawMax)) : 0.15;
  return {
    enabled,
    shadowOnly: true,
    observability: parseBool(env.QUANTAI_COMMERCE_BRAIN_OBSERVABILITY, enabled),
    maxInfluence01,
  };
}
