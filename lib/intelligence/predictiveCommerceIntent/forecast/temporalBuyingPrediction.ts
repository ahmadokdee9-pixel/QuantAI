/**
 * Phase 14 — Temporal buying prediction.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function predictTemporalBuying(args: {
  readiness01: number;
  urgency01: number;
  macroScore01: number;
}): { horizon: string; score01: number } {
  const score01 = round4(
    Math.min(1, args.readiness01 * 0.5 + args.urgency01 * 0.3 + args.macroScore01 * 0.2)
  );
  const horizon =
    score01 > 0.65 ? "immediate" : score01 > 0.4 ? "session" : score01 > 0.25 ? "seasonal" : "distant";
  return { horizon, score01 };
}
