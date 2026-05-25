/**
 * Phase 12 — Bounded adaptive commerce forecasting (shadow only).
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const MAX_FORECAST = 0.85;

export function buildBoundedAdaptiveForecast(args: {
  momentum01: number;
  macroScore01: number;
  demandShift01: number;
  volatility01: number;
  governanceAllowed: boolean;
}): { horizon: string; forecast01: number; bounded: true } {
  if (!args.governanceAllowed) {
    return { horizon: "blocked", forecast01: 0, bounded: true };
  }
  const raw =
    args.momentum01 * 0.35 +
    args.macroScore01 * 0.25 +
    args.demandShift01 * 0.25 -
    args.volatility01 * 0.15;
  const forecast01 = round4(clamp01(Math.min(MAX_FORECAST, Math.max(0, raw))));
  const horizon =
    forecast01 > 0.6 ? "session_to_seasonal" : forecast01 > 0.35 ? "session" : "immediate";
  return { horizon, forecast01, bounded: true };
}
