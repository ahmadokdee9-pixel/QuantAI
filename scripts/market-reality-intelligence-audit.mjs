/**
 * P6.5 — Market reality intelligence audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MARKET_REALITY_MAX_DELTA } from "../lib/marketReality/marketRealityFlags.ts";
import { MARKET_REALITY_INTELLIGENCE_PROFILES } from "../lib/marketReality/marketRealityProfiles.ts";
import {
  isMarketRealityIntelligenceEnabled,
  isMarketRealityIntelligenceMutationEnabled,
} from "../lib/marketReality/marketRealityIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV,
  MARKET_REALITY_INTELLIGENCE_TELEMETRY_ENV,
  runMarketRealityPartitions,
} from "./lib/marketRealityRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, marketRealityIntelligence: m } of runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV)) {
  const ok =
    m.version === "market-reality-intelligence-v1" &&
    m.realityDelta <= MARKET_REALITY_MAX_DELTA &&
    m.realityScore >= 30 &&
    typeof m.mutationApplied === "boolean";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.realityScore} delta=${m.realityDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("marketRealityIntelligence") || !route.includes("applyControlledMarketRealityIntelligence")) {
  failed += 1;
  console.error("FAIL meta.marketRealityIntelligence not wired");
} else {
  console.log("OK meta.marketRealityIntelligence wired");
}

if (MARKET_REALITY_INTELLIGENCE_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL market reality profiles count");
} else {
  console.log(`OK market reality profiles: ${MARKET_REALITY_INTELLIGENCE_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MARKET_REALITY_INTELLIGENCE_ENABLED = "true";
process.env.MARKET_REALITY_INTELLIGENCE_MODE = "telemetry-only";
delete process.env.MARKET_REALITY_INTELLIGENCE_PROD_APPLY;
delete process.env.MARKET_REALITY_INTELLIGENCE_CANARY_APPLY;
const prodBlocked = isMarketRealityIntelligenceEnabled() && !isMarketRealityIntelligenceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production market reality mutation blocked");
} else {
  console.log("OK production market reality OFF by default");
}

clearIntentMemoryStore();
if (runMarketRealityPartitions(MARKET_REALITY_INTELLIGENCE_TELEMETRY_ENV).some((r) => r.marketRealityIntelligence.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

if (/userProfile|personalizationMemory|userTasteProfile|embeddingReality/.test(route)) {
  failed += 1;
  console.error("FAIL personalization patterns in search route");
} else {
  console.log("OK no personalization in route");
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-audit", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-audit");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence audit passed");
