/**
 * Phase 14 — Deterministic future-state modeling.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function modelDeterministicFutureState(args: {
  purchaseProbability01: number;
  readiness01: number;
  lifecycleForecast01: number;
}): { stateLabel: string; confidence01: number } {
  const confidence01 = round4(
    Math.min(0.85, args.purchaseProbability01 * 0.5 + args.readiness01 * 0.35 + args.lifecycleForecast01 * 0.15)
  );
  const stateLabel =
    confidence01 > 0.6
      ? "high_intent_future"
      : confidence01 > 0.35
        ? "moderate_intent_future"
        : "low_intent_future";
  return { stateLabel, confidence01 };
}
