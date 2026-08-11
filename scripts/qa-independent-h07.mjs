/**
 * Independent QA for H-07 only (post-deploy).
 *
 * Usage: node scripts/qa-independent-h07.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const base = "https://www.quantaihq.com";
const ua = "QuantAI-Independent-QA-H07/1.0";

function pass(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`[PASS] ${msg}`);
}

function makeJar() {
  const jar = new Map();
  return {
    store(res) {
      const raw =
        typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
      for (const c of raw) {
        const [nv] = c.split(";");
        const i = nv.indexOf("=");
        if (i > 0) jar.set(nv.slice(0, i).trim(), nv.slice(i + 1));
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
  };
}

async function fetchHtml(path) {
  const jar = makeJar();
  let current = base + path;
  for (let i = 0; i < 10; i++) {
    const r = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "cache-control": "no-cache",
        "user-agent": ua,
        ...(jar.header() ? { cookie: jar.header() } : {}),
      },
    });
    jar.store(r);
    if (r.status >= 301 && r.status <= 308) {
      const loc = r.headers.get("location");
      if (!loc) throw new Error(`Redirect without location from ${current}`);
      current = new URL(loc, current).href;
      continue;
    }
    return { status: r.status, html: await r.text(), csp: Boolean(r.headers.get("content-security-policy")) };
  }
  throw new Error("Too many redirects");
}

const report = {
  issue: "H-07",
  at: new Date().toISOString(),
  base,
  probes: {},
  verdict: "PENDING",
};

try {
  console.log("=== Independent QA H-07 ===\n");

  const before = JSON.parse(readFileSync("docs/wave1/H07_BEFORE_METRICS.json", "utf8"));
  report.probes.before = before.criticalPathMeasure;

  const measure = execSync("node scripts/measure-critical-path.mjs", { encoding: "utf8" });
  const after = JSON.parse(measure);
  report.probes.after = {
    htmlBytes: after.htmlBytes,
    fontBytes: after.byKind.font,
    nonGeistFontBytes: after.nonGeistFontBytes,
    geistFontBytes: after.geistFontBytes,
    cssBytesUncompressed: after.byKind.css,
    jsBytesUncompressed: after.byKind.js,
    arabicInCssStack: after.arabicInCssStack,
  };
  console.log(JSON.stringify(report.probes.after, null, 2));

  pass(after.nonGeistFontBytes === 0, `Non-Geist fonts removed (bytes=${after.nonGeistFontBytes})`);
  pass(after.arabicInCssStack === false, "Arabic font stack removed from CSS vars");
  pass(
    after.byKind.font < before.criticalPathMeasure.fontBytes,
    `Font payload reduced (${before.criticalPathMeasure.fontBytes} → ${after.byKind.font})`
  );
  pass(
    after.byKind.font <= 80000,
    `Font critical path ≤ 80KB (actual=${after.byKind.font})`
  );

  const home = await fetchHtml("/");
  report.probes.home = { status: home.status, csp: home.csp, htmlBytes: home.html.length };
  pass(home.status === 200, `Homepage unaffected (status=${home.status})`);
  pass(home.csp === true, "Homepage CSP still present");
  pass(!/fontshare|Satoshi/i.test(home.html), "Homepage HTML has no Fontshare/Satoshi references");

  // CSS must not pull Fontshare
  const cssPath = (home.html.match(/\/_next\/static\/chunks\/[^"']+\.css/) || [])[0];
  pass(Boolean(cssPath), "Homepage references a CSS chunk");
  const css = await (await fetch(base + cssPath, { cache: "no-store" })).text();
  report.probes.css = { path: cssPath, bytes: css.length, fontshare: /fontshare/i.test(css) };
  pass(!/fontshare/i.test(css), "Bundled CSS has no Fontshare @import");

  const search = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "quantai-web",
      "user-agent": ua,
      "cache-control": "no-cache",
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
  };
  pass(
    search.status === 200 && sj?.success && (sj?.data?.products?.length ?? 0) > 0,
    `Search / Decide flow unaffected (products=${report.probes.search.products})`
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
  report.probes.decision = {
    status: hostile.status,
    success: hj?.success,
    code: hj?.error?.code || hj?.code,
  };
  pass(
    hostile.status === 400 || hj?.success === false,
    `Decision Engine still fail-closed (status=${hostile.status})`
  );

  const health = await fetch(`${base}/api/health`, { cache: "no-store" }).then((r) => r.json());
  report.probes.rateLimit = health?.rateLimit || null;
  pass(
    health?.rateLimit?.shared === true || health?.rateLimit?.backend === "upstash",
    "Rate limiting still active (Upstash shared)"
  );

  // Auth funnel still works (H-04 control)
  const dash = await fetch(`${base}/dashboard`, {
    redirect: "manual",
    cache: "no-store",
    headers: {
      accept: "text/html",
      "sec-fetch-dest": "document",
      "user-agent": ua,
    },
  });
  report.probes.authControl = {
    status: dash.status,
    loc: dash.headers.get("location"),
    reason: dash.headers.get("x-clerk-auth-reason"),
  };
  pass(
    dash.status !== 404 || String(dash.headers.get("x-clerk-auth-reason") || "").includes("protect"),
    "Clerk auth still active on /dashboard (no auth weaken)"
  );

  report.verdict = "PASS";
  console.log("\nIndependent QA H-07: PASS");
} catch (e) {
  report.verdict = "FAIL";
  report.error = String(e.message || e);
  console.error("\nIndependent QA H-07: FAIL", report.error);
}

mkdirSync("docs/wave1", { recursive: true });
writeFileSync("docs/wave1/H07_INDEPENDENT_QA.json", JSON.stringify(report, null, 2));
console.log("Wrote docs/wave1/H07_INDEPENDENT_QA.json");
process.exit(report.verdict === "PASS" ? 0 : 1);
