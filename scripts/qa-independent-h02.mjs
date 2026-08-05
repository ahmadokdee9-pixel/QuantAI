/**
 * Independent QA for H-02 only (post-deploy).
 * After a real SKU warm, nonsense query must not return that SKU's tray.
 *
 * Usage: node scripts/qa-independent-h02.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const base = "https://www.quantaihq.com";
const hdr = {
  "content-type": "application/json",
  "x-requested-with": "quantai-web",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "user-agent": "QuantAI-Independent-QA-H02/1.0",
};

const NONSENSE = "asdfghjkl qwerty nonexistent product xyzzy";

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
  const products = Array.isArray(j?.data?.products) ? j.data.products : [];
  const titles = products.map((p) => String(p.title || ""));
  const op = j?.data?.meta?.operationalState ?? j?.data?.operationalState ?? null;
  const unrelated =
    products.length > 0 &&
    titles.some((t) => {
      const l = t.toLowerCase();
      return (
        l.includes("dyson") ||
        l.includes("kindle") ||
        l.includes("paperwhite") ||
        (!l.includes("asdf") && !l.includes("xyzzy"))
      );
    });
  return {
    q,
    status: r.status,
    ms: Date.now() - t,
    success: j?.success === true,
    products: products.length,
    titles: titles.slice(0, 4),
    opReason: op?.reason ?? null,
    unrelated,
    error: j?.error ?? null,
  };
}

function pass(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`[PASS] ${msg}`);
}

const report = {
  issue: "H-02",
  at: new Date().toISOString(),
  base,
  probes: {},
  verdict: "PENDING",
};

try {
  console.log("=== Independent QA H-02 ===\n");

  const warm = await search("Dyson V15");
  report.probes.warm = warm;
  pass(warm.success && warm.products > 0, `Warm Dyson yields products (got ${warm.products})`);

  const runs = [];
  let unrelatedHits = 0;
  for (let i = 1; i <= 5; i++) {
    const row = await search(NONSENSE);
    runs.push({ i, ...row });
    if (row.unrelated) unrelatedHits++;
    console.log(
      JSON.stringify({
        i,
        status: row.status,
        products: row.products,
        unrelated: row.unrelated,
        opReason: row.opReason,
        titles: row.titles.slice(0, 2),
      })
    );
  }
  report.probes.nonsense = runs;

  pass(unrelatedHits === 0, `No unrelated products after warm (got ${unrelatedHits}/5)`);
  pass(
    runs.every((r) => r.products === 0 || r.status >= 400 || r.success === false),
    "Nonsense yields empty tray or explicit failure — not foreign catalog"
  );

  // Controls
  const nike = await search("Nike Pegasus 41");
  report.probes.nikeControl = { products: nike.products, success: nike.success };
  pass(nike.success && nike.products > 0, `H-01 control Nike still yields products (got ${nike.products})`);

  const hostile = await fetch(`${base}/api/decision/run`, {
    method: "POST",
    headers: hdr,
    body: JSON.stringify({ query: "<img src=x onerror=alert(1)>", forcedDomain: "hotel" }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const hj = await hostile.json().catch(() => null);
  report.probes.criticalControl = {
    status: hostile.status,
    success: hj?.success,
    code: hj?.error?.code || hj?.code,
  };
  pass(
    hostile.status === 400 || hj?.success === false,
    `Critical control still fail-closed (status=${hostile.status})`
  );

  report.verdict = "PASS";
  console.log("\nIndependent QA H-02: PASS");
} catch (e) {
  report.verdict = "FAIL";
  report.error = String(e.message || e);
  console.error("\nIndependent QA H-02: FAIL", report.error);
}

mkdirSync("docs/wave1", { recursive: true });
writeFileSync("docs/wave1/H02_INDEPENDENT_QA.json", JSON.stringify(report, null, 2));
console.log("Wrote docs/wave1/H02_INDEPENDENT_QA.json");
process.exit(report.verdict === "PASS" ? 0 : 1);
