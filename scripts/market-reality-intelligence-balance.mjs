/**
 * P6.5 — Market reality intelligence balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, runMarketRealityPartitions } from "./lib/marketRealityRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const ok =
    m.verifiedPricingContinuity >= 0 &&
    m.verifiedPricingContinuity <= 1 &&
    m.trustedMerchantStability >= 0 &&
    m.trustedMerchantStability <= 1 &&
    m.analytics.harmonyAnalytics >= 40;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} pricing=${m.verifiedPricingContinuity} merchant=${m.trustedMerchantStability}`);
  } else {
    console.log(`OK ${trayId} pricing=${m.verifiedPricingContinuity} merchant=${m.trustedMerchantStability} harmony=${m.analytics.harmonyAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-balance", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-balance");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence balance passed");
