/**
 * Phase 8 autonomous commerce OS flags — shadow-only by default.
 */

export type AutonomousCommerceOsFlags = {
  enabled: boolean;
  shadowOnly: true;
  observability: boolean;
};

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return defaultValue;
}

export function readAutonomousCommerceOsFlags(
  env: NodeJS.ProcessEnv = process.env
): AutonomousCommerceOsFlags {
  const enabled = parseBool(env.QUANTAI_AUTONOMOUS_COMMERCE_OS_ENABLED, false);
  const observability = parseBool(env.QUANTAI_AUTONOMOUS_COMMERCE_OS_OBSERVABILITY, enabled);
  return { enabled, shadowOnly: true, observability };
}
