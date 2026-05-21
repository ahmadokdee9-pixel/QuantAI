/**
 * P5.8 — Market audit (telemetry, production OFF, caps).
 * Usage: npm run test:market-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MARKET_MAX_DELTA } from "../lib/market/marketFlags.ts";
import { MARKET_PROFILES } from "../lib/market/marketProfiles.ts";
import {
  isMarketIntelligenceEnabled,
  isMarketIntelligenceMutationEnabled,
} from "../lib/market/marketIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV, MARKET_TELEMETRY_ENV, runMarketPartitions } from "./lib/marketRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runMarketPartitions(MARKET_BOUNDED_ENV);

for (const { trayId, marketIntelligence: m } of rows) {
  const ok =
    m.version === "market-intelligence-v1" &&
    m.marketDelta <= MARKET_MAX_DELTA &&
    m.marketScore >= 30 &&
    typeof m.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.marketScore} delta=${m.marketDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("marketIntelligence") || !route.includes("applyControlledMarketIntelligence")) {
  failed += 1;
  console.error("FAIL meta.marketIntelligence not wired");
} else {
  console.log("OK meta.marketIntelligence wired");
}

if (MARKET_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL market profiles count");
} else {
  console.log(`OK market profiles: ${MARKET_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MARKET_INTELLIGENCE_ENABLED = "true";
process.env.MARKET_INTELLIGENCE_MODE = "telemetry-only";
delete process.env.MARKET_INTELLIGENCE_PROD_APPLY;
delete process.env.MARKET_INTELLIGENCE_CANARY_APPLY;
const prodBlocked = isMarketIntelligenceEnabled() && !isMarketIntelligenceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production market mutation blocked");
} else {
  console.log("OK production market mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runMarketPartitions(MARKET_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.marketIntelligence.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "market-audit", phase: "P5.8", pass: failed === 0 }, "market-audit");

if (failed) process.exit(1);
console.log("\nMarket intelligence audit passed");
