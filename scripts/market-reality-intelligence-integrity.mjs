/**
 * P6.5 — Market reality intelligence integrity validation.
 */
import { MARKET_REALITY_MAX_DELTA } from "../lib/marketReality/marketRealityFlags.ts";
import {
  isMarketRealityIntelligenceEnabled,
  isMarketRealityIntelligenceEnvironmentAllowed,
} from "../lib/marketReality/marketRealityIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV, runMarketRealityPartitions } from "./lib/marketRealityRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const pass = m.realityDelta <= MARKET_REALITY_MAX_DELTA && m.analytics.replayIntegrityAnalytics >= 60;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId} delta=${m.realityDelta}`);
  } else {
    console.log(`OK ${trayId} delta=${m.realityDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MARKET_REALITY_INTELLIGENCE_ENABLED = "true";
process.env.MARKET_REALITY_INTELLIGENCE_MODE = "bounded-reality";
delete process.env.MARKET_REALITY_INTELLIGENCE_PROD_APPLY;
delete process.env.MARKET_REALITY_INTELLIGENCE_CANARY_APPLY;
const blocked = isMarketRealityIntelligenceEnabled() && !isMarketRealityIntelligenceEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-integrity", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-integrity");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence integrity passed");
