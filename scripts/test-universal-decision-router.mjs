/**
 * Domain router smoke tests (no network).
 * Usage: node --experimental-strip-types scripts/test-universal-decision-router.mjs
 * Or: npx tsx scripts/test-universal-decision-router.mjs
 */
let classifyDecisionDomain;
try {
  const mod = await import("../lib/universalDecision/router.ts").catch(() =>
    import("../lib/universalDecision/router.js")
  );
  classifyDecisionDomain = mod.classifyDecisionDomain;
} catch {
  console.error("[FAIL] Could not load classifyDecisionDomain — run via npx tsx");
  process.exit(1);
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`[FAIL] ${msg}`);
  } else {
    console.log(`[PASS] ${msg}`);
  }
}

const env = { SERPAPI_KEY: "test-key" };

assert(
  classifyDecisionDomain("best laptop under €1,200", { env }).domain === "product",
  "product query → PRODUCT"
);
assert(
  classifyDecisionDomain("flight Amsterdam to Istanbul next Friday", { env }).domain ===
    "flight",
  "flight query → FLIGHT"
);
assert(
  classifyDecisionDomain("hotel in Paris near the Louvre for 3 nights", { env }).domain ===
    "hotel",
  "hotel query → HOTEL"
);
assert(
  classifyDecisionDomain("is Adobe Creative Cloud worth it for me?", { env }).domain ===
    "subscription",
  "subscription query → SUBSCRIPTION"
);
assert(
  classifyDecisionDomain("flight Amsterdam to Istanbul", {
    forcedDomain: "product",
    env,
  }).domain === "product",
  "forced domain correction"
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll router checks passed.");
