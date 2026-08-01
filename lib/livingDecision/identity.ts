/**
 * Permanent Living Decision IDs — stable across episodes for the same memory identity.
 */

/** Deterministic UUID-shaped id from scope + thread key (not crypto-secure). */
export function livingDecisionIdFromKey(userScope: string, threadKey: string): string {
  const input = `${userScope}::${threadKey}`.trim().toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex = `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}${((h1 ^ h2) >>> 0).toString(16).padStart(8, "0")}${((h1 + h2) >>> 0).toString(16).padStart(8, "0")}`;
  // 8-4-4-4-12
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function resolveThreadKey(args: {
  memoryIdentity?: string | null;
  productLink: string;
  domain?: string | null;
}): string {
  const identity = (args.memoryIdentity || "").trim();
  if (identity) return identity;
  const link = args.productLink.trim();
  const domain = (args.domain || "product").trim();
  return `${domain}:${link}`;
}

export function resolveLivingDecisionId(args: {
  existingDecisionId?: string | null;
  userScope?: string | null;
  memoryIdentity?: string | null;
  productLink: string;
  domain?: string | null;
}): string {
  const existing = (args.existingDecisionId || "").trim();
  if (existing) return existing;
  const thread = resolveThreadKey(args);
  const scope = (args.userScope || "guest").trim() || "guest";
  return livingDecisionIdFromKey(scope, thread);
}
