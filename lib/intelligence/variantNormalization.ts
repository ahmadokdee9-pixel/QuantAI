/**
 * Variant & listing token normalization — cross-retailer identity matching helpers.
 */

/** Normalize storage mentions to a comparable GB number (TB→GB). */
export function normalizeStorageGb(raw: string): number | null {
  const t = raw.toLowerCase();
  let best: number | null = null;
  for (const m of t.matchAll(/\b(\d{1,4})\s*(gb|tb)\b/gi)) {
    const n = parseInt(m[1] ?? "", 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const unit = (m[2] ?? "gb").toLowerCase();
    const gb = unit.startsWith("t") ? n * 1024 : n;
    if (gb >= 2 && gb <= 1024 * 16) best = Math.max(best ?? 0, gb);
  }
  return best;
}

const COLOR_KEYS: [RegExp, string][] = [
  [/\b(white|wit|weiß|blanc)\b/i, "white"],
  [/\b(black|zwart|noir|schwarz)\b/i, "black"],
  [/\b(navy|marine)\b/i, "navy"],
  [/\b(grey|gray|grijs|gris)\b/i, "grey"],
  [/\b(silver|zilver|argent)\b/i, "silver"],
  [/\b(gold|goud|or\b)\b/i, "gold"],
  [/\b(rose gold|rosegold)\b/i, "rosegold"],
  [/\b(blue|bleu|blauw)\b/i, "blue"],
  [/\b(red|rouge|rood)\b/i, "red"],
  [/\b(green|vert|groen)\b/i, "green"],
  [/\b(purple|violet|paars)\b/i, "purple"],
  [/\b(beige|sand|taupe)\b/i, "neutral"],
];

export function normalizeColorKey(text: string): string | null {
  const s = text.toLowerCase();
  for (const [re, key] of COLOR_KEYS) {
    if (re.test(s)) return key;
  }
  return null;
}

const SIZE_TOKENS =
  /\b(xxs|xs|s\/m|m\/l|xl|xxl|xxxl|s|m|l)\b|eu\s*\d{2}|us\s*\d{1,2}|uk\s*\d{1,2}|(\d{2,3})\s*(cm|mm)/i;

export function normalizeSizeKey(text: string): string | null {
  const m = text.match(SIZE_TOKENS);
  if (!m) return null;
  return (m[0] ?? "").toLowerCase().replace(/\s+/g, "");
}

const REFURB_SYNONYMS =
  /\b(refurb|refurbished|renewed|factory renewed|open[-\s]?box|open box|pre[-\s]?owned|used|second[-\s]?hand|ex[-\s]?display|demo)\b/i;

const NEW_SYNONYMS = /\b(new|neuf|nieuw|sealed|brand new)\b/i;

export type NormalizedCondition = "new" | "refurbished" | "used" | "open_box" | "unknown";

export function normalizeConditionLabel(blob: string): NormalizedCondition {
  const b = blob.toLowerCase();
  if (/\bused|pre[-\s]?owned|second[-\s]?hand\b/i.test(b)) return "used";
  if (/\bopen[-\s]?box|open box\b/i.test(b)) return "open_box";
  if (REFURB_SYNONYMS.test(b)) return "refurbished";
  if (NEW_SYNONYMS.test(b)) return "new";
  return "unknown";
}

/** Strip noisy regional / marketplace tokens for softer title match. */
export function normalizeRegionalTitleNoise(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(free shipping|fast ship|usa seller|eu seller|uk seller|nl seller|100% genuine|authentic)\b/gi, "")
    .replace(/\b(new|nieuw|neuf)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
