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

check(
  "phase3_unified_kernel",
  route.includes("runUnifiedControlledStack"),
  "Phase 3 unified controlled stack kernel wired"
);

check(
  "phase3_normalization_graph",
  route.includes("executeNormalizationStage"),
  "normalization execution graph wired for post_semantic"
);

check(
  "phase3_orchestration_meta",
  route.includes("controlledStackOrchestration") || route.includes("orchestration:"),
  "orchestration graph exported in controlled stack meta"
);

check(
  "phase4_identity_foundation",
  route.includes("buildIdentityFoundation"),
  "Phase 4 identity foundation wired in search route"
);

check(
  "phase4_identity_module",
  existsSync(resolve(ROOT, "lib/intelligence/identity/canonicalProductGraph.ts")),
  "canonicalProductGraph.ts exists"
);

check(
  "phase5_trust_engine",
  route.includes("buildTrustTruthEngine"),
  "Phase 5 trust engine wired in search route"
);

check(
  "phase5_trust_module",
  existsSync(resolve(ROOT, "lib/intelligence/trust/buildTrustTruthEngine.ts")),
  "buildTrustTruthEngine.ts exists"
);

check(
  "phase6_commerce_memory",
  route.includes("buildCommerceMemoryFoundation"),
  "Phase 6 commerce memory wired in search route"
);

check(
  "phase6_memory_module",
  existsSync(resolve(ROOT, "lib/intelligence/memory/buildCommerceMemoryFoundation.ts")),
  "buildCommerceMemoryFoundation.ts exists"
);

check(
  "phase7_recommendation_cognition",
  route.includes("buildRecommendationCognition"),
  "Phase 7 recommendation cognition wired in search route"
);

check(
  "phase7_cognition_module",
  existsSync(resolve(ROOT, "lib/intelligence/recommendationCognition/buildRecommendationCognition.ts")),
  "buildRecommendationCognition.ts exists"
);

process.exit(failed ? 1 : 0);
