/**
 * Phase 12 — Macro commerce timing (calendar + query, deterministic).
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function resolveMacroCommerceTiming(query: string, nowMs = Date.now()): {
  macroScore01: number;
  timingLabel: string;
} {
  const q = query.toLowerCase();
  const month = new Date(nowMs).getUTCMonth();
  const seasonalBase = [0.35, 0.3, 0.35, 0.4, 0.45, 0.5, 0.45, 0.4, 0.5, 0.65, 0.75, 0.8][month] ?? 0.4;

  let queryBoost = 0;
  if (/\b(black friday|cyber monday|prime day|holiday|christmas)\b/.test(q)) queryBoost += 0.35;
  if (/\b(end of season|clearance|back to school)\b/.test(q)) queryBoost += 0.2;
  if (/\b(launch|preorder|new year)\b/.test(q)) queryBoost += 0.15;

  const macroScore01 = round4(clamp01(seasonalBase * 0.6 + queryBoost * 0.4));
  const timingLabel =
    macroScore01 > 0.65 ? "peak_commerce_window" : macroScore01 < 0.35 ? "off_peak" : "neutral_macro";
  return { macroScore01, timingLabel };
}
