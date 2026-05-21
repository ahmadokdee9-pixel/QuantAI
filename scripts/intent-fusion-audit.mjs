/**
 * P5.4 — Fusion audit (telemetry, production OFF, caps).
 * Usage: npm run test:intent-fusion-audit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTENT_FUSION_MAX_DELTA } from "../lib/intent/intentFusionFlags.ts";
import { INTENT_FUSION_PROFILES } from "../lib/intent/intentFusionProfiles.ts";
import {
  isIntentFusionEnabled,
  isIntentFusionMutationEnabled,
} from "../lib/intent/intentFusion.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, FUSION_TELEMETRY_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok =
    f.version === "intent-fusion-v1" &&
    f.fusionDelta <= INTENT_FUSION_MAX_DELTA &&
    f.fusionScore >= 30 &&
    typeof f.mutationApplied === "boolean";

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, f);
  } else {
    console.log(`OK ${trayId} score=${f.fusionScore} delta=${f.fusionDelta} mutation=${f.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("intentFusion") || !route.includes("applyControlledIntentFusion")) {
  failed += 1;
  console.error("FAIL meta.intentFusion not wired");
} else {
  console.log("OK meta.intentFusion wired");
}

if (INTENT_FUSION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL fusion profiles count");
} else {
  console.log(`OK fusion profiles: ${INTENT_FUSION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.INTENT_FUSION_ENABLED = "true";
process.env.INTENT_FUSION_MODE = "telemetry-only";
delete process.env.INTENT_FUSION_PROD_APPLY;
delete process.env.INTENT_FUSION_CANARY_APPLY;
const prodBlocked = isIntentFusionEnabled() && !isIntentFusionMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production fusion mutation blocked");
} else {
  console.log("OK production fusion mutation OFF by default");
}

clearIntentMemoryStore();
const telemetryRows = runFusionPartitions(FUSION_TELEMETRY_ENV);
if (telemetryRows.some((r) => r.fusion.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

saveLiveObservabilityRun({ suite: "intent-fusion-audit", phase: "P5.4", pass: failed === 0 }, "intent-fusion-audit");

if (failed) process.exit(1);
console.log("\nIntent fusion audit passed");
