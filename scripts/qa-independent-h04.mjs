/**
 * Independent QA for H-04 only (post-deploy).
 *
 * Uses browser document Accept + cookie jar so Clerk handshake can complete.
 * Non-document Accept (star/star) protect-rewrite 404 is intentional Clerk behavior — not a defect.
 *
 * Usage: node scripts/qa-independent-h04.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const base = "https://www.quantaihq.com";
const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 QuantAI-Independent-QA-H04/1.0";

function pass(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`[PASS] ${msg}`);
}

function isRedirect(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
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
    clear() {
      jar.clear();
    },
  };
}

async function documentNavigate(startPath, { maxHops = 10 } = {}) {
  const jar = makeJar();
  let url = base + startPath;
  const steps = [];
  for (let i = 0; i < maxHops; i++) {
    const r = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        "user-agent": ua,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": i === 0 ? "none" : "cross-site",
        "cache-control": "no-cache",
        pragma: "no-cache",
        ...(jar.header() ? { cookie: jar.header() } : {}),
      },
    });
    jar.store(r);
    const loc = r.headers.get("location");
    const step = {
      i,
      status: r.status,
      url: url.startsWith(base) ? url.slice(base.length) : url,
      loc: loc ? (loc.startsWith(base) ? loc.slice(base.length) : loc) : null,
      clerkReason: r.headers.get("x-clerk-auth-reason"),
      csp: Boolean(r.headers.get("content-security-policy")),
    };
    steps.push(step);
    if (!isRedirect(r.status) || !loc) {
      const title = ((await r.text()).match(/<title>([^<]+)/i) || [])[1] || null;
      return { final: { ...step, title }, steps };
    }
    url = new URL(loc, url).href;
  }
  return { final: steps[steps.length - 1], steps, loop: true };
}

function landsOnSignIn(result, protectedPath) {
  const finalUrl = String(result.final?.url || "");
  if (result.final?.status !== 200) return false;
  if (!finalUrl.includes("/sign-in")) return false;
  if (!protectedPath) return true;
  return (
    finalUrl.includes(protectedPath) ||
    finalUrl.includes(encodeURIComponent(protectedPath)) ||
    finalUrl.includes("redirect_url")
  );
}

const report = { issue: "H-04", at: new Date().toISOString(), base, probes: {}, verdict: "PENDING" };

try {
  console.log("=== Independent QA H-04 ===\n");

  const signIn = await documentNavigate("/sign-in");
  report.probes.signIn = signIn;
  console.log(JSON.stringify({ final: signIn.final, hops: signIn.steps.length }));
  pass(!signIn.loop, "Direct /sign-in has no redirect loop");
  pass(signIn.final.status === 200, `Direct /sign-in resolves (status=${signIn.final.status})`);
  pass(String(signIn.final.url).includes("/sign-in"), "Direct /sign-in lands on /sign-in");
  pass(signIn.steps.every((s) => s.status !== 404), "Direct /sign-in never hits dead 404");
  pass(signIn.final.csp === true, "/sign-in still has CSP");

  const protectedPaths = [
    "/dashboard",
    "/decisions",
    "/watchlist",
    "/saved",
    "/agent",
    "/billing",
    "/feed",
  ];
  const protectedRuns = [];
  for (const p of protectedPaths) {
    const row = await documentNavigate(p);
    protectedRuns.push({ path: p, final: row.final, hops: row.steps.length, loop: !!row.loop });
    console.log(JSON.stringify({ path: p, final: row.final, hops: row.steps.length }));
    pass(!row.loop, `${p} has no redirect loop`);
    pass(row.steps.every((s) => s.status !== 404), `${p} document nav never hits dead 404`);
    pass(landsOnSignIn(row, p), `${p} → /sign-in with returnUrl (final=${row.final?.url})`);
  }
  report.probes.protected = protectedRuns;

  // Non-document probe: protect-rewrite 404 is intentional (auth not weakened)
  const apiStyle = await fetch(base + "/dashboard", {
    redirect: "manual",
    cache: "no-store",
    headers: { "user-agent": ua, accept: "*/*", "cache-control": "no-cache" },
  });
  report.probes.nonDocumentProtect = {
    status: apiStyle.status,
    reason: apiStyle.headers.get("x-clerk-auth-reason"),
  };
  pass(
    apiStyle.status === 404 &&
      String(apiStyle.headers.get("x-clerk-auth-reason") || "").includes("protect"),
    "Non-document /dashboard still protect-rewrite 404 (auth not weakened)"
  );

  // Controls
  const home = await documentNavigate("/");
  report.probes.home = { status: home.final.status, csp: home.final.csp };
  pass(home.final.status === 200, `Homepage unaffected (status=${home.final.status})`);
  pass(home.final.csp === true, "Homepage CSP still present");

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

  report.verdict = "PASS";
  console.log("\nIndependent QA H-04: PASS");
} catch (e) {
  report.verdict = "FAIL";
  report.error = String(e.message || e);
  console.error("\nIndependent QA H-04: FAIL", report.error);
}

mkdirSync("docs/wave1", { recursive: true });
writeFileSync("docs/wave1/H04_INDEPENDENT_QA.json", JSON.stringify(report, null, 2));
console.log("Wrote docs/wave1/H04_INDEPENDENT_QA.json");
process.exit(report.verdict === "PASS" ? 0 : 1);
