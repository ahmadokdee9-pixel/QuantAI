/**
 * Phase 12 — Merchant ecosystem movement.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function trackMerchantEcosystemMovement(args: {
  products: QuantProduct[];
  commerceOs?: AutonomousCommerceOsResult | null;
}): { movement01: number; storeDiversity01: number } {
  const stores = new Set(args.products.map((p) => p.store.trim().toLowerCase()));
  const storeDiversity01 = round4(clamp01(stores.size / Math.max(1, args.products.length)));
  const volatility = args.commerceOs?.market?.merchantVolatility01 ?? storeDiversity01;
  const movement01 = round4(clamp01(volatility * 0.55 + storeDiversity01 * 0.45));
  return { movement01, storeDiversity01 };
}
