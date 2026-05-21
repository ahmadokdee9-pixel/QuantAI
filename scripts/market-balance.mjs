/**
 * P5.8 — Market balancing (trust/momentum, continuity, pricing).
 * Usage: npm run test:market-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const ok =
    m.analytics.trustAnalytics >= 1 &&
    m.analytics.pricingAnalytics >= 0 &&
    !m.monitoring.categoryDrift &&
    m.monitoring.rankingContinuityValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trust: m.analytics.trustAnalytics,
      pricing: m.analytics.pricingAnalytics,
    });
  } else {
    console.log(`OK ${trayId} trust=${m.analytics.trustAnalytics} momentum=${m.marketMomentum}`);
  }
}

saveLiveObservabilityRun({ suite: "market-balance", phase: "P5.8", pass: failed === 0 }, "market-balance");

if (failed) process.exit(1);
console.log("\nMarket intelligence balance passed");
