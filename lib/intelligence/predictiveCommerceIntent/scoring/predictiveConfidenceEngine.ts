/**
 * Phase 14 — Predictive confidence engine.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computePredictiveConfidence(args: {
  fusedScore01: number;
  readiness01: number;
  purchaseProbability01: number;
  trustEnabled: boolean;
  governanceAllowed: boolean;
}): number {
  if (!args.governanceAllowed) return 0;
  return round4(
    clamp01(
      args.fusedScore01 * 0.35 +
        args.readiness01 * 0.3 +
        args.purchaseProbability01 * 0.25 +
        (args.trustEnabled ? 0.1 : 0.05)
    )
  );
}
