/**
 * Phase 8 — Market condition resolver (deterministic tray signals).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { MarketConditionProfile } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveMarketConditions(args: {
  query: string;
  products: QuantProduct[];
  trustResult?: TrustEngineResult | null;
}): MarketConditionProfile {
  const q = args.query.toLowerCase();
  const prices = args.products.map((p) => p.price).filter((n) => n > 0);
  const spread =
    prices.length > 1
      ? (Math.max(...prices) - Math.min(...prices)) / (prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0;

  let seasonalDemand01 = 0.25;
  if (/\b(christmas|holiday|black friday|summer|winter|back to school)\b/.test(q)) seasonalDemand01 += 0.45;
  if (/\b(new|launch|2025|2026|latest)\b/.test(q)) seasonalDemand01 += 0.2;

  let pricingPressure01 = round4(clamp01(spread * 0.4));
  if (/\b(deal|sale|discount|clearance)\b/.test(q)) pricingPressure01 = round4(clamp01(pricingPressure01 + 0.35));

  const stores = new Set(args.products.map((p) => p.store.trim().toLowerCase()));
  const merchantVolatility01 = round4(clamp01(stores.size / Math.max(1, args.products.length) * 1.2));

  const fakeAlerts = args.trustResult?.meta.fakeDiscountAlertCount ?? 0;
  const discountAnomaly01 = round4(clamp01(fakeAlerts / 4));

  const categories = new Set(args.products.map((p) => p.qiCategory ?? "general"));
  const categoryMomentum01 = round4(clamp01(categories.size / Math.max(1, args.products.length)));

  const launchCycle01 = /\b(new|launch|preorder|just released)\b/.test(q) ? 0.65 : 0.2;
  const marketSaturation01 = round4(clamp01(args.products.length / 24));

  const lowStockHints = args.products.filter((p) =>
    /limited|low stock|few left/i.test(`${p.availability ?? ""} ${p.title}`)
  ).length;
  const inventoryScarcity01 = round4(clamp01(lowStockHints / Math.max(1, args.products.length) + 0.1));

  return {
    seasonalDemand01: round4(clamp01(seasonalDemand01)),
    pricingPressure01,
    inventoryScarcity01,
    merchantVolatility01,
    discountAnomaly01,
    categoryMomentum01,
    launchCycle01: round4(clamp01(launchCycle01)),
    marketSaturation01,
  };
}
