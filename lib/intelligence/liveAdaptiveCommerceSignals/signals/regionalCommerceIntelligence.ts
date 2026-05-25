/**
 * Phase 12 — Regional commerce dynamics layer.
 */

import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function analyzeRegionalCommerceDynamics(args: {
  query: string;
  commerceOs?: AutonomousCommerceOsResult | null;
}): { regionalPressure01: number; regionLabel: string } {
  const q = args.query.toLowerCase();
  const economic = args.commerceOs?.economic;
  let regionalPressure01 = economic?.regionalPattern01 ?? 0.25;

  if (/\b(nl|netherlands|dutch|eu|europe|uk|us|de|germany)\b/.test(q)) {
    regionalPressure01 = round4(clamp01(regionalPressure01 + 0.25));
  }
  if (/\b(global|worldwide|import)\b/.test(q)) {
    regionalPressure01 = round4(clamp01(regionalPressure01 + 0.15));
  }

  const regionLabel = /\bnl\b|netherlands|dutch/.test(q)
    ? "nl"
    : /\beu\b|europe/.test(q)
      ? "eu"
      : /\bus\b|usa/.test(q)
        ? "us"
        : "global";

  return { regionalPressure01: round4(clamp01(regionalPressure01)), regionLabel };
}
