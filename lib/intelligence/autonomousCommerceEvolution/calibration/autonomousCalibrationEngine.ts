/**
 * Phase 18 — Autonomous calibration engine (bounded).
 */

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function runAutonomousCalibration(args: {
  fusedScore: number;
  driftSignals: number;
}): { calibration01: number; band: "stable" | "adapting" | "elevated" } {
  const calibration01 = round4(Math.min(1, args.fusedScore * 0.6 + args.driftSignals * 0.15));
  const band: "stable" | "adapting" | "elevated" =
    calibration01 > 0.62 ? "elevated" : calibration01 > 0.38 ? "adapting" : "stable";
  return { calibration01, band };
}
