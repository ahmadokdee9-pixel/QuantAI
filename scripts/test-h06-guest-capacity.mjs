/**
 * H-06 regression — guest soft limits must not scare users with capacity/stale
 * banners when a warm guest cache tray is available (mild burst / shopping).
 *
 * Usage: npx tsx scripts/test-h06-guest-capacity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decideGuestRateLimitServe,
  guestSearchBurstPerMinute,
  guestSearchHourlyMax,
} from "../lib/search/searchAbuseProtection.ts";
import { buildDegradedTrayNotice } from "../lib/search/trayDiagnostics.ts";

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

console.log("=== H-06 guest capacity / stale tray policy ===\n");

{
  const clean = decideGuestRateLimitServe({
    limited: true,
    hasCachedTray: true,
    hasStaleTray: true,
    limitCode: "GUEST_HOURLY",
  });
  check(clean.action === "serve_cache_clean", "Warm cache under limit → serve_cache_clean");
  check(clean.degraded !== true, "Warm cache under limit must not set degraded");
}

{
  const stale = decideGuestRateLimitServe({
    limited: true,
    hasCachedTray: false,
    hasStaleTray: true,
    limitCode: "GUEST_BURST",
  });
  check(stale.action === "serve_stale_degraded", "Stale-only under limit → serve_stale_degraded");
  check(stale.degraded === true, "Stale serve marks degraded");
  check(
    /stale_tray/.test(String(stale.reason || "")),
    `Stale reason mentions stale_tray (got ${stale.reason})`
  );
}

{
  const reject = decideGuestRateLimitServe({
    limited: true,
    hasCachedTray: false,
    hasStaleTray: false,
    limitCode: "GUEST_HOURLY",
  });
  check(reject.action === "reject_429", "No tray under limit → reject_429");
}

{
  const live = decideGuestRateLimitServe({
    limited: false,
    hasCachedTray: false,
    hasStaleTray: false,
  });
  check(live.action === "allow_live", "Not limited → allow_live");
}

console.log("\n=== H-06 defaults allow mild burst ===\n");

check(guestSearchBurstPerMinute() >= 10, `Burst/min default ≥10 (got ${guestSearchBurstPerMinute()})`);
check(guestSearchHourlyMax() >= 30, `Hourly default ≥30 (got ${guestSearchHourlyMax()})`);

console.log("\n=== H-06 degraded copy only for true pressure ===\n");

{
  const notice = buildDegradedTrayNotice("guest_rate_limit_guest_hourly_stale_tray");
  check(
    /guest capacity recovers/i.test(notice.headline),
    "Stale rate-limit reason still uses capacity copy"
  );
}

console.log("\n=== H-06 wiring contracts ===\n");

{
  const route = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
  check(route.includes("decideGuestRateLimitServe"), "search route uses decideGuestRateLimitServe");
  check(
    !/guest_rate_limit_\$\{limited\.code\.toLowerCase\(\)\}_cached_tray/.test(route),
    "search route must not mark *_cached_tray as capacity-degraded"
  );
}

{
  const rl = readFileSync(new URL("../lib/rate-limit.ts", import.meta.url), "utf8");
  check(
    !/slidingWindow\(\s*12\s*,\s*["']1 h["']\)/.test(rl),
    "Upstash guest hourly must not hardcode slidingWindow(12, 1 h)"
  );
  check(
    /guestSearchHourlyMax|GUEST_SEARCH_HOURLY_MAX/.test(rl),
    "Upstash guest hourly must follow GUEST_SEARCH_HOURLY_MAX"
  );
  check(
    /guestSearchBurstRatelimit|search:guest:burst/.test(rl),
    "Guest burst must use shared Upstash limiter"
  );
}

if (failed) {
  console.error(`\n${failed} H-06 regression(s) failed`);
  process.exit(1);
}
console.log("\nAll H-06 regressions passed.");
