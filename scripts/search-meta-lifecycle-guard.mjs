#!/usr/bin/env node
/**
 * Phase 1 CI — meta lifecycle + stabilization wiring guards.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ROUTE = resolve(ROOT, "app/api/search/route.ts");

let failed = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failed += 1;
}

const route = readFileSync(ROUTE, "utf8");

check(
  "rebuild_tray_artifacts_wired",
  route.includes("rebuildSearchTrayArtifacts") && route.includes("tray_artifacts_rebuild"),
  "post-controlled tray rebuild present"
);

check(
  "finalize_normalization_wired",
  route.includes("finalizeSearchNormalization"),
  "single post-controlled normalization lifecycle"
);

check(
  "latency_budget_wired",
  route.includes("buildLatencyBudgetReport") && route.includes("latencyBudget"),
  "latency budget in response meta"
);

check(
  "controlled_stack_registry",
  route.includes("scanControlledStackRegistry") && route.includes("controlled_stack_fast_path"),
  "controlled stack fast-path telemetry"
);

check(
  "no_stale_only_cluster_build",
  !/buying_decision_order[\s\S]{0,120}dealClusters = buildDealClusters/.test(route),
  "dealClusters not built only before controlled stack"
);

check(
  "tray_meta_coherence",
  route.includes("verifyTrayMetaCoherence"),
  "tray meta coherence guard exported"
);

check(
  "production_meta_lite",
  existsSync(resolve(ROOT, "lib/search/productionMetaComposer.ts")),
  "production meta composer module exists"
);

check(
  "replay_kernel",
  existsSync(resolve(ROOT, "lib/governance/replayKernel.ts")),
  "unified replay kernel exists"
);

process.exit(failed ? 1 : 0);
