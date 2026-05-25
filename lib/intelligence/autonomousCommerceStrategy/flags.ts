/**
 * Phase 15 autonomous commerce strategy flags — shadow-only.
 */

export type AutonomousCommerceStrategyFlags = {
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

export function readAutonomousCommerceStrategyFlags(
  env: NodeJS.ProcessEnv = process.env
): AutonomousCommerceStrategyFlags {
  const enabled = parseBool(env.QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_ENABLED, false);
  const rawMax = parseFloat(env.QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_MAX_INFLUENCE ?? "0.1");
  const maxInfluence01 = Number.isFinite(rawMax) ? Math.min(0.12, Math.max(0, rawMax)) : 0.1;
  return {
    enabled,
    shadowOnly: true,
    observability: parseBool(env.QUANTAI_AUTONOMOUS_COMMERCE_STRATEGY_OBSERVABILITY, enabled),
    maxInfluence01,
  };
}
