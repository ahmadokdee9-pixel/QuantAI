/**
 * P4.7 — Institutional gate: optimization advisory layer + P4.6 regression + apply flags OFF.
 * Usage: npm run test:intent-optimization-gate
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadLatestLiveObservability } from "./lib/liveObservabilityHistory.mjs";
import {
  isIntentApplyBlockedInProduction,
  isIntentIntelligenceApplyEnabled,
} from "../lib/intent/intentIntelligenceFlags.ts";
import { isIntentOptimizationAutonomousBlocked } from "../lib/intent/intentOptimizationEngine.ts";

const ROOT = resolve(import.meta.dirname, "..");
const ROUTE = resolve(ROOT, "app/api/search/route.ts");
const EXAMPLE = resolve(ROOT, ".env.example");

let failed = 0;

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failed += 1;
}

const route = readFileSync(ROUTE, "utf8");
check(
  "intent_optimization_telemetry",
  route.includes("intentOptimization") && route.includes("buildIntentOptimizationMeta"),
  "meta.intentOptimization wired in search route"
);
check(
  "no_autonomous_threshold_apply",
  !/applyOptimization|autonomousOptimize|setThreshold\s*\(/.test(route),
  "no autonomous threshold apply in search route"
);
check(
  "optimization_advisory_only",
  isIntentOptimizationAutonomousBlocked(),
  "autonomous optimization permanently blocked"
);

const example = existsSync(EXAMPLE) ? readFileSync(EXAMPLE, "utf8") : "";
check(
  "env_example_apply_off",
  /INTENT_INTELLIGENCE_APPLY_ENABLED=false/.test(example),
  "APPLY_ENABLED=false documented in .env.example"
);
check(
  "env_example_p47_documented",
  /Phase 4\.7/.test(example) && /INTENT_OPTIMIZATION/.test(example),
  "P4.7 INTENT_OPTIMIZATION documented"
);

const savedProd = process.env.NODE_ENV;
const savedApply = process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
process.env.NODE_ENV = "production";
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
const prodBlocked = isIntentApplyBlockedInProduction() && !isIntentIntelligenceApplyEnabled();
if (savedProd === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = savedProd;
if (savedApply === undefined) delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
else process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = savedApply;

check("production_apply_default_off", prodBlocked, "production apply blocked without opt-in");

try {
  execSync("npx --yes tsx scripts/intent-optimization.mjs", { cwd: ROOT, stdio: "inherit" });
} catch {
  failed += 1;
  console.error("FAIL intent-optimization.mjs");
}

const optHistory = loadLatestLiveObservability("intent-optimization");
check(
  "optimization_history_recorded",
  optHistory?.report?.pass === true && optHistory?.report?.advisoryOnly === true,
  optHistory ? `history pass=${optHistory.report.pass}` : "no history (run optimization first)"
);

try {
  execSync("node scripts/intent-prod-ci-guard.mjs", { cwd: ROOT, stdio: "inherit" });
} catch {
  failed += 1;
}

if (failed) process.exit(1);
console.log("\nIntent optimization gate: PASS");
