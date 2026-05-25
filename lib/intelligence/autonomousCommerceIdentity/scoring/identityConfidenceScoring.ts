/**
 * Phase 13 — Identity confidence scoring.
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreIdentityConfidence(args: {
  fusedScore01: number;
  continuity01: number;
  maturity01: number;
  stability01: number;
  trustEnabled: boolean;
}): number {
  return round4(
    clamp01(
      args.fusedScore01 * 0.35 +
        args.continuity01 * 0.25 +
        args.maturity01 * 0.2 +
        args.stability01 * 0.15 +
        (args.trustEnabled ? 0.05 : 0)
    )
  );
}
