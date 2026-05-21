/**
 * P5.1 — Deterministic orchestration replay.
 * Usage: npm run test:intent-orchestration-replay
 */
import { validateDeterministicOrchestrationReplay } from "../lib/intent/intentOrchestrator.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ORCHESTRATION_BOUNDED_ENV } from "./lib/intentOrchestrationRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  const a = runIntentEvaluationPartition(part, ORCHESTRATION_BOUNDED_ENV);
  const b = runIntentEvaluationPartition(part, ORCHESTRATION_BOUNDED_ENV);
  const linksA = (a.orchestrationProducts ?? a.runtimeProducts).map((p) => p.link).join("|");
  const linksB = (b.orchestrationProducts ?? b.runtimeProducts).map((p) => p.link).join("|");

  if (linksA !== linksB) {
    failed += 1;
    console.error(`FAIL ${part.id} replay order mismatch`);
    continue;
  }

  const metaA = { ...a.orchestration, latencyMs: 0 };
  const metaB = { ...b.orchestration, latencyMs: 0 };
  if (JSON.stringify(metaA) !== JSON.stringify(metaB)) {
    failed += 1;
    console.error(`FAIL ${part.id} replay meta mismatch`);
    continue;
  }
  console.log(`OK ${part.id} deterministic replay`);
}

const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], ORCHESTRATION_BOUNDED_ENV);
const { applyControlledIntentOrchestration } = await import("../lib/intent/intentOrchestrator.ts");
const args = {
  products: sample.runtimeProducts,
  evaluation: sample.evaluation,
  optimization: sample.optimization,
  governance: sample.governance,
  calibration: sample.calibration,
  runtime: sample.runtime,
  preOrderLinks: sample.runtimeProducts.map((p) => p.link || p.title),
};
const run1 = applyControlledIntentOrchestration(args);
const run2 = applyControlledIntentOrchestration(args);
if (!validateDeterministicOrchestrationReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicOrchestrationReplay");
} else {
  console.log("OK validateDeterministicOrchestrationReplay");
}

saveLiveObservabilityRun({ suite: "intent-orchestration-replay", phase: "P5.1", pass: failed === 0 }, "intent-orchestration-replay");

if (failed) process.exit(1);
console.log("\nIntent orchestration replay passed");
