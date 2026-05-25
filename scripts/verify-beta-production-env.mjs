#!/usr/bin/env node
/**
 * Verify local or CI env against public beta production manifest.
 * Usage: npm run test:beta-prod-env
 * Production Vercel: compare manually to docs/PRODUCTION_ENV_MANIFEST.md
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  BETA_APPLY_FLAGS_FALSE,
  BETA_PHASE_11_18_OFF,
  BETA_RECOMMENDED_SHADOW_OFF,
  BETA_REQUIRED_SECRETS,
  BETA_RECOMMENDED_SECRETS,
  isTruthyEnv,
} from "./lib/betaProductionManifest.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

function loadDotEnv(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val.length) map.set(t.slice(0, eq).trim(), val);
  }
  return map;
}

function mergedEnv() {
  const file = loadDotEnv(ENV_PATH);
  const env = { ...process.env };
  for (const [k, v] of file) env[k] = v;
  return env;
}

let failed = 0;
function pass(msg) {
  console.log(`[PASS] ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`[FAIL] ${msg}`);
}

const env = mergedEnv();

for (const key of BETA_APPLY_FLAGS_FALSE) {
  if (isTruthyEnv(env, key)) fail(`${key} must be false/unset for beta (got true)`);
  else pass(`${key} not enabled`);
}

for (const key of BETA_PHASE_11_18_OFF) {
  if (isTruthyEnv(env, key)) fail(`${key} must be false for beta (Phases 11–18 off)`);
  else pass(`${key} off`);
}

for (const key of BETA_RECOMMENDED_SHADOW_OFF) {
  if (isTruthyEnv(env, key)) {
    console.warn(`[WARN] ${key}=true — recommended OFF for beta latency`);
  }
}

for (const key of BETA_REQUIRED_SECRETS) {
  const v = env[key]?.trim();
  if (!v) fail(`missing required secret ${key}`);
  else pass(`${key} present`);
}

for (const key of BETA_RECOMMENDED_SECRETS) {
  const v = env[key]?.trim();
  if (!v) console.warn(`[WARN] recommended missing: ${key}`);
  else pass(`${key} present`);
}

if (!existsSync(ENV_PATH) && process.env.CI !== "true") {
  console.warn("[WARN] .env.local not found — only process.env checked");
}

if (failed > 0) {
  console.error(`\n${failed} beta env check(s) failed. See docs/PRODUCTION_ENV_MANIFEST.md`);
  process.exit(1);
}
console.log("\nAll beta production env manifest checks passed.");
