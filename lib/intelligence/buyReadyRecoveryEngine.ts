/**
 * Phase 36 — BUY READY Recovery + Tray Validity.
 * Ensures every valid tray has at least one purchase opportunity.
 */

import type { DiscountOpportunityInsight } from "@/lib/intelligence/discountOpportunityEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

export type TrayValidityAssessment = {
  valid: boolean;
  reason: string;
  validCount: number;
  brokenCount: number;
};

export type BuyReadyRecoveryResult = {
  recovered: boolean;
  link: string | null;
  message: string;
};

function isMateriallyInvalid(product: QuantProductLite): boolean {
  return (
    !product.title?.trim() ||
    product.price <= 0 ||
    product.trustScore < 28 ||
    product.qualityScore < 30
  );
}

type QuantProductLite = {
  title: string;
  price: number;
  trustScore: number;
  qualityScore: number;
  link: string;
};

/** Assess whether tray can support BUY READY recovery. */
export function assessTrayValidity(
  decisions: Map<string, UniversalProductDecision>,
  productsByLink: Map<string, { product: { title: string; price: number; link: string }; searchQuery: string }>
): TrayValidityAssessment {
  let validCount = 0;
  let brokenCount = 0;

  for (const [link, decision] of decisions) {
    const row = productsByLink.get(link);
    if (!row) continue;
    const intel = decision.productIntelligence;
    const invalid = isMateriallyInvalid({
      title: row.product.title,
      price: row.product.price,
      link,
      trustScore: intel?.merchantTrustScore ?? intel?.trustScore ?? 50,
      qualityScore: intel?.productQualityScore ?? 50,
    });
    if (invalid) brokenCount += 1;
    else validCount += 1;
  }

  if (validCount === 0) {
    return { valid: false, reason: "all_results_invalid_or_untrusted", validCount, brokenCount };
  }

  return { valid: true, reason: "tray_has_valid_products", validCount, brokenCount };
}

/** Recover BUY READY when tray is valid but none assigned. */
export function recoverBuyReadyIfMissing(args: {
  assignments: Map<string, PrimaryVerdict>;
  rankedLinks: string[];
  validity: TrayValidityAssessment;
  opportunityScoreByLink: Map<string, number>;
}): BuyReadyRecoveryResult {
  const { assignments, rankedLinks, validity, opportunityScoreByLink } = args;
  const hasBuy = [...assignments.values()].some((v) => v === "BUY READY");
  if (hasBuy) {
    return { recovered: false, link: null, message: "BUY READY already present" };
  }
  if (!validity.valid) {
    return { recovered: false, link: null, message: "Tray too weak for BUY READY recovery" };
  }

  const candidate =
    rankedLinks.find((link) => assignments.get(link) !== "AVOID") ??
    rankedLinks[0] ??
    null;

  if (!candidate) {
    return { recovered: false, link: null, message: "No candidate for recovery" };
  }

  assignments.set(candidate, "BUY READY");
  const score = opportunityScoreByLink.get(candidate) ?? 0;
  return {
    recovered: true,
    link: candidate,
    message:
      score >= 70
        ? "Strongest purchase opportunity in this result set."
        : "Best available option in this result set, not absolute market perfection.",
  };
}

/** Score purchase opportunity for BUY READY candidacy. */
export function computePurchaseOpportunityScore(args: {
  decision: UniversalProductDecision;
  discount?: DiscountOpportunityInsight;
  personalScore?: number;
}): number {
  const intel = args.decision.productIntelligence;
  const discount = args.discount;
  let score = args.personalScore ?? intel?.personalCommerceScore?.personalCommerceScore ?? 50;

  if (discount) {
    score += discount.priceAdvantageScore * 0.12;
    score += discount.discountScore * 0.08;
    if (discount.priceOpportunityLabel === "STRONG DISCOUNT") score += 8;
    if (discount.priceOpportunityLabel === "BETTER PRICE FOUND") score -= 6;
    if (discount.priceOpportunityLabel === "OVERPRICED") score -= 12;
  }

  score += (intel?.merchantTrustScore ?? 50) * 0.08;
  score += (intel?.marketOpportunityScore ?? 50) * 0.06;

  return Math.max(0, Math.min(100, Math.round(score)));
}
