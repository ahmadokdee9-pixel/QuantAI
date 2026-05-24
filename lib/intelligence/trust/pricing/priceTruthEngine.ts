/**
 * Phase 5 — Price truth engine (fake discount + MSRP + anomalies).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { PriceTruthProfile } from "../types";
import { detectIdentityFakeDiscount } from "@/lib/intelligence/identity/pricing/fakeDiscountDetector";
import { resolveTrayBaselines } from "./historicalPriceResolver";
import { evaluateMsrpIntegrity } from "./msrpIntegrityEngine";
import { detectPriceAnomalies } from "./priceAnomalyDetector";
import { resolveProductIdentity } from "@/lib/intelligence/identity/productIdentityResolver";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function trayMedian(products: QuantProduct[]): number {
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  if (!prices.length) return 0;
  return prices[Math.floor(prices.length / 2)] ?? 0;
}

export type PriceTruthEngineResult = {
  byCommerceId: Record<string, PriceTruthProfile>;
  alertCount: number;
};

export function runPriceTruthEngine(products: QuantProduct[]): PriceTruthEngineResult {
  const baselines = resolveTrayBaselines(products);
  const med = trayMedian(products);
  const byCommerceId: Record<string, PriceTruthProfile> = {};
  let alertCount = 0;

  for (const p of products) {
    const commerceId =
      p.qiNormalizedCommerce?.commerceId ?? resolveProductIdentity(p).commerceId;
    if (byCommerceId[commerceId]) continue;

    const baseline = baselines.get(commerceId)!;
    const fake = detectIdentityFakeDiscount(p, products);
    const msrp = evaluateMsrpIntegrity(p, products);
    const anomaly = detectPriceAnomalies(p, baseline, med);

    const fakeDiscountRisk01 = round4(
      clamp01(fake.fakeDiscountProbability * 0.5 + fake.discountManipulationRisk * 0.3 + fake.suspiciousMsrpSpike01 * 0.2)
    );
    const priceTruthScore = round4(
      clamp01(
        (1 - fakeDiscountRisk01) * 0.4 +
          msrp.msrpIntegrity01 * 0.3 +
          (1 - anomaly.anomalySpike01) * 0.2 +
          baseline.confidence01 * 0.1
      ) * 100
    );

    const reasons = [
      ...fake.explanations,
      ...msrp.reasons,
      ...anomaly.reasons,
    ];

    if (fakeDiscountRisk01 >= 0.5 || msrp.msrpIntegrity01 < 0.5) alertCount += 1;

    byCommerceId[commerceId] = {
      commerceId,
      baselinePrice: baseline.baselinePrice,
      currentPrice: p.price,
      priceTruthScore,
      fakeDiscountRisk01,
      msrpIntegrity01: msrp.msrpIntegrity01,
      anomalySpike01: anomaly.anomalySpike01,
      unrealisticSale01: anomaly.unrealisticSale01,
      historicalConfidence01: baseline.confidence01,
      reasons,
    };
  }

  return { byCommerceId, alertCount };
}
