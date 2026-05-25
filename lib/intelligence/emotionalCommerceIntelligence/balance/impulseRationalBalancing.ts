/**
 * Phase 17 — Impulse vs rational balancing.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function balanceImpulseRational(args: {
  query: string;
  impulseSignals: number;
}): { impulse01: number; rational01: number; balance: string } {
  const q = args.query.toLowerCase();
  let impulse01 = args.impulseSignals;
  if (/\b(now|urgent|limited|today)\b/.test(q)) impulse01 += 0.35;
  if (/\b(compare|research|review|spec)\b/.test(q)) impulse01 -= 0.2;
  impulse01 = round4(Math.min(1, Math.max(0, impulse01)));
  const rational01 = round4(1 - impulse01 * 0.85);
  const balance =
    impulse01 > 0.55 ? "impulse_leaning" : rational01 > 0.6 ? "rational_leaning" : "balanced_decision";
  return { impulse01, rational01, balance };
}
