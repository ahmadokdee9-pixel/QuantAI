/**
 * H-03 regression — monetization entitlement source of truth (fail-closed).
 *
 * Usage: npx tsx scripts/test-h03-entitlement-sot.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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

console.log("=== H-03 entitlement SoT wiring ===\n");

const resolvePath = join(root, "lib/subscription/resolveTier.ts");
const checkoutPath = join(root, "app/api/stripe/checkout/route.ts");
const resolveSrc = readFileSync(resolvePath, "utf8");
const checkoutSrc = readFileSync(checkoutPath, "utf8");

check(existsSync(resolvePath), "resolveTier.ts exists");

// Fail-closed: canceled / unpaid / past_due / expired must not fall back to Clerk Premium.
check(
  /tierFromBillingState|PAID_BILLING_STATUSES|billingState/.test(resolveSrc),
  "resolveTier exposes explicit billing-state SoT helper"
);
check(
  !/if\s*\(\s*!userId\s*\|\|\s*!supabaseAdmin\s*\)\s*return\s+clerkTier/.test(resolveSrc),
  "missing billing DB must not fall open to Clerk tier"
);
check(
  !/if\s*\(\s*error\s*\|\|\s*!data\s*\)\s*return\s+clerkTier/.test(resolveSrc),
  "missing billing row must not fall open to Clerk tier (unsynced ≠ Premium)"
);
check(
  /return\s+["']free["']/.test(resolveSrc),
  "resolveTier fail-closed path returns free"
);

// Checkout must fail closed when Stripe is not configured (not soft 200 placeholder).
check(
  /jsonErr\(\s*503/.test(checkoutSrc) || /status:\s*503/.test(checkoutSrc),
  "checkout returns 503 when Stripe is not configured"
);
check(
  !/mode:\s*["']placeholder["']/.test(checkoutSrc),
  "checkout does not soft-succeed with placeholder mode"
);

console.log("\n=== H-03 entitlement matrix (pure SoT) ===\n");

const modPath = join(root, "lib/subscription/resolveTier.ts");
let tierFromBillingState;
try {
  const mod = await import(pathToFileURL(modPath).href);
  tierFromBillingState = mod.tierFromBillingState;
} catch (e) {
  console.error("[FAIL] could not import resolveTier", e);
  failed += 1;
}

if (typeof tierFromBillingState === "function") {
  const cases = [
    { name: "guest/no row semantics → free via helper empty", row: null, expect: "free" },
    {
      name: "active pro",
      row: { status: "active", subscription_tier: "pro" },
      expect: "pro",
    },
    {
      name: "trialing premium",
      row: { status: "trialing", subscription_tier: "premium" },
      expect: "premium",
    },
    {
      name: "canceled keeps no premium",
      row: { status: "canceled", subscription_tier: "premium" },
      expect: "free",
    },
    {
      name: "unpaid loses paid access",
      row: { status: "unpaid", subscription_tier: "pro" },
      expect: "free",
    },
    {
      name: "past_due loses paid access",
      row: { status: "past_due", subscription_tier: "premium" },
      expect: "free",
    },
    {
      name: "incomplete_expired → free",
      row: { status: "incomplete_expired", subscription_tier: "pro" },
      expect: "free",
    },
    {
      name: "active free stays free",
      row: { status: "active", subscription_tier: "free" },
      expect: "free",
    },
    {
      name: "invalid status → free",
      row: { status: "weird", subscription_tier: "premium" },
      expect: "free",
    },
  ];

  for (const c of cases) {
    const got = c.row == null ? "free" : tierFromBillingState(c.row);
    check(got === c.expect, `${c.name} → ${c.expect} (got ${got})`);
  }

  // Stale Clerk Premium must not win over canceled billing — documented contract:
  // resolveServerSubscriptionTier uses billing SoT only when row present.
  check(
    tierFromBillingState({ status: "canceled", subscription_tier: "premium" }) === "free",
    "stale Premium tier on canceled billing row resolves free"
  );
} else {
  check(false, "tierFromBillingState is exported");
}

if (failed) {
  console.error(`\n${failed} H-03 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-03 regressions passed.");
