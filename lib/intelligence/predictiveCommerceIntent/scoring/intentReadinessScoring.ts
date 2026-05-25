/**
 * Phase 14 — Intent readiness scoring.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreIntentReadiness(args: {
  query: string;
  interactionCount: number;
  intentPersistence01: number;
}): { readiness01: number; label: string } {
  const q = args.query.toLowerCase();
  let readiness01 = args.intentPersistence01 * 0.5 + Math.min(0.3, args.interactionCount / 25);
  if (/\b(buy|checkout|order|ready to)\b/.test(q)) readiness01 += 0.25;
  if (/\b(compare|research|maybe)\b/.test(q)) readiness01 -= 0.1;
  readiness01 = round4(clamp01(readiness01));
  const label = readiness01 > 0.6 ? "ready" : readiness01 > 0.35 ? "warming" : "exploratory";
  return { readiness01, label };
}
