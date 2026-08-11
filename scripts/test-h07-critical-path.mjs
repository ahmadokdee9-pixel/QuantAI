/**
 * H-07 regression — critical-path payload weight (fonts / render-blocking third-party).
 *
 * Usage: npx tsx scripts/test-h07-critical-path.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
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

console.log("=== H-07 critical-path payload wiring ===\n");

const globals = readFileSync(join(root, "app/globals.css"), "utf8");
check(
  !/api\.fontshare\.com/i.test(globals),
  "globals.css does not @import Fontshare (render-blocking third-party fonts)"
);
check(
  !/@import\s+url\(["']https?:\/\//i.test(globals),
  "globals.css has no render-blocking external @import url(...)"
);
check(
  /--font-qa-display:\s*var\(--font-geist-sans\)/.test(globals),
  "display font stack starts with already-loaded Geist"
);
check(!/"Satoshi"/i.test(globals), "Satoshi is not referenced in globals.css");

const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
check(
  !/IBM_Plex_Sans_Arabic/.test(layout),
  "root layout does not load IBM Plex Sans Arabic on every page"
);
check(!/fontArabic/.test(layout), "root layout does not attach Arabic next/font variable");

const shell = readFileSync(join(root, "components/shell/QuantShell.tsx"), "utf8");
check(/next\/dynamic/.test(shell), "QuantShell uses next/dynamic for deferred chrome");
check(
  /dynamic\(\s*\(\)\s*=>\s*import\(["']@\/components\/cockpit\/CommandPalette["']\)/.test(shell),
  "CommandPalette is dynamically imported"
);
check(
  /dynamic\(\s*\(\)\s*=>\s*import\(["']@\/components\/cockpit\/FloatingIntelDock["']\)/.test(shell),
  "FloatingIntelDock is dynamically imported"
);

if (failed) {
  console.error(`\n${failed} H-07 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-07 regressions passed.");
