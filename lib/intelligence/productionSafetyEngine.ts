/**
 * Phase 45 — Production Safety Engine.
 * Guarantees no NaN, undefined scores, or invalid recommendation states.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";
import { applyTruthGateToDecision } from "@/lib/truth/truthConfidenceGate";

export type ProductionSafetyResult = {
  safe: boolean;
  issues: string[];
  confidence: number;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
};

const VALID_TIERS: CommerceDecisionTier[] = ["WAIT", "COMPARE", "BUY READY", "STRONG BUY", "BEST DEAL"];
const VALID_VERDICTS: PrimaryVerdict[] = ["BUY READY", "WAIT", "COMPARE", "AVOID", "INSUFFICIENT DATA"];

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function clampScore(n: unknown, fallback = 50, lo = 0, hi = 100): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return fallback;
  return clamp(Math.round(num), lo, hi);
}

function tierToVerdict(tier: CommerceDecisionTier): PrimaryVerdict {
  if (tier === "WAIT") return "WAIT";
  if (tier === "COMPARE") return "COMPARE";
  return "BUY READY";
}

export function sanitizeTier(tier: unknown): CommerceDecisionTier {
  if (typeof tier === "string" && VALID_TIERS.includes(tier as CommerceDecisionTier)) {
    return tier as CommerceDecisionTier;
  }
  return "COMPARE";
}

export function sanitizeVerdict(verdict: unknown, tier: CommerceDecisionTier): PrimaryVerdict {
  if (typeof verdict === "string" && VALID_VERDICTS.includes(verdict as PrimaryVerdict)) {
    if (tier === "WAIT" && verdict !== "WAIT") return "WAIT";
    if (tier === "COMPARE" && verdict === "BUY READY") return "COMPARE";
    if ((tier === "BUY READY" || tier === "STRONG BUY" || tier === "BEST DEAL") && verdict === "WAIT") return "BUY READY";
    return verdict as PrimaryVerdict;
  }
  return tierToVerdict(tier);
}

export function validateProductionDecision(args: {
  link: string;
  tier: CommerceDecisionTier;
  verdict: PrimaryVerdict;
  confidence: number;
}): ProductionSafetyResult {
  const issues: string[] = [];
  let tier = sanitizeTier(args.tier);
  let confidence = clampScore(args.confidence, 65, 45, 98);
  let verdict = sanitizeVerdict(args.verdict, tier);

  if (!Number.isFinite(args.confidence)) issues.push(`${args.link}: confidence was non-finite`);
  if (confidence < 45 || confidence > 98) issues.push(`${args.link}: confidence clamped`);
  // Phase 1A: do not inflate confidence floors — truth gate handles downgrade
  if (tier === "WAIT" && confidence > 68) confidence = 68;

  verdict = sanitizeVerdict(verdict, tier);

  return {
    safe: issues.length === 0,
    issues,
    confidence,
    tier,
    verdict,
  };
}

/** Sanitize a universal product decision for production output. */
export function sanitizeUniversalDecision(decision: UniversalProductDecision): UniversalProductDecision {
  const intel = decision.productIntelligence;
  const tier = sanitizeTier(intel?.buyOpportunityCore?.tier ?? intel?.commerceDecisionCore?.tier ?? "COMPARE");
  const validated = validateProductionDecision({
    link: decision.link,
    tier,
    verdict: decision.verdict,
    confidence: decision.confidence,
  });

  const safeIntel = intel
    ? {
        ...intel,
        opportunity: intel.opportunity
          ? { ...intel.opportunity, score: clampScore(intel.opportunity.score) }
          : intel.opportunity,
        trueValue: intel.trueValue
          ? { ...intel.trueValue, trueValueScore: clampScore(intel.trueValue.trueValueScore) }
          : intel.trueValue,
        categoryValue: intel.categoryValue
          ? { ...intel.categoryValue, qualityScore: clampScore(intel.categoryValue.qualityScore) }
          : intel.categoryValue,
        discountConfidence: intel.discountConfidence
          ? { ...intel.discountConfidence, discountConfidence: clampScore(intel.discountConfidence.discountConfidence) }
          : intel.discountConfidence,
        merchantReliability: intel.merchantReliability
          ? {
              ...intel.merchantReliability,
              merchantReliabilityScore: clampScore(intel.merchantReliability.merchantReliabilityScore),
            }
          : intel.merchantReliability,
        commerceDecisionCore: intel.commerceDecisionCore
          ? {
              ...intel.commerceDecisionCore,
              tier: validated.tier,
              verdict: validated.verdict,
              decisionConfidence: validated.confidence,
              compositeScore: clampScore(intel.commerceDecisionCore.compositeScore),
            }
          : intel.commerceDecisionCore,
        buyOpportunityCore: intel.buyOpportunityCore
          ? { ...intel.buyOpportunityCore, tier: validated.tier, verdict: validated.verdict }
          : intel.buyOpportunityCore,
      }
    : intel;

  const sanitized: UniversalProductDecision = {
    ...decision,
    verdict: validated.verdict,
    confidence: validated.confidence,
    productIntelligence: safeIntel,
  };

  return applyTruthGateToDecision(sanitized);
}

export function validateTraySafety(
  decisions: Map<string, UniversalProductDecision>
): { safe: boolean; issueCount: number; issues: string[] } {
  const issues: string[] = [];
  for (const [link, decision] of decisions) {
    if (!Number.isFinite(decision.confidence)) issues.push(`${link}: invalid confidence`);
    const opp = decision.productIntelligence?.opportunity?.score;
    if (opp !== undefined && !Number.isFinite(opp)) issues.push(`${link}: invalid opportunity score`);
    const tv = decision.productIntelligence?.trueValue?.trueValueScore;
    if (tv !== undefined && !Number.isFinite(tv)) issues.push(`${link}: invalid true value score`);
  }
  return { safe: issues.length === 0, issueCount: issues.length, issues };
}
