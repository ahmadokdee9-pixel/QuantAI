const STOP = new Set([
  "the",
  "and",
  "with",
  "for",
  "new",
  "free",
  "wifi",
  "gb",
  "tb",
  "inch",
  "cm",
  "mm",
  "from",
  "your",
  "this",
  "that",
  "best",
  "buy",
  "sale",
  "deal",
  "now",
  "only",
  "just",
  "per",
  "each",
  "set",
  "pack",
  "color",
  "black",
  "white",
  "size",
]);

/** Strip accents for language-insensitive token overlap (pair with normalize). */
export function foldAsciiTitle(title: string): string {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Collapse noise for fuzzy matching across retailers. */
export function normalizeProductTitle(title: string): string {
  return foldAsciiTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleTokens(title: string): string[] {
  const norm = normalizeProductTitle(title);
  return norm
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Jaccard similarity on token sets (0–1). */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(titleTokens(a));
  const tb = new Set(titleTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const x of ta) {
    if (tb.has(x)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Character n-gram overlap for near-miss titles (lightweight). */
export function charOverlapSimilarity(a: string, b: string): number {
  const na = normalizeProductTitle(a).replace(/\s/g, "");
  const nb = normalizeProductTitle(b).replace(/\s/g, "");
  if (na.length < 4 || nb.length < 4) return 0;
  const short = na.length <= nb.length ? na : nb;
  const long = na.length <= nb.length ? nb : na;
  let hit = 0;
  const step = Math.max(1, Math.floor(short.length / 40));
  for (let i = 0; i <= short.length - 4; i += step) {
    const gram = short.slice(i, i + 4);
    if (long.includes(gram)) hit++;
  }
  const maxGrams = Math.ceil((short.length - 3) / step);
  return maxGrams > 0 ? hit / maxGrams : 0;
}

export function combinedTitleSimilarity(a: string, b: string): number {
  const j = titleSimilarity(a, b);
  const c = charOverlapSimilarity(a, b);
  const base = Math.max(j, j * 0.65 + c * 0.35);
  const af = foldAsciiTitle(a);
  const bf = foldAsciiTitle(b);
  const jf = titleSimilarity(af, bf);
  const cf = charOverlapSimilarity(af, bf);
  const folded = Math.max(jf, jf * 0.65 + cf * 0.35);
  return Math.max(base, folded);
}
