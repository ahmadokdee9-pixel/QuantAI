/**
 * Phase 6 — Confidence decay engine (older interactions weigh less).
 */

const DECAY_HALF_LIFE_INTERACTIONS = 8;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Exponential decay by interaction count (deterministic). */
export function applyConfidenceDecay(args: {
  rawConfidence01: number;
  interactionCount: number;
}): number {
  const n = Math.max(0, args.interactionCount);
  const decay = Math.pow(0.5, n / DECAY_HALF_LIFE_INTERACTIONS);
  return round4(clamp01(args.rawConfidence01 * (0.55 + decay * 0.45)));
}
