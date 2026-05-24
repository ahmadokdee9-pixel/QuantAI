/**
 * Phase 4 — Variant boundary engine (extends normalization boundary with traces).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  extractVariantAxes,
  variantBoundaryConflict,
  equivalenceGroupHasVariantBoundaryViolation,
  type VariantAxes,
} from "@/lib/intelligence/normalization/variantBoundary";
import type { VariantBoundaryTrace } from "./types";
import {
  isAccessoryListing,
  isBundleContamination,
} from "./titleNormalization";

const PRIMARY_PRODUCT_SIGNAL =
  /\b(iphone|galaxy|macbook|ipad|airpods|playstation|ps5|xbox|nike air force|samsung s\d)\b/i;

function isLikelyPrimaryProduct(title: string): boolean {
  return PRIMARY_PRODUCT_SIGNAL.test(title) && !isAccessoryListing(title);
}

function hasAccessorySignal(title: string): boolean {
  return /\b(case|cover|screen protector|tempered glass|strap|band only|cable only|adapter only)\b/i.test(
    title
  );
}

function accessoryProductConfusion(a: QuantProduct, b: QuantProduct): boolean {
  return (
    (hasAccessorySignal(a.title) && isLikelyPrimaryProduct(b.title)) ||
    (hasAccessorySignal(b.title) && isLikelyPrimaryProduct(a.title))
  );
}

export type BoundaryCheckResult = {
  conflict: boolean;
  reasons: string[];
  axesA: VariantAxes;
  axesB: VariantAxes;
};

export function checkVariantBoundary(a: QuantProduct, b: QuantProduct): BoundaryCheckResult {
  const axesA = extractVariantAxes(a);
  const axesB = extractVariantAxes(b);
  const reasons: string[] = [];

  const verdict = variantBoundaryConflict(axesA, axesB);
  if (verdict.conflict) reasons.push(...verdict.reasons);

  if (accessoryProductConfusion(a, b)) {
    reasons.push("accessory_product_confusion");
  }
  if (isBundleContamination(a.title) || isBundleContamination(b.title)) {
    if (!isBundleContamination(a.title) || !isBundleContamination(b.title)) {
      reasons.push("bundle_contamination");
    }
  }

  return {
    conflict: reasons.length > 0,
    reasons,
    axesA,
    axesB,
  };
}

export function buildVariantBoundaryTraces(
  products: QuantProduct[],
  memberLinks: string[]
): VariantBoundaryTrace[] {
  const traces: VariantBoundaryTrace[] = [];
  const byLink = new Map(products.map((p) => [p.link, p]));
  const members = memberLinks.map((l) => byLink.get(l)).filter((p): p is QuantProduct => Boolean(p));
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const check = checkVariantBoundary(members[i]!, members[j]!);
      traces.push({
        pairKey: `${members[i]!.link}::${members[j]!.link}`,
        conflict: check.conflict,
        reasons: check.reasons,
        axesA: check.axesA,
        axesB: check.axesB,
      });
    }
  }
  return traces;
}

export function countFalseCollapseBlocks(
  products: QuantProduct[],
  groups: { memberLinks: string[] }[]
): number {
  let blocks = 0;
  for (const g of groups) {
    const v = equivalenceGroupHasVariantBoundaryViolation(products, g.memberLinks);
    if (v.violation) blocks += 1;
  }
  return blocks;
}

export { extractVariantAxes, variantBoundaryConflict };
