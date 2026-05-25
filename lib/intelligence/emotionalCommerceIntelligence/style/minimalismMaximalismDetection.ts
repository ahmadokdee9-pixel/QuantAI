/**
 * Phase 17 — Minimalism / maximalism detection.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function detectMinimalismMaximalism(args: {
  minimalist01: number;
  maximalist01: number;
}): { pole: "minimal" | "maximal" | "balanced"; strength01: number } {
  const diff = args.maximalist01 - args.minimalist01;
  const pole: "minimal" | "maximal" | "balanced" =
    diff > 0.12 ? "maximal" : diff < -0.12 ? "minimal" : "balanced";
  return { pole, strength01: round4(Math.abs(diff)) };
}
