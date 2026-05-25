/**
 * Phase 17 — Confidence vs aspiration analysis.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function analyzeConfidenceAspiration(args: {
  styleConfidence01: number;
  aspiration01: number;
  emotionalTrust01: number;
}): { confidence01: number; aspiration01: number } {
  const confidence01 = round4(
    Math.min(1, args.styleConfidence01 * 0.55 + args.emotionalTrust01 * 0.45)
  );
  const aspiration01 = round4(Math.min(1, args.aspiration01 * 0.7 + (1 - confidence01) * 0.15));
  return { confidence01, aspiration01 };
}
