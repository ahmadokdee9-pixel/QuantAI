/**
 * Phase 12 — Live market signal interpretation (deterministic tray + OS).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function interpretLiveMarketSignals(args: {
  query: string;
  products: QuantProduct[];
  commerceOs?: AutonomousCommerceOsResult | null;
}): { liveMarketScore01: number; movementLabel: string } {
  const q = args.query.toLowerCase();
  const market = args.commerceOs?.market;
  const base =
    (market?.categoryMomentum01 ?? 0.2) * 0.35 +
    (market?.seasonalDemand01 ?? 0.25) * 0.3 +
    (market?.pricingPressure01 ?? 0.2) * 0.2 +
    (args.products.length / 24) * 0.15;

  let boost = 0;
  if (/\b(trending|hot|popular|selling fast|high demand)\b/.test(q)) boost += 0.25;
  if (/\b(slow|declining|oversupply|clearance)\b/.test(q)) boost -= 0.2;

  const liveMarketScore01 = round4(clamp01(base + boost));
  const movementLabel =
    liveMarketScore01 > 0.55 ? "accelerating" : liveMarketScore01 < 0.3 ? "cooling" : "stable";
  return { liveMarketScore01, movementLabel };
}
