import type { QuantProduct } from "@/lib/shoppingScore";
import { getElitePreferredRetailerBonus } from "@/lib/retailTrust";

function normalizeStoreKey(store: string): string {
  return store.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 48);
}

/**
 * Re-ranks the first window for a calmer tray: trusted retailers surface earlier,
 * duplicate-store streaks in the lead band are softened, full list preserved.
 */
export function applyEliteFirstWindowCuration(
  sortedByComposite: QuantProduct[],
  window = 12
): QuantProduct[] {
  if (sortedByComposite.length <= 3 || sortedByComposite.length <= window) {
    return sortedByComposite;
  }

  const pool = sortedByComposite.slice(0, Math.min(sortedByComposite.length, window * 2));
  const picked: QuantProduct[] = [];
  const used = new Set<string>();

  const rowScore = (p: QuantProduct) =>
    (p.qiComposite ?? 0) + getElitePreferredRetailerBonus(p.store) * 0.45;

  while (picked.length < window && picked.length < sortedByComposite.length) {
    const prev = picked[picked.length - 1];
    const prevKey = prev ? normalizeStoreKey(prev.store) : "";
    let best: QuantProduct | null = null;
    let bestAdj = -1e9;

    for (const p of pool) {
      if (used.has(p.link)) continue;
      let adj = rowScore(p);
      if (prevKey && normalizeStoreKey(p.store) === prevKey) adj -= 2.8;
      if (adj > bestAdj) {
        bestAdj = adj;
        best = p;
      }
    }

    if (!best) break;
    picked.push(best);
    used.add(best.link);
  }

  const tail = sortedByComposite.filter((p) => !used.has(p.link));
  return [...picked, ...tail];
}
