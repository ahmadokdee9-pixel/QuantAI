/**
 * P5.7 — Trust/premium/merchant integrity under strategy layer.
 * Usage: npm run test:strategy-integrity
 */
import {
  isStrategyIntelligenceEnabled,
  isStrategyIntelligenceEnvironmentAllowed,
  isStrategyIntelligenceMutationEnabled,
} from "../lib/strategy/strategyIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok =
    s.strategicTrust <= 0.85 &&
    s.premiumPositioning <= 0.8 &&
    s.analytics.merchantPositioningAnalytics >= 0 &&
    !s.monitoring.strategicInstability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trust: s.strategicTrust, premium: s.premiumPositioning });
  } else {
    console.log(
      `OK ${trayId} trust=${s.strategicTrust} premium=${s.premiumPositioning} merchant=${s.analytics.merchantPositioningAnalytics}`
    );
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.STRATEGY_INTELLIGENCE_ENABLED = "true";
process.env.STRATEGY_INTELLIGENCE_MODE = "bounded-strategy";
delete process.env.STRATEGY_INTELLIGENCE_PROD_APPLY;
delete process.env.STRATEGY_INTELLIGENCE_CANARY_APPLY;
const blocked = isStrategyIntelligenceEnabled() && !isStrategyIntelligenceMutationEnabled() && !isStrategyIntelligenceEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production strategy blocked without opt-in");
} else {
  console.log("OK production strategy blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "strategy-integrity", phase: "P5.7", pass: failed === 0 }, "strategy-integrity");

if (failed) process.exit(1);
console.log("\nStrategy intelligence integrity passed");
