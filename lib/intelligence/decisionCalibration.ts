/**
 * Calibrated decision confidence — honest caps when identity or tray signals are weak.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";
import { assessModelGenerationConflict } from "@/lib/intelligence/modelGenerationGuard";
import { assessStructuredProductIdentity } from "@/lib/intelligence/productIdentity";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type CalibratedDecisionConfidence = {
  score: number;
  tier: "high" | "moderate" | "low";
  honestCapApplied: boolean;
  reasons: string[];
};

export function calibrateDecisionConfidence(args: {
  product: QuantProduct;
  rawConfidence: number;
  canonicalQuery?: CanonicalQueryContract;
}): CalibratedDecisionConfidence {
  const { product, rawConfidence, canonicalQuery } = args;
  const reasons: string[] = [];
  let score = Math.min(100, Math.max(0, Math.round(rawConfidence)));

  const structured = assessStructuredProductIdentity({
    product,
    canonicalQuery,
    listingIdentity: product.qiListingIdentity ?? null,
  });
  const gen = assessModelGenerationConflict(product, canonicalQuery);
  const trust = getStoreTrustScore(product.store);

  if (structured.relation === "wrong_product" || structured.relation === "fake_placeholder") {
    score = Math.min(score, 28);
    reasons.push("identity_mismatch");
  } else if (!structured.isMainProduct) {
    score = Math.min(score, 42);
    reasons.push("not_main_product");
  } else if (structured.relation === "compatible_item" || structured.relation === "accessory") {
    score = Math.min(score, 48);
    reasons.push("accessory_or_compatible");
  }

  if (gen.conflict) {
    score = Math.min(score, Math.round(55 - gen.severity01 * 22));
    reasons.push(gen.reason ?? "generation_conflict");
  }

  if (structured.confidence01 < 0.42) {
    score = Math.min(score, 52);
    reasons.push("low_identity_confidence");
  }

  if (trust < 50) {
    score = Math.min(score, 58);
    reasons.push("weak_seller_trust");
  }
  if (trust < 42) {
    score = Math.min(score, 48);
    reasons.push("very_weak_seller_trust");
  }

  const gate = product.qiIdentityGate;
  if (gate && gate.identityGatePassed === false) {
    score = Math.min(score, 46);
    reasons.push("identity_gate_failed");
  }
  if (gate && gate.exactMatchPassed === false && canonicalQuery?.marketMode === "exact_sku") {
    score = Math.min(score, 54);
    reasons.push("exact_match_not_passed");
  }

  const mismatch = product.qiListingIdentity?.semanticMismatchPenalty01 ?? 0;
  if (mismatch >= 0.55) {
    score = Math.min(score, Math.round(50 - mismatch * 12));
    reasons.push("semantic_mismatch");
  }
  if (mismatch >= 0.72) {
    score = Math.min(score, 38);
    reasons.push("high_semantic_mismatch");
  }

  const honestCapApplied = score < rawConfidence - 4;
  const tier: CalibratedDecisionConfidence["tier"] =
    score >= 74 ? "high" : score >= 58 ? "moderate" : "low";

  return { score, tier, honestCapApplied, reasons: reasons.slice(0, 4) };
}
