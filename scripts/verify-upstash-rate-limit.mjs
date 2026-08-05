#!/usr/bin/env node
/**
 * Verify Upstash / rate-limit readiness for public beta.
 * Usage: npm run test:beta-upstash
 * Remote: SEARCH_BASE_URL=https://prod npm run test:beta-upstash
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

let failed = 0;
function pass(m) {
  console.log(`[PASS] ${m}`);
}
function fail(m) {
  failed += 1;
  console.error(`[FAIL] ${m}`);
}

const envPath = resolve(import.meta.dirname, "../.env.local");
const env = { ...process.env };
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const url = env.UPSTASH_REDIS_REST_URL?.trim();
const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();

if (!url || !token) {
  console.warn("[WARN] UPSTASH_REDIS_* missing locally — required on Vercel Production");
} else {
  pass("UPSTASH_REDIS_REST_URL present");
  pass("UPSTASH_REDIS_REST_TOKEN present");
  try {
    const ping = await fetch(`${url.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (ping.ok) pass("upstash_ping");
    else fail(`upstash_ping status=${ping.status}`);
  } catch (e) {
    fail(`upstash_ping error=${e instanceof Error ? e.message : e}`);
  }
}

const base = (process.env.SEARCH_BASE_URL || "").replace(/\/$/, "");
if (base) {
  try {
    const res = await fetch(`${base}/api/health`);
    const json = await res.json();
    if (json?.services?.upstash) pass("production_health_reports_upstash");
    else {
      fail("production_health_upstash_false");
      console.error("  Set UPSTASH_REDIS_* on Vercel Production and redeploy");
    }
    if (json?.rateLimit?.backend === "upstash" && json?.rateLimit?.shared === true) {
      pass("production_rateLimit_backend_upstash_shared");
    } else if (process.env.REQUIRE_UPSTASH === "true") {
      fail(
        `production_rateLimit_not_shared backend=${json?.rateLimit?.backend} shared=${json?.rateLimit?.shared}`
      );
    } else {
      console.warn(
        `[WARN] rateLimit.backend=${json?.rateLimit?.backend ?? "missing"} shared=${json?.rateLimit?.shared}`
      );
    }
    if (json?.ready === false && process.env.REQUIRE_UPSTASH === "true") {
      fail("production_health_ready_false");
    }
    if (json?.ops && typeof json.ops.hour === "string") {
      pass(`production_ops_hour_snapshot hour=${json.ops.hour}`);
    } else {
      console.warn("[WARN] ops hour snapshot missing (counters appear after first search)");
    }
    const warnings = json?.warnings ?? [];
    if (warnings.some((w) => String(w).includes("UPSTASH") || String(w).includes("rate_limit"))) {
      console.warn("[WARN]", warnings.join("; "));
    }
  } catch (e) {
    fail(`health_fetch ${e instanceof Error ? e.message : e}`);
  }
} else {
  console.log("[SKIP] SEARCH_BASE_URL unset — skip production health Upstash check");
}

if (failed > 0) {
  console.error(`\n${failed} Upstash check(s) failed. See docs/UPSTASH_RATE_LIMIT_VERIFICATION.md`);
  process.exit(1);
}
console.log("\nUpstash verification complete.");
