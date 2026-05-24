/**
 * Phase 8 — Affordability context engine.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { EconomicContextProfile } from "../types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computeAffordabilityContext(args: {
  products: QuantProduct[];
  economic: EconomicContextProfile;
  sessionMemory: CommerceSessionMemoryV1;
}): { affordabilityFit01: number; comfortGap01: number } {
  const prices = args.products.map((p) => p.price).filter((n) => n > 0);
  const med = prices.length ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]! : 0;
  const comfort = args.sessionMemory.priceComfortCenter || med;
  const comfortGap01 =
    comfort > 0 && med > 0 ? round4(clamp01(Math.abs(med - comfort) / comfort)) : 0.35;
  const affordabilityFit01 = round4(
    clamp01(
      args.economic.seasonalAffordability01 * 0.4 +
        (1 - comfortGap01) * 0.35 +
        (1 - args.economic.inflationSensitive01) * 0.25
    )
  );
  return { affordabilityFit01, comfortGap01 };
}
