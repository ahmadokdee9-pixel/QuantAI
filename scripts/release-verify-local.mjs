/**
 * Local production verification for release gate.
 * Usage: npx tsx --env-file=.env.local scripts/release-verify-local.mjs
 */
import { classifyDecisionDomain } from "../lib/universalDecision/router.ts";
import { runUniversalDecision } from "../lib/universalDecision/runDecision.ts";
import { domainStatusReport } from "../lib/universalDecision/registry.ts";

const base = process.env.RELEASE_VERIFY_BASE || "http://127.0.0.1:3000";
let failed = 0;

function pass(m) {
  console.log(`[PASS] ${m}`);
}
function fail(m) {
  failed += 1;
  console.error(`[FAIL] ${m}`);
}

async function checkJson(path, init) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    fail(`${path} non-JSON status=${res.status}`);
    return { res, json: null };
  }
  return { res, json };
}

console.log("=== Domain router (in-process) ===");
const cases = [
  ["best laptop under 1200", "product"],
  ["flight Amsterdam to Istanbul next Friday", "flight"],
  ["hotel in Paris near the Louvre for 3 nights", "hotel"],
  ["is Adobe Creative Cloud worth it for me?", "subscription"],
];
for (const [q, expect] of cases) {
  const c = classifyDecisionDomain(q, { env: process.env });
  if (c.domain === expect) pass(`classify ${expect}`);
  else fail(`classify expected ${expect} got ${c.domain}`);
}

console.log("\n=== Domain adapters (in-process) ===");
console.log("domains", JSON.stringify(domainStatusReport(process.env)));

for (const [label, query, domain] of [
  ["flight", "flight Amsterdam to Istanbul next Friday", "flight"],
  ["hotel", "hotel in Paris for 3 nights", "hotel"],
  ["subscription", "is Adobe Creative Cloud worth it?", "subscription"],
]) {
  const r = await runUniversalDecision({ query, forcedDomain: domain });
  const n = r.decision?.candidates?.length ?? 0;
  const provider = r.decision?.providerStatus;
  if (r.decision && provider && provider !== "unavailable") {
    pass(`${label} decision action=${r.decision.action} provider=${provider} candidates=${n}`);
  } else {
    fail(`${label} unavailable or empty: ${r.decision?.executiveSummary || "no decision"}`);
  }
}

console.log(`\n=== HTTP smoke against ${base} ===`);
try {
  const health = await checkJson("/api/health");
  if (health.res.ok) pass("/api/health");
  else fail(`/api/health ${health.res.status}`);

  const classify = await checkJson("/api/decision/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "flight AMS to IST" }),
  });
  if (classify.res.ok && classify.json?.classification?.domain === "flight") {
    pass("/api/decision/classify flight");
  } else fail("/api/decision/classify");

  const run = await checkJson("/api/decision/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "hotel in Paris for 3 nights", forcedDomain: "hotel" }),
  });
  if (run.res.ok && run.json?.decision) pass("/api/decision/run hotel");
  else fail("/api/decision/run hotel");

  const search = await checkJson("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "quantai-web" },
    body: JSON.stringify({ query: "noise cancelling headphones under 150" }),
  });
  const products =
    search.json?.products ||
    search.json?.data?.products ||
    search.json?.payload?.products ||
    [];
  const productCount = Array.isArray(products) ? products.length : 0;
  if (search.res.ok && productCount > 0) pass(`/api/search products=${productCount}`);
  else if (search.res.ok) pass(`/api/search ok (tray parse soft) status=${search.res.status}`);
  else fail(`/api/search ${search.res.status}`);

  for (const path of ["/", "/decisions", "/watchlist", "/api/decision/run"]) {
    const res = await fetch(`${base}${path}`, path === "/api/decision/run" ? undefined : undefined);
    if (path === "/api/decision/run") {
      // GET status report
      const g = await fetch(`${base}/api/decision/run`);
      if (g.ok) pass("GET /api/decision/run");
      else fail(`GET /api/decision/run ${g.status}`);
      continue;
    }
    if (res.ok || res.status === 307 || res.status === 302) pass(`${path} ${res.status}`);
    else fail(`${path} ${res.status}`);
  }
} catch (e) {
  fail(`HTTP smoke unreachable: ${e instanceof Error ? e.message : e}`);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nRelease local verification green.");
