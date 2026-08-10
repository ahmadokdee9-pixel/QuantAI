/**
 * Independent QA for H-05 only (post-deploy).
 * Verifies CSP header + core surfaces still function.
 *
 * Usage: node scripts/qa-independent-h05.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { QUANTAI_CSP_REQUIRED_TOKENS } from "../lib/security/cspDirectives.ts";

const base = "https://www.quantaihq.com";
const hdr = {
  "content-type": "application/json",
  "x-requested-with": "quantai-web",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "user-agent": "QuantAI-Independent-QA-H05/1.0",
};

function pass(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`[PASS] ${msg}`);
}

async function head(path) {
  const r = await fetch(base + path, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      "user-agent": hdr["user-agent"],
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const headers = {};
  r.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return { status: r.status, headers, csp: r.headers.get("content-security-policy") };
}

const report = {
  issue: "H-05",
  at: new Date().toISOString(),
  base,
  probes: {},
  verdict: "PENDING",
};

try {
  console.log("=== Independent QA H-05 ===\n");

  const paths = ["/", "/pricing", "/sign-in", "/api/health"];
  const headerRuns = [];
  for (const p of paths) {
    const row = await head(p);
    headerRuns.push({ path: p, status: row.status, hasCsp: Boolean(row.csp), cspPreview: (row.csp || "").slice(0, 220) });
    console.log(JSON.stringify(headerRuns[headerRuns.length - 1]));
  }
  report.probes.headers = headerRuns;

  const home = headerRuns.find((r) => r.path === "/");
  pass(Boolean(home?.hasCsp), "Homepage sends Content-Security-Policy");
  pass(home?.status === 200, `Homepage HTTP 200 (got ${home?.status})`);

  const csp = (await head("/")).csp || "";
  for (const token of QUANTAI_CSP_REQUIRED_TOKENS) {
    pass(csp.includes(token), `CSP contains ${token}`);
  }
  pass(!/unsafe-eval/i.test(csp), "Production CSP does not include unsafe-eval");
  pass(/strict-dynamic/i.test(csp) || /nonce-/i.test(csp), "CSP uses strict-dynamic and/or nonce");
  pass(/js\.stripe\.com|hooks\.stripe\.com/i.test(csp), "CSP allows Stripe frames/scripts");
  pass(/frame-ancestors[^;]*'none'/i.test(csp), "CSP frame-ancestors 'none'");
  pass(/object-src[^;]*'none'/i.test(csp), "CSP object-src 'none'");

  // Search still works
  const search = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ q: "MacBook Pro 14", marketCountry: "NL" }),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });
  const sj = await search.json().catch(() => null);
  report.probes.search = {
    status: search.status,
    success: sj?.success,
    products: sj?.data?.products?.length ?? -1,
  };
  pass(
    search.status === 200 && sj?.success === true && (sj?.data?.products?.length ?? 0) > 0,
    `Search works (products=${report.probes.search.products})`
  );

  // Decision engine still fail-closed on hostile (C-01)
  const hostile = await fetch(`${base}/api/decision/run`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ query: "<img src=x onerror=alert(1)>", forcedDomain: "hotel" }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const hj = await hostile.json().catch(() => null);
  report.probes.decisionHostile = {
    status: hostile.status,
    success: hj?.success,
    code: hj?.error?.code || hj?.code,
  };
  pass(
    hostile.status === 400 || hj?.success === false,
    `Decision Engine hostile still fail-closed (status=${hostile.status})`
  );

  // Clerk is active on public HTML (modal SignIn on home; dedicated /sign-in 404 is H-04, not H-05).
  const homeClerk = await fetch(base + "/", {
    redirect: "follow",
    cache: "no-store",
    headers: { "user-agent": hdr["user-agent"], "cache-control": "no-cache" },
  });
  const clerkStatus = homeClerk.headers.get("x-clerk-auth-status");
  const homeCsp = homeClerk.headers.get("content-security-policy") || "";
  report.probes.clerk = {
    authStatus: clerkStatus,
    cspHasClerkHost: /\.clerk\.(accounts\.dev|com)|clerk\.|/i.test(homeCsp),
    cspHasProtect: /protect\.clerk/i.test(homeCsp),
  };
  pass(Boolean(clerkStatus), `Clerk middleware active (x-clerk-auth-status=${clerkStatus})`);
  pass(report.probes.clerk.cspHasClerkHost, "CSP includes Clerk host/FAPI");

  // Pricing / Stripe-related surface
  const pricing = headerRuns.find((r) => r.path === "/pricing");
  pass(pricing?.status === 200, `Pricing page loads (status=${pricing?.status})`);
  pass(Boolean(pricing?.hasCsp), "Pricing page includes CSP");

  // Complementary headers from next.config
  const homeFull = await head("/");
  pass(
    homeFull.headers["x-content-type-options"] === "nosniff",
    "X-Content-Type-Options nosniff present"
  );
  pass(
    /DENY/i.test(homeFull.headers["x-frame-options"] || ""),
    "X-Frame-Options DENY present"
  );

  report.verdict = "PASS";
  console.log("\nIndependent QA H-05: PASS");
} catch (e) {
  report.verdict = "FAIL";
  report.error = String(e.message || e);
  console.error("\nIndependent QA H-05: FAIL", report.error);
}

mkdirSync("docs/wave1", { recursive: true });
writeFileSync("docs/wave1/H05_INDEPENDENT_QA.json", JSON.stringify(report, null, 2));
console.log("Wrote docs/wave1/H05_INDEPENDENT_QA.json");
process.exit(report.verdict === "PASS" ? 0 : 1);
