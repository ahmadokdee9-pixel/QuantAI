#!/usr/bin/env node
/**
 * Production stabilization guards — mirrors productionStabilizationEnv.ts (no @/ imports).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function parseBool(raw) {
  if (raw == null || String(raw).trim() === "") return false;
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function isBetaStabilizationEnabled(env) {
  const raw = env.QUANTAI_BETA_STABILIZATION;
  if (raw == null || String(raw).trim() === "") return env.NODE_ENV === "production";
  return parseBool(raw);
}

function applyBetaDiscoveryDefaults(env) {
  if (!isBetaStabilizationEnabled(env)) return;
  if (!env.MAX_DISCOVERY_QUERIES) env.MAX_DISCOVERY_QUERIES = "2";
  if (!env.DISCOVERY_TIMEOUT_MS) env.DISCOVERY_TIMEOUT_MS = "4500";
  if (!env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI) env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI = "true";
}

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");

assert.ok(route.includes("isProductionShadowStackDisabled"), "shadow skip helper wired");
assert.ok(route.includes("skipShadowStack"), "shadow stack skip flag used");
assert.ok(route.includes("createGuestPipelineCache"), "guest pipeline cache wired");
assert.ok(route.includes("loadPipelineWithInflightDedupe"), "in-flight dedupe wired");
assert.ok(route.includes("applyBetaDiscoveryDefaults"), "discovery defaults at pipeline start");
assert.ok(route.includes("searchFallbackQueryCap"), "fallback query cap wired");
assert.ok(route.includes("markRateLimited429"), "429 telemetry hook wired");
assert.ok(route.includes("getGuestStaleTray"), "stale fallback serving wired");
assert.ok(route.includes("withTimeout"), "request timeout guard wired");
assert.ok(route.includes("isCircuitOpen"), "circuit-breaker guard wired");
assert.ok(route.includes("applyPhase92TrayIntegrity"), "phase 9.2 tray integrity wired");
assert.ok(route.includes("applyPhase93TrustDiscountHardening"), "phase 9.3 trust/discount wired");
assert.ok(route.includes("buildPhase94QueryIntelligence"), "phase 9.4 query intelligence wired");
assert.ok(route.includes("queryIntelligence: phase94QueryIntelligence.meta"), "phase 9.4 meta exposed");
assert.ok(route.includes("applyPhase95CommerceMemory"), "phase 9.5 commerce memory wired");
assert.ok(route.includes("applyVerdictIntelligence"), "phase 10.0 verdict intelligence wired");
assert.ok(route.includes("applyExplainabilityIntelligence"), "phase 10.1 explainability wired");
assert.ok(route.includes("applyAlternativeIntelligence"), "phase 10.2 alternative intelligence wired");
assert.ok(route.includes("alternativeIntelligence: alternativeIntelligence.meta"), "phase 10.2 meta exposed");
assert.ok(route.includes("applyMarketContextIntelligence"), "phase 10.3 market context wired");
assert.ok(route.includes("marketContext: marketContextIntelligence.meta"), "phase 10.3 meta exposed");
assert.ok(route.includes("explainability: explainability.meta"), "phase 10.1 meta exposed");
assert.ok(route.includes("verdictIntelligence: verdictIntelligence.meta"), "phase 10.0 meta exposed");
assert.ok(route.includes("phase95CommerceMemory.meta"), "phase 9.5 meta exposed");

const env = { NODE_ENV: "production" };
applyBetaDiscoveryDefaults(env);
assert.equal(env.MAX_DISCOVERY_QUERIES, "2");
assert.equal(env.QUANTAI_SEARCH_HEURISTIC_COMMERCE_AI, "true");

console.log("production-stabilization: ok");
