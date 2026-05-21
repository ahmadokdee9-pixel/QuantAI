/**
 * P4.3 — CI guard: block accidental production intent apply activation in repo config.
 * Usage: node scripts/intent-prod-ci-guard.mjs (wired into production-validation-gate)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EXAMPLE = resolve(ROOT, ".env.example");
const LOCAL = resolve(ROOT, ".env.local");
const ROUTE = resolve(ROOT, "app/api/search/route.ts");

let failed = 0;

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failed += 1;
}

const example = existsSync(EXAMPLE) ? readFileSync(EXAMPLE, "utf8") : "";
check(
  "env_example_prod_apply_commented",
  /#\s*INTENT_INTELLIGENCE_PROD_APPLY=false/.test(example) || /INTENT_INTELLIGENCE_PROD_APPLY=false/.test(example),
  "INTENT_INTELLIGENCE_PROD_APPLY documented OFF in .env.example"
);

if (existsSync(LOCAL) && process.env.CI === "true" && process.env.INTENT_PROD_APPLY_CI_ALLOW !== "true") {
  const local = readFileSync(LOCAL, "utf8");
  const prodOn = /^\s*INTENT_INTELLIGENCE_PROD_APPLY\s*=\s*true\s*$/im.test(local);
  check("ci_local_prod_apply_not_true", !prodOn, prodOn ? "PROD_APPLY=true in .env.local on CI" : "ok");
}

const route = readFileSync(ROUTE, "utf8");
check(
  "intent_production_apply_telemetry",
  route.includes("intentProductionApply") && route.includes("buildIntentProductionApplyMeta"),
  "meta.intentProductionApply wired in search route"
);

check(
  "intent_observability_telemetry",
  route.includes("intentObservability") && route.includes("buildIntentObservabilityMeta"),
  "meta.intentObservability wired in search route"
);

check(
  "intent_canary_telemetry",
  route.includes("intentCanary") && route.includes("buildIntentCanaryMeta"),
  "meta.intentCanary wired in search route"
);

check(
  "no_hardcoded_prod_apply_true",
  !/INTENT_INTELLIGENCE_PROD_APPLY\s*=\s*["']true["']/.test(route),
  "no hardcoded production apply in route"
);

if (failed) process.exit(1);
console.log("\nIntent production CI guard: PASS");
