/**
 * Phase 14 — Future purchase probability.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function estimateFuturePurchaseProbability(args: {
  readiness01: number;
  momentum01: number;
  maturity01: number;
}): { probability01: number; horizon: string } {
  const probability01 = round4(
    clamp01(args.readiness01 * 0.45 + args.momentum01 * 0.35 + args.maturity01 * 0.2)
  );
  const horizon =
    probability01 > 0.6 ? "session" : probability01 > 0.35 ? "near_term" : "distant";
  return { probability01, horizon };
}
