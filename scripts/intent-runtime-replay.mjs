/**
 * P5.0 — Deterministic replay guarantee.
 * Usage: npm run test:intent-runtime-replay
 */
import { validateDeterministicRuntimeReplay } from "../lib/intent/intentRuntimeController.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { RUNTIME_BOUNDED_ENV, runRuntimePartition } from "./lib/intentRuntimeRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  const a = runRuntimePartition(part, RUNTIME_BOUNDED_ENV);
  const b = runRuntimePartition(part, RUNTIME_BOUNDED_ENV);
  const linksA = a.row.runtimeProducts?.map((p) => p.link).join("|") ?? a.row.products.map((p) => p.link).join("|");
  const linksB = b.row.runtimeProducts?.map((p) => p.link).join("|") ?? b.row.products.map((p) => p.link).join("|");

  if (linksA !== linksB) {
    failed += 1;
    console.error(`FAIL ${part.id} replay order mismatch`);
    continue;
  }

  const metaA = { ...a.runtime, latencyMs: 0 };
  const metaB = { ...b.runtime, latencyMs: 0 };
  if (JSON.stringify(metaA) !== JSON.stringify(metaB)) {
    failed += 1;
    console.error(`FAIL ${part.id} replay meta mismatch`);
    continue;
  }

  console.log(`OK ${part.id} deterministic replay`);
}

const sample = runRuntimePartition(INTENT_LIVE_PARTITIONS[0], RUNTIME_BOUNDED_ENV);
const { applyControlledIntentRuntime } = await import("../lib/intent/intentRuntimeController.ts");
const { buildCanonicalQuery } = await import("../lib/search/canonicalQuery.ts");
const args = {
  products: sample.row.products,
  query: sample.row.query,
  canonicalQuery: buildCanonicalQuery(sample.row.query),
  intentIntelligence: sample.row.intent,
  intentApply: sample.row.intentApply,
  intentProductionApply: sample.row.intentProductionApply,
  intentObservability: sample.row.observability,
  intentCanary: sample.row.canary,
  intentEvaluation: sample.row.evaluation,
  intentOptimization: sample.row.optimization,
  intentGovernance: sample.row.governance,
  intentCalibration: sample.row.calibration,
  preOrderLinks: sample.row.products.map((p) => p.link || p.title),
  rankingStable: sample.row.rankingStable,
};
const run1 = applyControlledIntentRuntime(args);
const run2 = applyControlledIntentRuntime(args);
if (!validateDeterministicRuntimeReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicRuntimeReplay");
} else {
  console.log("OK validateDeterministicRuntimeReplay");
}

saveLiveObservabilityRun({ suite: "intent-runtime-replay", phase: "P5.0", pass: failed === 0 }, "intent-runtime-replay");

if (failed) process.exit(1);
console.log("\nIntent runtime replay passed");
