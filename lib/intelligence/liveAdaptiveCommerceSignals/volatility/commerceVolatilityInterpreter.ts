/**
 * Phase 12 — Commerce volatility interpretation.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function interpretCommerceVolatility(args: {
  products: QuantProduct[];
  commerceOs?: AutonomousCommerceOsResult | null;
}): { volatility01: number; band: "low" | "moderate" | "elevated" } {
  const prices = args.products.map((p) => p.price).filter((n) => n > 0);
  const spread =
    prices.length > 1
      ? (Math.max(...prices) - Math.min(...prices)) / (prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;
  const merchantVol = args.commerceOs?.market?.merchantVolatility01 ?? 0.2;
  const volatility01 = round4(clamp01(spread * 0.45 + merchantVol * 0.55));
  const band: "low" | "moderate" | "elevated" =
    volatility01 > 0.55 ? "elevated" : volatility01 < 0.28 ? "low" : "moderate";
  return { volatility01, band };
}
