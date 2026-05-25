/**
 * Phase 12 live commerce signals flags — shadow-only.
 */

export type LiveCommerceSignalsFlags = {
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

export function readLiveCommerceSignalsFlags(
  env: NodeJS.ProcessEnv = process.env
): LiveCommerceSignalsFlags {
  const enabled = parseBool(env.QUANTAI_LIVE_COMMERCE_SIGNALS_ENABLED, false);
  const rawMax = parseFloat(env.QUANTAI_LIVE_COMMERCE_SIGNALS_MAX_INFLUENCE ?? "0.12");
  const maxInfluence01 = Number.isFinite(rawMax) ? Math.min(0.15, Math.max(0, rawMax)) : 0.12;
  return {
    enabled,
    shadowOnly: true,
    observability: parseBool(env.QUANTAI_LIVE_COMMERCE_SIGNALS_OBSERVABILITY, enabled),
    maxInfluence01,
  };
}
