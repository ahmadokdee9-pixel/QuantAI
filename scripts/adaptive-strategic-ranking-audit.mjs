/**
 * P6.3 — Adaptive strategic ranking audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STRATEGIC_RANKING_MAX_DELTA } from "../lib/strategicRanking/strategicRankingFlags.ts";
import { ADAPTIVE_STRATEGIC_RANKING_PROFILES } from "../lib/strategicRanking/strategicRankingProfiles.ts";
import {
  isAdaptiveStrategicRankingEnabled,
  isAdaptiveStrategicRankingMutationEnabled,
} from "../lib/strategicRanking/strategicRankingIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV,
  ADAPTIVE_STRATEGIC_RANKING_TELEMETRY_ENV,
  runStrategicRankingPartitions,
} from "./lib/strategicRankingRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, adaptiveStrategicRanking: s } of runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV)) {
  const ok =
    s.version === "adaptive-strategic-ranking-v1" &&
    s.strategicRankingDelta <= STRATEGIC_RANKING_MAX_DELTA &&
    s.strategicRankingScore >= 30 &&
    typeof s.mutationApplied === "boolean";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, s);
  } else {
    console.log(`OK ${trayId} score=${s.strategicRankingScore} delta=${s.strategicRankingDelta} mutation=${s.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("adaptiveStrategicRanking") || !route.includes("applyControlledAdaptiveStrategicRanking")) {
  failed += 1;
  console.error("FAIL meta.adaptiveStrategicRanking not wired");
} else {
  console.log("OK meta.adaptiveStrategicRanking wired");
}

if (ADAPTIVE_STRATEGIC_RANKING_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL strategic ranking profiles count");
} else {
  console.log(`OK strategic ranking profiles: ${ADAPTIVE_STRATEGIC_RANKING_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.ADAPTIVE_STRATEGIC_RANKING_ENABLED = "true";
process.env.ADAPTIVE_STRATEGIC_RANKING_MODE = "telemetry-only";
delete process.env.ADAPTIVE_STRATEGIC_RANKING_PROD_APPLY;
delete process.env.ADAPTIVE_STRATEGIC_RANKING_CANARY_APPLY;
const prodBlocked = isAdaptiveStrategicRankingEnabled() && !isAdaptiveStrategicRankingMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production strategic ranking mutation blocked");
} else {
  console.log("OK production strategic ranking OFF by default");
}

clearIntentMemoryStore();
if (runStrategicRankingPartitions(ADAPTIVE_STRATEGIC_RANKING_TELEMETRY_ENV).some((r) => r.adaptiveStrategicRanking.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-audit", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-audit");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking audit passed");
