#!/usr/bin/env node
/**
 * P0 production readiness verification (local).
 * Usage: npm run test:p0-production-readiness
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function run(label, cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0) {
    console.error(`\n[FAIL] ${label} (exit ${r.status ?? "unknown"})\n`);
    process.exit(r.status || 1);
  }
  console.log(`[PASS] ${label}\n`);
}

console.log("=== QuantAI P0 Production Readiness (local) ===\n");

if (!existsSync(resolve(ROOT, ".env.local"))) {
  console.warn("[WARN] .env.local missing — some checks may fail. Use npm run env:sync\n");
}

run("env validate (prebuild)", "npm", ["run", "env:check"]);
run("production build", "npm", ["run", "build"]);
run("public-beta-p0 bundle", "npm", ["run", "test:public-beta-p0"]);

console.log("=== P0 local verification complete ===");
console.log("Remote (production): set SEARCH_BASE_URL and run npm run test:public-beta-p0:remote");
console.log("Manual: 30-query QA — docs/PUBLIC_BETA_30_QUERY_QA_EXECUTION.md");
