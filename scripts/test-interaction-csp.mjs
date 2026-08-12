/**
 * Interaction integrity — strict CSP must not ship un-nonced scripts.
 *
 * Usage: npx tsx scripts/test-interaction-csp.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let failed = 0;
function check(cond, msg) {
  try {
    assert.ok(cond, msg);
    console.log(`[PASS] ${msg}`);
  } catch (e) {
    failed += 1;
    console.error(`[FAIL] ${msg}`, e instanceof Error ? e.message : e);
  }
}

console.log("=== Interaction CSP wiring ===\n");

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");

check(/contentSecurityPolicy/.test(proxy), "CSP still enabled in proxy");
check(/strict:\s*true/.test(proxy), "CSP remains strict");
check(
  /<ClerkProvider\s+dynamic[\s>]/.test(layout),
  "ClerkProvider dynamic present (required for nonce hydration under strict CSP)"
);

if (failed) {
  console.error(`\n${failed} interaction CSP regression(s) failed`);
  process.exit(1);
}
console.log("\nAll interaction CSP regressions passed.");
