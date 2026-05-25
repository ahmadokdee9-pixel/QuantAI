/**
 * Phase 12 — Commerce momentum detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function detectCommerceMomentum(args: {
  products: QuantProduct[];
  commerceOs?: AutonomousCommerceOsResult | null;
}): { momentum01: number; acceleration01: number } {
  const market = args.commerceOs?.market;
  const prices = args.products.map((p) => p.price).filter((n) => n > 0);
  const spread =
    prices.length > 1
      ? (Math.max(...prices) - Math.min(...prices)) / (prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;

  const momentum01 = round4(
    clamp01(
      (market?.categoryMomentum01 ?? 0.2) * 0.5 +
        (market?.launchCycle01 ?? 0.2) * 0.3 +
        spread * 0.2
    )
  );
  const acceleration01 = round4(
    clamp01(momentum01 * 0.7 + (market?.seasonalDemand01 ?? 0.25) * 0.3)
  );
  return { momentum01, acceleration01 };
}
