import { HERO_SEARCH_PROMPTS } from "@/lib/search/heroPrompts";

/**
 * Suggested follow-up scans when the current tray is thin — keeps the field feeling populated.
 */
export function relatedTrayQueries(query: string, max = 5): string[] {
  const ql = query.trim().toLowerCase();
  const pool = HERO_SEARCH_PROMPTS.filter((p) => p.trim().toLowerCase() !== ql);
  const words = ql
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return [...pool].slice(0, max);

  const scored = pool.map((s) => {
    const sl = s.toLowerCase();
    const hits = words.reduce((n, w) => (sl.includes(w) ? n + 1 : n), 0);
    return { s, hits };
  });
  scored.sort((a, b) => b.hits - a.hits || a.s.length - b.s.length);

  const out: string[] = [];
  for (const { s } of scored) {
    if (out.length >= max) break;
    if (!out.includes(s)) out.push(s);
  }
  for (const s of pool) {
    if (out.length >= max) break;
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, max);
}
