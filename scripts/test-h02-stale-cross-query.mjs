/**
 * H-02 regression — guest stale recovery must never serve another query's tray.
 *
 * Usage: npx tsx scripts/test-h02-stale-cross-query.mjs
 */
import assert from "node:assert/strict";
import {
  getGuestStaleTray,
  saveGuestStaleTray,
  __resetGuestStaleTraysForTests,
} from "../lib/search/searchReliabilityGuardrails.ts";

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

function mockTray(title) {
  return {
    products: [
      {
        id: "p1",
        title,
        store: "Test",
        price: 100,
        currency: "EUR",
        link: "https://example.com/p",
        image: null,
        rating: 4,
        reviewsCount: 1,
        source: "live",
        extensions: [],
      },
    ],
    dealClusters: [],
    searchIntelligence: null,
    commerceMeta: {},
    liveDiscovery: null,
  };
}

console.log("=== H-02 cross-query stale contamination ===\n");

__resetGuestStaleTraysForTests();

const dysonKey = "dyson v15";
const nonsenseKey = "asdfghjkl qwerty nonexistent product xyzzy";
saveGuestStaleTray(dysonKey, mockTray("Dyson V15 Detect Absolute"));

const sameKey = getGuestStaleTray(dysonKey);
check(
  Boolean(sameKey?.products?.length) && /dyson/i.test(sameKey.products[0].title),
  "Same-key stale tray still available for recovery"
);

const cross = getGuestStaleTray(nonsenseKey);
check(
  cross == null || !cross.products?.length,
  `Cross-query stale must be empty (got ${cross?.products?.[0]?.title ?? "null"})`
);
check(
  !(cross?.products || []).some((p) => /dyson|kindle|paperwhite/i.test(p.title)),
  "Nonsense key must not return unrelated catalog titles from latestGuestTray"
);

if (failed) {
  console.error(`\n${failed} H-02 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-02 regressions passed.");
