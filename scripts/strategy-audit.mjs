/**
 * P5.7 — Strategy audit (telemetry, production OFF, caps).
 * Usage: npm run test:strategy-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STRATEGY_MAX_DELTA } from "../lib/strategy/strategyFlags.ts";
import { STRATEGY_PROFILES } from "../lib/strategy/strategyProfiles.ts";
import {
  isStrategyIntelligenceEnabled,
  isStrategyIntelligenceMutationEnabled,
} from "../lib/strategy/strategyIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { STRATEGY_BOUNDED_ENV, STRATEGY_TELEMETRY_ENV, runStrategyPartitions } from "./lib/strategyRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runStrategyPartitions(STRATEGY_BOUNDED_ENV);

for (const { trayId, strategyIntelligence: s } of rows) {
  const ok =
    s.version === "strategy-intelligence-v1" &&
    s.strategyDelta <= STRATEGY_MAX_DELTA &&
    s.strategyScore >= 30 &&
    typeof s.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, s);
  } else {
    console.log(`OK ${trayId} score=${s.strategyScore} delta=${s.strategyDelta} mutation=${s.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("strategyIntelligence") || !route.includes("applyControlledStrategyIntelligence")) {
  failed += 1;
  console.error("FAIL meta.strategyIntelligence not wired");
} else {
  console.log("OK meta.strategyIntelligence wired");
}

if (STRATEGY_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL strategy profiles count");
} else {
  console.log(`OK strategy profiles: ${STRATEGY_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.STRATEGY_INTELLIGENCE_ENABLED = "true";
process.env.STRATEGY_INTELLIGENCE_MODE = "telemetry-only";
delete process.env.STRATEGY_INTELLIGENCE_PROD_APPLY;
delete process.env.STRATEGY_INTELLIGENCE_CANARY_APPLY;
const prodBlocked = isStrategyIntelligenceEnabled() && !isStrategyIntelligenceMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production strategy mutation blocked");
} else {
  console.log("OK production strategy mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runStrategyPartitions(STRATEGY_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.strategyIntelligence.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "strategy-audit", phase: "P5.7", pass: failed === 0 }, "strategy-audit");

if (failed) process.exit(1);
console.log("\nStrategy intelligence audit passed");
