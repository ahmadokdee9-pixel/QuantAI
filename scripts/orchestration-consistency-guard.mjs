#!/usr/bin/env node
/**
 * Phase 3 CI — orchestration wiring consistency (route + kernel + graph).
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
  "unified_kernel",
  route.includes("runUnifiedControlledStack"),
  "route delegates to unified kernel"
);
check(
  "no_scattered_apply_in_route",
  !/applyControlledIntentRuntime/.test(route),
  "applyControlled* removed from route (kernel dispatch only)"
);
check(
  "normalization_graph_stage",
  route.includes("executeNormalizationStage"),
  "post_semantic via normalization execution graph"
);
check(
  "finalize_normalization",
  route.includes("finalizeSearchNormalization"),
  "post_controlled finalize wired"
);
check(
  "orchestration_meta",
  route.includes("orchestration: controlledStackOrchestration"),
  "orchestration graph exported in meta"
);
check(
  "kernel_module",
  existsSync(resolve(ROOT, "lib/governance/unifiedControlledStackKernel.ts")),
  "unifiedControlledStackKernel.ts exists"
);
check(
  "router_module",
  existsSync(resolve(ROOT, "lib/governance/deterministicLayerRouter.ts")),
  "deterministicLayerRouter.ts exists"
);
check(
  "normalization_graph_module",
  existsSync(resolve(ROOT, "lib/intelligence/normalization/normalizationExecutionGraph.ts")),
  "normalizationExecutionGraph.ts exists"
);
check(
  "mutation_guard",
  existsSync(resolve(ROOT, "lib/governance/applyMutationGuard.ts")),
  "applyMutationGuard.ts exists"
);
check(
  "layer_contracts",
  existsSync(resolve(ROOT, "lib/governance/layerExecutionContract.ts")),
  "layerExecutionContract.ts exists"
);

process.exit(failed ? 1 : 0);
