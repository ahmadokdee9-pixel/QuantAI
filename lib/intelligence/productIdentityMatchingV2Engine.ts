/**
 * Phase 41 — Product Identity Matching V2.
 * Strict identity classes — never claim same product cheaper without confidence.
 */

import type { EquivalentMatchResult } from "@/lib/intelligence/equivalentProductMatchingEngine";
import type { GlobalProductIdentity } from "@/lib/intelligence/globalProductIdentityEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ProductIdentityClassV2 =
  | "EXACT SAME PRODUCT"
  | "SAME MODEL / DIFFERENT VARIANT"
  | "EQUIVALENT PRODUCT"
  | "SIMILAR PRODUCT"
  | "DIFFERENT PRODUCT";

export type ProductIdentityMatchV2 = {
  version: 2;
  identityClass: ProductIdentityClassV2;
  identityConfidence: number;
  sameProductCheaper: boolean;
  sameProductCheaperLink: string | null;
  sameProductCheaperStore: string | null;
  sameProductCheaperPrice: number | null;
  equivalentCheaper: boolean;
  reasoning: string;
};

const MIN_SAME_PRODUCT_CONFIDENCE = 78;

/** Classify product identity with strict same-product cheaper rules. */
export function classifyProductIdentityV2(args: {
  product: QuantProduct;
  globalIdentity: GlobalProductIdentity;
  equivalentMatches?: EquivalentMatchResult;
}): ProductIdentityMatchV2 {
  const { product, globalIdentity, equivalentMatches } = args;

  let identityClass: ProductIdentityClassV2 = "SIMILAR PRODUCT";
  let identityConfidence = globalIdentity.identityConfidence;

  if (globalIdentity.identityClass === "SAME PRODUCT" && identityConfidence >= MIN_SAME_PRODUCT_CONFIDENCE) {
    identityClass = "EXACT SAME PRODUCT";
  } else if (globalIdentity.identityClass === "SAME PRODUCT" || globalIdentity.identityClass === "SIMILAR PRODUCT") {
    identityClass = identityConfidence >= 65 ? "SAME MODEL / DIFFERENT VARIANT" : "SIMILAR PRODUCT";
  } else if (globalIdentity.identityClass === "CHEAPER ALTERNATIVE" || globalIdentity.identityClass === "BETTER VALUE PRODUCT") {
    identityClass = "EQUIVALENT PRODUCT";
  } else if (globalIdentity.identityClass === "UNRELATED") {
    identityClass = "DIFFERENT PRODUCT";
    identityConfidence = Math.min(identityConfidence, 40);
  }

  const sameCheaper = equivalentMatches?.bestSameProductCheaper;
  const sameProductCheaper =
    Boolean(sameCheaper) &&
    sameCheaper!.link !== product.link &&
    sameCheaper!.price < product.price &&
    (sameCheaper!.kind === "exact" || sameCheaper!.kind === "same_model") &&
    identityConfidence >= MIN_SAME_PRODUCT_CONFIDENCE;

  const equivCheaper = Boolean(
    equivalentMatches?.bestCheaperAlternative &&
      equivalentMatches.bestCheaperAlternative.link !== product.link &&
      equivalentMatches.bestCheaperAlternative.price < product.price
  );

  let reasoning = `${identityClass} — identity confidence ${identityConfidence}%.`;
  if (sameProductCheaper) {
    reasoning = `Same product cheaper at ${sameCheaper!.store} for €${sameCheaper!.price} — verify variant match before switching.`;
  } else if (equivCheaper && equivalentMatches?.bestCheaperAlternative) {
    reasoning = `Equivalent alternative at ${equivalentMatches.bestCheaperAlternative.store} — not guaranteed identical SKU.`;
  }

  return {
    version: 2,
    identityClass,
    identityConfidence,
    sameProductCheaper,
    sameProductCheaperLink: sameProductCheaper ? sameCheaper!.link : null,
    sameProductCheaperStore: sameProductCheaper ? sameCheaper!.store : null,
    sameProductCheaperPrice: sameProductCheaper ? sameCheaper!.price : null,
    equivalentCheaper: equivCheaper && !sameProductCheaper,
    reasoning,
  };
}
