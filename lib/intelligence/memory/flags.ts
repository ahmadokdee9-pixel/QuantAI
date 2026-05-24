/**
 * Phase 6 commerce memory flags — shadow-only by default.
 */

export type CommerceMemoryFlags = {
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

export function readCommerceMemoryFlags(env: NodeJS.ProcessEnv = process.env): CommerceMemoryFlags {
  const enabled = parseBool(env.QUANTAI_COMMERCE_MEMORY_ENABLED, false);
  const observability = parseBool(env.QUANTAI_COMMERCE_MEMORY_OBSERVABILITY, enabled);
  return { enabled, shadowOnly: true, observability };
}
