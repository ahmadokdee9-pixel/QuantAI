/**
 * Phase 4 identity foundation flags — shadow-only by default.
 */

export type IdentityFoundationFlags = {
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

export function readIdentityFoundationFlags(
  env: NodeJS.ProcessEnv = process.env
): IdentityFoundationFlags {
  const enabled = parseBool(env.QUANTAI_IDENTITY_FOUNDATION_ENABLED, false);
  const observability = parseBool(
    env.QUANTAI_IDENTITY_FOUNDATION_OBSERVABILITY,
    enabled
  );
  return { enabled, shadowOnly: true, observability };
}
