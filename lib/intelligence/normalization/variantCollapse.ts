/**
 * Variant collapsing — keep diverse variants, collapse redundant equivalents within variant plane.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { NormalizationCollapseReason, NormalizedListingRecord } from "./types";
import { representativeScore } from "./merchantReconciliation";
import { groupByVariantKey } from "./equivalenceGraph";

export type VariantCollapseDecision = {
  keepLink: string;
  dropLinks: string[];
  reason: NormalizationCollapseReason;
};

/**
 * Within each variant key group, keep the best representative.
 * Does NOT collapse different variants (storage/color) — only duplicates within same variantKey.
 */
export function collapseVariantDuplicates(
  records: NormalizedListingRecord[]
): VariantCollapseDecision[] {
  const decisions: VariantCollapseDecision[] = [];
  const byVariant = groupByVariantKey(records);

  for (const members of byVariant.values()) {
    if (members.length <= 1) continue;
    const sorted = [...members].sort(
      (a, b) => representativeScore(b.product) - representativeScore(a.product)
    );
    const keep = sorted[0]!;
    const drops = sorted.slice(1);
    if (drops.length === 0) continue;
    decisions.push({
      keepLink: keep.product.link,
      dropLinks: drops.map((d) => d.product.link),
      reason: "variant_collapse",
    });
  }

  return decisions;
}

/**
 * Collapse mode: one representative per variant key across merchants (keep best offer per variant).
 * Different variant fingerprints within same family remain (256GB vs 512GB both kept).
 */
export function selectVariantRepresentatives(
  records: NormalizedListingRecord[]
): Map<string, string> {
  const keepByVariant = new Map<string, string>();
  const byVariant = groupByVariantKey(records);

  for (const [variantKey, members] of byVariant) {
    const best = [...members].sort(
      (a, b) => representativeScore(b.product) - representativeScore(a.product)
    )[0]!;
    keepByVariant.set(variantKey, best.product.link);
  }

  return keepByVariant;
}

export function isSameVariantPlane(a: QuantProduct, b: QuantProduct, variantKeyA: string, variantKeyB: string): boolean {
  return variantKeyA === variantKeyB;
}
