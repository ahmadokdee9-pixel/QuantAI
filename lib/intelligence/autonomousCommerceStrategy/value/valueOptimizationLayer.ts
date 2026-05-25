/**
 * Phase 15 — Value optimization layer.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function optimizeValueLayer(args: {
  value01: number;
  affordabilityFit01: number;
  premiumBias01: number;
}): number {
  return round4(
    Math.min(1, args.value01 * 0.5 + args.affordabilityFit01 * 0.35 + (1 - args.premiumBias01) * 0.15)
  );
}
