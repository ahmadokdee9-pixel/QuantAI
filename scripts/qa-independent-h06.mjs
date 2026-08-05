/**
 * Independent QA for H-06 only (post-deploy).
 * Mild guest burst must not show capacity/stale recovery banners when trays serve.
 *
 * Usage: node scripts/qa-independent-h06.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const base = "https://www.quantaihq.com";
const hdr = {
  "content-type": "application/json",
  "x-requested-with": "quantai-web",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "user-agent": "QuantAI-Independent-QA-H06/1.0",
};

const CAPACITY_RX =
  /guest capacity recovers|slightly stale|Live market refresh is paused|guest_rate_limit_.*_cached_tray/i;

async function search(q) {
  const t = Date.now();
  const r = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ q, marketCountry: "NL" }),
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });
  const j = await r.json().catch(() => null);
  const tray = j?.data?.meta?.trayExplanation ?? j?.data?.trayExplanation ?? null;
  const op = j?.data?.meta?.operationalState ?? j?.data?.operationalState ?? null;
  const blob = JSON.stringify(tray || {}) + JSON.stringify(op || {});
  return {
    status: r.status,
    ms: Date.now() - t,
    success: j?.success === true,
    products: Array.isArray(j?.data?.products) ? j.data.products.length : -1,
    trayHeadline: tray?.headline ?? null,
    opReason: op?.reason ?? null,
    capacityHit: CAPACITY_RX.test(blob),
    error: j?.error ?? null,
    code: j?.code ?? null,
  };
}

function pass(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`[PASS] ${msg}`);
}

const report = {
  issue: "H-06",
  at: new Date().toISOString(),
  base,
  probes: {},
  verdict: "PENDING",
};

try {
  console.log("=== Independent QA H-06 ===\n");

  // Warm then mild parallel burst (16) — previously 15/16 capacity hits.
  await search("AirPods Pro 2");
  const jobs = [];
  for (let i = 1; i <= 16; i++) jobs.push(search("AirPods Pro 2").then((row) => ({ i, ...row })));
  const burst = await Promise.all(jobs);
  burst.sort((a, b) => a.i - b.i);
  report.probes.burst = burst;

  const capacityHits = burst.filter((r) => r.capacityHit).length;
  const productOk = burst.filter((r) => r.status === 200 && r.success && r.products > 0).length;
  const hard429 = burst.filter((r) => r.status === 429).length;

  console.log(`capacityHits=${capacityHits}/16 productOk=${productOk}/16 hard429=${hard429}/16`);
  for (const row of burst.slice(0, 4)) {
    console.log(JSON.stringify({ i: row.i, status: row.status, products: row.products, opReason: row.opReason, tray: row.trayHeadline }));
  }

  pass(capacityHits === 0, `No capacity/stale banner on mild burst (got ${capacityHits}/16)`);
  pass(productOk >= 14, `Most burst requests still yield products (got ${productOk}/16)`);

  // Control: H-01 still healthy
  const dyson = await search("Dyson V15");
  report.probes.dysonControl = dyson;
  pass(dyson.success && dyson.products > 0, `H-01 control Dyson still yields products (got ${dyson.products})`);

  // Critical control
  const hostile = await fetch(`${base}/api/decision/run`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ query: "<img src=x onerror=alert(1)>", forcedDomain: "hotel" }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const hj = await hostile.json().catch(() => null);
  report.probes.criticalControl = { status: hostile.status, success: hj?.success, code: hj?.error?.code || hj?.code };
  pass(
    hostile.status === 400 || hj?.success === false,
    `Critical control still fail-closed (status=${hostile.status})`
  );

  report.verdict = "PASS";
  console.log("\nIndependent QA H-06: PASS");
} catch (e) {
  report.verdict = "FAIL";
  report.error = String(e.message || e);
  console.error("\nIndependent QA H-06: FAIL", report.error);
}

mkdirSync("docs/wave1", { recursive: true });
writeFileSync("docs/wave1/H06_INDEPENDENT_QA.json", JSON.stringify(report, null, 2));
console.log("Wrote docs/wave1/H06_INDEPENDENT_QA.json");
process.exit(report.verdict === "PASS" ? 0 : 1);
