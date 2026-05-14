/**
 * Tray-local universal similarity — blends relevance, title overlap to anchor,
 * taste alignment, trust, and composite shape for substitute / relationship logic.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore } from "@/lib/shoppingScore";
import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import { queryListingRelevance01 } from "@/lib/intelligence/queryRelevance";
import type { TasteGraphSignals } from "@/lib/commerce-os/tasteGraph";
import { tasteProductAlignment01 } from "@/lib/commerce-os/tasteGraph";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function universalSimilarity01(
  p: QuantProduct,
  list: QuantProduct[],
  query: string,
  anchorPhrase: string,
  taste: TasteGraphSignals
): number {
  const rel = queryListingRelevance01(query, p) / 100;
  const anchor = anchorPhrase.trim().length >= 2 ? anchorPhrase.trim() : query;
  const titleSim = combinedTitleSimilarity(anchor, p.title);
  const tasteAl = tasteProductAlignment01(p, taste);
  const trust = getStoreTrustScore(p.store) / 100;
  const comp = getFinalComposite(p, list);
  const maxC = Math.max(1, ...list.map((x) => getFinalComposite(x, list)));
  const compN = comp / maxC;

  return clamp01(rel * 0.24 + titleSim * 0.26 + tasteAl * 0.2 + trust * 0.14 + compN * 0.16);
}
