export const TRUSTED_SUBSTRINGS = [
  "amazon",
  "bol",
  "coolblue",
  "mediamarkt",
  "apple",
  "ikea",
  "wayfair",
  "best buy",
  "walmart",
  "target",
  "bh photo",
  "newegg",
] as const;

export function getStoreTrustScore(store: string): number {
  const s = store.toLowerCase();
  if (TRUSTED_SUBSTRINGS.some((t) => s.includes(t))) return 88;
  if (s.length > 2 && s.length < 48) return 62;
  return 48;
}
