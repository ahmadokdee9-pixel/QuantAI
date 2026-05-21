/**
 * P5.8 — Trust/volatility integrity under market layer.
 * Usage: npm run test:market-integrity
 */
import {
  isMarketIntelligenceEnabled,
  isMarketIntelligenceEnvironmentAllowed,
  isMarketIntelligenceMutationEnabled,
} from "../lib/market/marketIntelligence.ts";
import { MARKET_MAX_TRUST_AMPLIFICATION, MARKET_MAX_VOLATILITY_AMPLIFICATION } from "../lib/market/marketFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const ok =
    m.marketTrust <= MARKET_MAX_TRUST_AMPLIFICATION &&
    m.marketVolatility <= MARKET_MAX_VOLATILITY_AMPLIFICATION &&
    m.analytics.trustAnalytics >= 0 &&
    m.monitoring.volatilityAmplification &&
    m.monitoring.trustAmplification;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trust: m.marketTrust, volatility: m.marketVolatility });
  } else {
    console.log(`OK ${trayId} trust=${m.marketTrust} volatility=${m.marketVolatility}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MARKET_INTELLIGENCE_ENABLED = "true";
process.env.MARKET_INTELLIGENCE_MODE = "bounded-market";
delete process.env.MARKET_INTELLIGENCE_PROD_APPLY;
delete process.env.MARKET_INTELLIGENCE_CANARY_APPLY;
const blocked = isMarketIntelligenceEnabled() && !isMarketIntelligenceMutationEnabled() && !isMarketIntelligenceEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production market blocked without opt-in");
} else {
  console.log("OK production market blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "market-integrity", phase: "P5.8", pass: failed === 0 }, "market-integrity");

if (failed) process.exit(1);
console.log("\nMarket intelligence integrity passed");
