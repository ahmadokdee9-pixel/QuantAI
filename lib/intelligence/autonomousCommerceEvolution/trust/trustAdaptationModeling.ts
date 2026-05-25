/**
 * Phase 18 — Trust adaptation modeling.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function modelTrustAdaptation(args: {
  trust?: TrustEngineResult | null;
}): { adaptation01: number; label: string } {
  const avg = args.trust?.meta.avgTrustScore ?? 0.45;
  const alerts = (args.trust?.meta.fraudAlertCount ?? 0) + (args.trust?.meta.fakeDiscountAlertCount ?? 0);
  const adaptation01 = round4(Math.min(0.1, Math.max(0, 0.06 - alerts * 0.01 + avg * 0.04)));
  const label = adaptation01 > 0.05 ? "trust_calibration_adapting" : "trust_calibration_stable";
  return { adaptation01, label };
}
