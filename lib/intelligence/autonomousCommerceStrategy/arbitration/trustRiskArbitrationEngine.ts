/**
 * Phase 15 — Trust-risk arbitration engine.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function arbitrateTrustRisk(args: {
  trust01: number;
  risk01: number;
  balance01: number;
}): { allowed: boolean; arbitrationScore01: number } {
  const arbitrationScore01 = round4(args.balance01 * 0.6 + args.trust01 * 0.3 - args.risk01 * 0.2);
  return { allowed: arbitrationScore01 >= 0.35, arbitrationScore01 };
}
