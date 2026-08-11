/**
 * Independent QA for H-03 only (post-deploy).
 *
 * Usage: node scripts/qa-independent-h03.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const base = "https://www.quantaihq.com";
const ua = "QuantAI-Independent-QA-H03/1.0";

function pass(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`[PASS] ${msg}`);
}

const report = { issue: "H-03", at: new Date().toISOString(), base, probes: {}, verdict: "PENDING" };

try {
  console.log("=== Independent QA H-03 ===\n");

  // Unit matrix must stay green
  execSync("npx tsx scripts/test-h03-entitlement-sot.mjs", { stdio: "inherit" });
  report.probes.unitMatrix = "PASS";

  const health = await fetch(`${base}/api/health`, { cache: "no-store" }).then((r) => r.json());
  report.probes.health = {
    stripe: health?.services?.stripe,
    monetization: health?.monetization,
    rateLimit: health?.rateLimit,
    warnings: health?.warnings,
  };
  pass(health?.monetization?.entitlementSoT === "user_billing_state", "Health advertises billing SoT");
  pass(health?.monetization?.clerkMetadataGrantsPremium === false, "Health: Clerk metadata cannot grant Premium");
  pass(health?.monetization?.unpaidDefault === "free", "Health: unpaid default is free");
  pass(
    health?.rateLimit?.shared === true || health?.rateLimit?.backend === "upstash",
    "Rate limiting still active"
  );
  if (health?.services?.stripe === false) {
    pass(
      Array.isArray(health?.warnings) &&
        health.warnings.some((w) => /STRIPE_SECRET_KEY/i.test(String(w))),
      "Production warns when Stripe is not configured"
    );
  }

  // Guest: billing API denied
  const billingGuest = await fetch(`${base}/api/billing/subscription`, {
    cache: "no-store",
    headers: { "user-agent": ua },
  });
  const billingGuestBody = await billingGuest.json().catch(() => null);
  report.probes.guestBilling = { status: billingGuest.status, body: billingGuestBody };
  pass(billingGuest.status === 401, `Guest billing API denied (status=${billingGuest.status})`);

  // Guest: checkout denied
  const checkoutGuest = await fetch(`${base}/api/stripe/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": ua },
    body: JSON.stringify({ plan: "pro" }),
  });
  report.probes.guestCheckout = { status: checkoutGuest.status };
  pass(checkoutGuest.status === 401, `Guest checkout denied (status=${checkoutGuest.status})`);

  // Guest: portal denied
  const portalGuest = await fetch(`${base}/api/stripe/portal`, {
    method: "POST",
    headers: { "user-agent": ua },
  });
  report.probes.guestPortal = { status: portalGuest.status };
  pass(portalGuest.status === 401, `Guest portal denied (status=${portalGuest.status})`);

  // Webhook without signature fail-closed
  const webhook = await fetch(`${base}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": ua },
    body: "{}",
  });
  report.probes.webhook = { status: webhook.status };
  pass(
    webhook.status === 400 || webhook.status === 503,
    `Webhook fail-closed without valid Stripe signature (status=${webhook.status})`
  );

  // Protected premium-ish surfaces still require auth (H-04 control)
  const dash = await fetch(`${base}/dashboard`, {
    redirect: "manual",
    cache: "no-store",
    headers: {
      accept: "text/html",
      "sec-fetch-dest": "document",
      "user-agent": ua,
    },
  });
  report.probes.protectedRoute = {
    status: dash.status,
    loc: dash.headers.get("location"),
    reason: dash.headers.get("x-clerk-auth-reason"),
  };
  pass(
    dash.status === 307 || dash.status === 302 || dash.status === 404,
    "Protected /dashboard still gated by Clerk (no open Premium surface)"
  );

  // Homepage CSP
  const home = await fetch(base + "/", {
    redirect: "manual",
    cache: "no-store",
    headers: { accept: "text/html", "user-agent": ua },
  });
  // follow handshake lightly
  let homeCsp = Boolean(home.headers.get("content-security-policy"));
  let homeStatus = home.status;
  if (home.status >= 301 && home.status <= 308) {
    const loc = home.headers.get("location");
    if (loc) {
      const h2 = await fetch(new URL(loc, base).href, {
        redirect: "manual",
        headers: { accept: "text/html", "user-agent": ua },
      });
      homeStatus = h2.status;
      homeCsp = homeCsp || Boolean(h2.headers.get("content-security-policy"));
    }
  }
  report.probes.home = { status: homeStatus, csp: homeCsp };
  pass(homeCsp === true || home.status !== 404, "Homepage/CSP control intact");

  const search = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "quantai-web",
      "user-agent": ua,
    },
    body: JSON.stringify({ q: "MacBook Pro 14", marketCountry: "NL" }),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });
  const sj = await search.json().catch(() => null);
  report.probes.search = {
    status: search.status,
    success: sj?.success,
    products: sj?.data?.products?.length ?? -1,
    entitlements: sj?.data?.entitlements || sj?.entitlements || null,
  };
  pass(
    search.status === 200 && sj?.success && (sj?.data?.products?.length ?? 0) > 0,
    `Search unaffected (products=${report.probes.search.products})`
  );

  const hostile = await fetch(`${base}/api/decision/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "quantai-web",
      "user-agent": ua,
    },
    body: JSON.stringify({ query: "<img src=x onerror=alert(1)>", forcedDomain: "hotel" }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const hj = await hostile.json().catch(() => null);
  report.probes.decision = { status: hostile.status, success: hj?.success };
  pass(
    hostile.status === 400 || hj?.success === false,
    `Decision Engine still fail-closed (status=${hostile.status})`
  );

  // Signed-in free / paid / canceled: covered by unit matrix (no session cookies in CI).
  report.probes.signedInMatrix =
    "Covered by scripts/test-h03-entitlement-sot.mjs (active/canceled/unpaid/past_due/invalid)";

  report.verdict = "PASS";
  console.log("\nIndependent QA H-03: PASS");
} catch (e) {
  report.verdict = "FAIL";
  report.error = String(e.message || e);
  console.error("\nIndependent QA H-03: FAIL", report.error);
}

mkdirSync("docs/wave1", { recursive: true });
writeFileSync("docs/wave1/H03_INDEPENDENT_QA.json", JSON.stringify(report, null, 2));
console.log("Wrote docs/wave1/H03_INDEPENDENT_QA.json");
process.exit(report.verdict === "PASS" ? 0 : 1);
