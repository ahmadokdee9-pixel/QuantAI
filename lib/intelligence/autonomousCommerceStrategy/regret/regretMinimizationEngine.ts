/**
 * Phase 15 — Commerce regret minimization.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function minimizeCommerceRegret(args: {
  risk01: number;
  volatilityStrategy01: number;
  trust01: number;
}): { regret01: number; minimized: boolean } {
  const regret01 = round4(clamp01(args.risk01 * 0.5 + args.volatilityStrategy01 * 0.35 - args.trust01 * 0.15));
  return { regret01, minimized: regret01 < 0.42 };
}
