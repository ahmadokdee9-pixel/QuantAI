/**
 * Phase 39 — No-Contradiction Engine.
 * Validates verdict, confidence, and reasoning consistency before render.
 */

import type { CalibratedConfidence } from "@/lib/intelligence/confidenceCalibrationEngine";
import { isConfidenceVerdictAligned } from "@/lib/intelligence/confidenceCalibrationEngine";
import type { WaitExplanation } from "@/lib/intelligence/waitExplanationEngine";
import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";

export type ContradictionReport = {
  valid: boolean;
  issues: string[];
  fixes: string[];
};

export function validateDecisionConsistency(args: {
  verdict: PrimaryVerdict;
  confidence: CalibratedConfidence;
  waitExplanation?: WaitExplanation;
  hasObviousWinner?: boolean;
  trustedFairPrice?: boolean;
  reasoningPresent?: boolean;
}): ContradictionReport {
  const issues: string[] = [];
  const fixes: string[] = [];

  if (args.verdict === "BUY READY" && args.confidence.confidence < 70) {
    issues.push("BUY READY with confidence below 70%");
    fixes.push("Raise confidence to BUY READY band minimum");
  }

  if (args.verdict === "BUY READY" && args.confidence.band === "STRONG BUY" && args.confidence.confidence < 85) {
    issues.push("STRONG BUY label with confidence below 85%");
    fixes.push("Raise confidence to STRONG BUY band minimum");
  }

  if (args.verdict === "WAIT" && (!args.waitExplanation || !args.waitExplanation.evidenceBacked)) {
    issues.push("WAIT without evidence-backed prediction");
    fixes.push("Promote to BUY READY or COMPARE when wait evidence missing");
  }

  if (args.verdict === "COMPARE" && args.hasObviousWinner) {
    issues.push("COMPARE when obvious winner exists");
    fixes.push("Promote strongest offer to BUY READY");
  }

  if (args.verdict === "AVOID" && args.trustedFairPrice) {
    issues.push("AVOID on trusted fair-price product");
    fixes.push("Downgrade to BUY READY or COMPARE");
  }

  if (!args.reasoningPresent) {
    issues.push("Missing product-specific reasoning");
    fixes.push("Attach buyer decision intelligence");
  }

  if (!isConfidenceVerdictAligned(args.verdict, args.confidence.confidence, args.confidence.band === "STRONG BUY")) {
    issues.push("Confidence not aligned with verdict band");
    fixes.push("Recalibrate confidence");
  }

  return { valid: issues.length === 0, issues, fixes };
}

/** Apply automatic fixes for common contradictions. */
export function resolveContradictions(args: {
  verdict: PrimaryVerdict;
  confidence: CalibratedConfidence;
  waitExplanation?: WaitExplanation;
  hasObviousWinner?: boolean;
  trustedFairPrice?: boolean;
}): { verdict: PrimaryVerdict; confidence: CalibratedConfidence; promoted: boolean } {
  let verdict = args.verdict;
  let confidence = args.confidence;
  let promoted = false;

  if (verdict === "WAIT" && (!args.waitExplanation || !args.waitExplanation.evidenceBacked)) {
    verdict = "BUY READY";
    promoted = true;
  }

  if (verdict === "COMPARE" && args.hasObviousWinner) {
    verdict = "BUY READY";
    promoted = true;
  }

  if (verdict === "AVOID" && args.trustedFairPrice) {
    verdict = "COMPARE";
    promoted = true;
  }

  if (verdict === "BUY READY" && confidence.confidence < 70) {
    confidence = { ...confidence, confidence: 70, aligned: true };
  }

  return { verdict, confidence, promoted };
}
