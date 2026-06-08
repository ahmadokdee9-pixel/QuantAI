/**
 * Phase 41 — Verdict Consistency V2.
 * Best Overall Choice must align with BUY READY unless real blockers exist.
 */

import type { BillionDollarDiscountIntelligence } from "@/lib/intelligence/billionDollarDiscountEngine";
import type { ProductIdentityMatchV2 } from "@/lib/intelligence/productIdentityMatchingV2Engine";
import type { SearchRankEntry } from "@/lib/intelligence/searchRankingEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { MerchantTrustIntelligence } from "@/lib/intelligence/merchantTrustIntelligenceEngine";

export type VerdictBlocker =
  | "fake_discount"
  | "bad_seller"
  | "poor_condition"
  | "unavailable"
  | "overpriced"
  | "missing_specs"
  | "same_product_cheaper"
  | null;

export type VerdictConsistencyV2 = {
  version: 2;
  consistent: boolean;
  resolvedVerdict: PrimaryVerdict;
  blocker: VerdictBlocker;
  explanation: string;
};

function detectBlockers(args: {
  verdict: PrimaryVerdict;
  merchantTrust: MerchantTrustIntelligence;
  discount: BillionDollarDiscountIntelligence;
  identity: ProductIdentityMatchV2;
  availability: string;
  confidence: number;
}): VerdictBlocker {
  if (args.discount.labels.includes("FAKE DISCOUNT RISK")) return "fake_discount";
  if (args.merchantTrust.trustScore < 45) return "bad_seller";
  if (args.discount.labels.includes("OVERPRICED")) return "overpriced";
  if (/refurb|renewed|used|open box/i.test(args.availability) && args.merchantTrust.trustScore < 55) {
    return "poor_condition";
  }
  if (/out of stock|unavailable|sold out/i.test(args.availability)) return "unavailable";
  if (args.identity.sameProductCheaper) return "same_product_cheaper";
  if (args.identity.identityClass === "DIFFERENT PRODUCT" && args.confidence < 50) return "missing_specs";
  return null;
}

/** Resolve Best Overall Choice vs WAIT/COMPARE contradictions. */
export function resolveVerdictConsistencyV2(args: {
  verdict: PrimaryVerdict;
  confidence: number;
  searchRank?: SearchRankEntry;
  isGlobalWinner: boolean;
  merchantTrust: MerchantTrustIntelligence;
  discount: BillionDollarDiscountIntelligence;
  identity: ProductIdentityMatchV2;
  availability: string;
  compareTarget?: string | null;
}): VerdictConsistencyV2 {
  const { verdict, confidence, searchRank, isGlobalWinner, merchantTrust, discount, identity, availability, compareTarget } =
    args;

  const blocker = detectBlockers({ verdict, merchantTrust, discount, identity, availability, confidence });
  let resolvedVerdict = verdict;
  let explanation = "";
  let consistent = true;

  const isBestOverall =
    isGlobalWinner || searchRank?.label === "Best Overall Choice" || searchRank?.rank === 1;

  if (isBestOverall && confidence >= 78 && !blocker) {
    if (verdict === "WAIT" || verdict === "COMPARE") {
      resolvedVerdict = "BUY READY";
      consistent = false;
      explanation = `#1 Best Overall Choice — strongest mix of price, trust, category fit, and market position. Buy now at this seller.`;
    } else {
      explanation = `#1 Best Overall Choice — strongest mix of price, trust, condition, and category fit.`;
    }
  } else if (isBestOverall && blocker) {
    if (verdict === "BUY READY" && blocker === "same_product_cheaper") {
      resolvedVerdict = "COMPARE";
      consistent = false;
      explanation = `Best overall product, but same product is cheaper at ${identity.sameProductCheaperStore ?? "another seller"} — compare checkout paths.`;
    } else if (verdict === "BUY READY" && (blocker === "fake_discount" || blocker === "overpriced")) {
      resolvedVerdict = "WAIT";
      consistent = false;
      explanation = `Strong product, but ${blocker === "fake_discount" ? "discount marketing looks inflated" : "price is elevated"} — wait for a verified drop or better seller.`;
    } else if (verdict === "WAIT" || verdict === "COMPARE") {
      explanation = waitExplanationForBlocker(blocker, identity, compareTarget);
    }
  } else if (verdict === "WAIT") {
    explanation = waitExplanationForBlocker(blocker ?? "overpriced", identity, compareTarget);
  } else if (verdict === "COMPARE") {
    explanation = compareTarget
      ? `Compare against ${compareTarget} — evaluate price, seller trust, and delivery before checkout.`
      : `Compare against top-ranked alternatives in this tray before buying.`;
  } else if (verdict === "BUY READY") {
    explanation = `Best available purchase opportunity now — fair price with acceptable trust and category fit.`;
  }

  return { version: 2, consistent, resolvedVerdict, blocker, explanation };
}

function waitExplanationForBlocker(
  blocker: VerdictBlocker,
  identity: ProductIdentityMatchV2,
  compareTarget?: string | null
): string {
  switch (blocker) {
    case "fake_discount":
      return "Wait for verified pricing — discount badge may be inflated versus market median.";
    case "bad_seller":
      return "Wait for a stronger seller — current merchant trust is below safe checkout threshold.";
    case "same_product_cheaper":
      return `Wait or switch — same product cheaper at ${identity.sameProductCheaperStore ?? "another merchant"}.`;
    case "overpriced":
      return "Wait for price drop — listing sits above fair market for this category.";
    case "unavailable":
      return "Wait for stock — listing unavailable or fulfillment uncertain.";
    case "missing_specs":
      return "Wait for more data — critical specs or identity signals are incomplete.";
    default:
      return compareTarget
        ? `Wait — compare ${compareTarget} first or watch for a verified price improvement.`
        : "Wait — market timing favors patience over immediate checkout.";
  }
}
