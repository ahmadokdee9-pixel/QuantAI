/**
 * Phase 15 — Affordability-aware strategy.
 */

import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildAffordabilityStrategy(commerceOs?: AutonomousCommerceOsResult | null): {
  fit01: number;
  label: string;
} {
  const fit = commerceOs?.meta.economic?.fitScore ?? 0.5;
  const fit01 = round4(Math.min(1, Math.max(0, fit)));
  const label = fit01 > 0.55 ? "affordable_fit" : fit01 < 0.3 ? "stretch_budget" : "neutral_fit";
  return { fit01, label };
}
