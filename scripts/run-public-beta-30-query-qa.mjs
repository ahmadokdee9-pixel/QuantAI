#!/usr/bin/env node
/**
 * Public beta 30-query QA — production API execution + quality heuristics.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:public-beta-30-qa
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  ValidationRequestQueue,
  validationSearch,
  isInfrastructureFailure,
} from "./lib/validationQueue.mjs";

const BASE = (process.env.SEARCH_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "beta-launch");
const LATENCY_OUTLIER_MS = Number(process.env.BETA_QA_LATENCY_OUTLIER_MS || "10000");
const INTERVAL_MS = Number(process.env.BETA_QA_INTERVAL_MS || "2500");

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 QuantAI-QA/1.0";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 QuantAI-QA-Mobile/1.0";

const SUITE = [
  { id: 1, query: "iphone 16", bucket: "electronics", lang: "en", category: "phone", intent: "exact_sku" },
  { id: 2, query: "airpods", bucket: "electronics", lang: "en", category: "audio", intent: "exact_sku" },
  { id: 3, query: "gaming monitor for PS5 under 500", bucket: "electronics", lang: "en", category: "electronics", intent: "constraint_nl" },
  { id: 4, query: "iphone 15 pro max titanium", bucket: "electronics", lang: "en", category: "phone", intent: "exact_sku" },
  { id: 5, query: "compare airpods pro vs airpods 4", bucket: "comparison", lang: "en", category: "audio", intent: "comparison" },
  { id: 6, query: "best premium headphones for focus", bucket: "electronics", lang: "en", category: "audio", intent: "aesthetic_nl" },
  { id: 7, query: "adidas samba", bucket: "fashion", lang: "en", category: "shoes", intent: "exact_sku" },
  { id: 8, query: "nike shoes like vomero but cheaper", bucket: "fashion", lang: "en", category: "shoes", intent: "alternative" },
  { id: 9, query: "minimal white sneakers like Common Projects", bucket: "fashion", lang: "en", category: "shoes", intent: "aesthetic_nl" },
  { id: 10, query: "sofa", bucket: "furniture", lang: "en", category: "furniture", intent: "category" },
  { id: 11, query: "luxury looking sofa under 1000", bucket: "furniture", lang: "en", category: "furniture", intent: "budget_premium" },
  { id: 12, query: "minimal desk setup", bucket: "furniture", lang: "en", category: "desk_setup", intent: "aesthetic_nl" },
  { id: 13, query: "كنبة زاوية", bucket: "furniture AR", lang: "ar", category: "furniture", intent: "arabic" },
  { id: 14, query: "كرسي office minimal", bucket: "mixed AR/EN", lang: "mixed", category: "furniture", intent: "mixed_ar_en" },
  { id: 15, query: "كرسي مكتب مريح وفخم", bucket: "furniture AR", lang: "ar", category: "furniture", intent: "arabic_nl" },
  { id: 16, query: "iphone 15 برو max titanium", bucket: "mixed AR/EN", lang: "mixed", category: "phone", intent: "mixed_ar_en" },
  { id: 17, query: "luxury ساعة under 300", bucket: "luxury", lang: "mixed", category: "watch", intent: "mixed_ar_en" },
  { id: 18, query: "ساعة شكلها luxury بس سعرها معقول", bucket: "luxury AR", lang: "ar", category: "watch", intent: "arabic_budget_premium" },
  { id: 19, query: "yves saint laurent libre edp 90ml", bucket: "fragrance", lang: "en", category: "fragrance", intent: "exact_sku" },
  { id: 20, query: "جزمة مثل nike vomero بس ارخص", bucket: "fashion AR", lang: "ar", category: "shoes", intent: "mixed_ar_en" },
  { id: 21, query: "ايفون 16 رخيص", bucket: "budget AR", lang: "ar", category: "phone", intent: "arabic_budget" },
  { id: 22, query: "سماعات ايربودز", bucket: "budget AR", lang: "ar", category: "audio", intent: "arabic" },
  { id: 23, query: "robot vacuum under 400", bucket: "home", lang: "en", category: "home", intent: "constraint_nl" },
  { id: 24, query: "cheap but luxury looking sofa", bucket: "furniture", lang: "en", category: "furniture", intent: "budget_premium" },
  { id: 25, query: "iphone 16 case", bucket: "accessory", lang: "en", category: "phone", intent: "accessory_ok" },
  { id: 26, query: "best headphones for focus", bucket: "electronics", lang: "en", category: "audio", intent: "aesthetic_nl" },
  { id: 27, query: "gaming monitor", bucket: "electronics", lang: "en", category: "electronics", intent: "category" },
  { id: 28, query: "robot vacuum under 400", bucket: "home", lang: "en", category: "home", intent: "constraint_nl", note: "duplicate of #23" },
  { id: 29, query: "adidas samba white", bucket: "fashion", lang: "en", category: "shoes", intent: "exact_sku" },
  { id: 30, query: "luxury watch rolex style under 500", bucket: "luxury", lang: "en", category: "watch", intent: "luxury_budget" },
];

const ACCESSORY_RX = /\b(case|cover|hoesje|protector|strap|band|charger|cable|adapter|screen protector)\b/i;
const WRONG_GEN_RX = /\biphone\s*1[0-4]\b/i;
const FAKE_RX = /\b(replica|fake|dummy|box only|prop)\b/i;
const FITNESS_WATCH_RX =
  /\b(galaxy\s+fit|fitbit|mi\s+band|smart\s+band|fitness\s+tracker|activity\s+tracker|amazfit\s+band)\b|galaxy\s+fit\d+/i;
const LUXURY_WATCH_QUERY_RX =
  /\b(luxury|elegant|swiss|mechanical|prestige|rolex|omega|tag heuer|فخم|فاخر|شكلها\s*luxury)\b/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeStore(p) {
  return String(p.store ?? p.source ?? "unknown").toLowerCase().trim();
}

function titleKey(t) {
  return String(t ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .join(" ");
}

function top3MerchantDupes(products) {
  const top3 = products.slice(0, 3);
  const byStore = new Map();
  for (const p of top3) {
    const s = normalizeStore(p);
    byStore.set(s, (byStore.get(s) ?? 0) + 1);
  }
  const dominated = [...byStore.entries()].filter(([, n]) => n >= 2);
  const titleDupes = [];
  const seen = new Map();
  for (const p of top3) {
    const k = titleKey(p.title);
    if (seen.has(k)) titleDupes.push({ a: seen.get(k), b: p.title });
    else seen.set(k, p.title);
  }
  return { storeDominated: dominated, titleDupes };
}

function classifyQuality(spec, products, meta) {
  const issues = [];
  const top5 = products.slice(0, 5);
  const top10 = products.slice(0, 10);
  const cat = meta?.canonicalQuery?.category ?? null;

  if (!products.length) issues.push({ type: "broken", code: "empty_tray", severity: "critical" });
  if (meta?.errorState) issues.push({ type: "broken", code: "error_state", severity: "critical", detail: String(meta.errorState) });

  if (spec.category && cat && cat !== spec.category && spec.intent !== "accessory_ok") {
    issues.push({ type: "quality", code: "category_drift", severity: "high", detail: `expected ${spec.category}, got ${cat}` });
  }

  if (spec.intent !== "accessory_ok") {
    const acc = top5.filter((p) => ACCESSORY_RX.test(p.title ?? "")).length;
    if (acc >= 2) issues.push({ type: "quality", code: "accessory_pollution", severity: "high", detail: `${acc}/5 accessories` });
  }

  if (/iphone/i.test(spec.query) && spec.intent === "exact_sku") {
    const wrong = top5.filter((p) => WRONG_GEN_RX.test(p.title ?? "")).length;
    if (wrong >= 1) issues.push({ type: "quality", code: "wrong_generation", severity: "high" });
  }

  if (FAKE_RX.test(top5.map((p) => p.title ?? "").join(" "))) {
    issues.push({ type: "hallucination", code: "trust_risk_listing", severity: "high" });
  }

  const highConfLowTrust = top5.filter((p) => {
    const conf = p.qiBuyingDecision?.confidence ?? p.qiComposite ?? 0;
    const trust = p.qiRealityTrust?.sellerTrustScore ?? 65;
    return conf >= 72 && trust < 52;
  }).length;
  if (highConfLowTrust >= 2) {
    issues.push({ type: "hallucination", code: "confidence_hallucination", severity: "medium", detail: "high score + weak seller" });
  }

  const mismatch = top5.filter((p) => (p.qiListingIdentity?.semanticMismatchPenalty01 ?? 0) >= 0.55).length;
  if (mismatch >= 3) issues.push({ type: "hallucination", code: "irrelevant_ranking", severity: "high" });

  if ((spec.bucket === "luxury" || spec.category === "watch") && LUXURY_WATCH_QUERY_RX.test(spec.query)) {
    const fit = top5.filter((p) => FITNESS_WATCH_RX.test(p.title ?? "")).length;
    if (fit >= 2) issues.push({ type: "quality", code: "luxury_fitness_pollution", severity: "critical", detail: `${fit}/5 fitness bands` });
  }

  const dup = top3MerchantDupes(products);
  if (dup.storeDominated.length) {
    issues.push({
      type: "duplicate",
      code: "top3_same_merchant",
      severity: "medium",
      detail: dup.storeDominated.map(([s, n]) => `${s}×${n}`).join(", "),
    });
  }
  if (dup.titleDupes.length) {
    issues.push({ type: "duplicate", code: "top3_near_duplicate_title", severity: "medium" });
  }

  let relevant = 0;
  for (const p of top10) {
    if ((p.link ?? "").startsWith("http")) relevant += 1;
  }
  if (products.length && relevant < 2) {
    issues.push({ type: "broken", code: "missing_outbound", severity: "critical", detail: `links in top10=${relevant}` });
  }

  const critical = issues.filter((i) => i.severity === "critical").length;
  const high = issues.filter((i) => i.severity === "high").length;
  const pass =
    products.length >= (spec.lang === "ar" || spec.lang === "mixed" ? 2 : 2) &&
    critical === 0 &&
    high === 0;

  return { issues, pass, relevantInTop10: relevant };
}

async function searchWithUa(query, ua) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": ua, Accept: "application/json" },
  });
  const latencyMs = Date.now() - t0;
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* */
  }
  const products = Array.isArray(json?.data?.products) ? json.data.products : [];
  const meta = json?.data?.meta ?? {};
  return { status: res.status, success: json?.success === true, latencyMs, products, meta, error: json?.error };
}

async function probeOutbound(link) {
  if (!link?.startsWith("http")) return { ok: false, reason: "no_link" };
  try {
    const res = await fetch(`${BASE}/api/outbound?to=${encodeURIComponent(link)}`, {
      redirect: "manual",
      headers: { "User-Agent": DESKTOP_UA },
    });
    const loc = res.headers.get("location") ?? "";
    const ok = res.status === 302 || res.status === 301 || res.status === 307;
    return { ok, status: res.status, location: loc.slice(0, 120) };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function probePage(path, ua) {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": ua }, redirect: "follow" });
    const html = await res.text();
    const hasViewport = /viewport/i.test(html);
    const hasRoot = /id="__next"|id="root"|QuantAI|smartbuy/i.test(html);
    return { status: res.status, ok: res.status === 200 && hasRoot, hasViewport, bytes: html.length };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

async function flowTests(cookie) {
  const flows = { guest: {}, signedIn: {}, compare: {}, save: {}, outbound: {} };

  flows.guest.search401boundary = null;
  const g = await searchWithUa("iphone 16", DESKTOP_UA);
  flows.guest.search = g.success && g.status === 200;
  flows.guest.products = g.products.length;

  const ob = g.products[0]?.link;
  flows.outbound = await probeOutbound(ob);

  if (!cookie) {
    const saveRes = await fetch(`${BASE}/api/search/save-product`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: ob, title: g.products[0]?.title, price: g.products[0]?.price }),
    });
    flows.save = { tested: "guest", status: saveRes.status, pass: saveRes.status === 401 };

    const cmpRes = await fetch(`${BASE}/api/search/compare-verdict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: g.products.slice(0, 2) }),
    });
    flows.compare = { tested: "guest", status: cmpRes.status, pass: cmpRes.status === 401 };
    flows.signedIn = { skipped: true, reason: "BETA_CLERK_SESSION_COOKIE unset" };
    return flows;
  }

  const headers = { "Content-Type": "application/json", Cookie: cookie };
  const saveRes = await fetch(`${BASE}/api/search/save-product`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      link: ob,
      title: g.products[0]?.title,
      price: g.products[0]?.price,
      image: g.products[0]?.image,
      product_id: ob,
    }),
  });
  let saveJson = {};
  try {
    saveJson = await saveRes.json();
  } catch {
    /* */
  }
  flows.save = {
    tested: "signed-in",
    status: saveRes.status,
    pass: saveRes.status === 200 || saveRes.status === 201,
    error: saveJson?.error,
  };

  const cmpRes = await fetch(`${BASE}/api/search/compare-verdict`, {
    method: "POST",
    headers,
    body: JSON.stringify({ products: g.products.slice(0, 2) }),
  });
  let cmpJson = {};
  try {
    cmpJson = await cmpRes.json();
  } catch {
    /* */
  }
  flows.compare = {
    tested: "signed-in",
    status: cmpRes.status,
    pass: cmpRes.status === 200 && (cmpJson?.success === true || cmpJson?.data?.verdict),
    hasVerdict: Boolean(cmpJson?.data?.verdict ?? cmpJson?.verdict),
  };
  flows.signedIn = { cookiePresent: true };
  return flows;
}

function verdictFrom(rows, flows, mobilePages) {
  const passCount = rows.filter((r) => r.verdict === "PASS").length;
  const failCount = rows.filter((r) => r.verdict === "FAIL").length;
  const criticalFails = rows.filter((r) => r.critical).length;
  const mobileApiFails = rows.filter((r) => !r.mobileOk).length;
  const pageOk = mobilePages.desktop?.ok && mobilePages.mobile?.ok;

  if (criticalFails > 0 || failCount > 3) return { label: "FAIL", passCount, failCount, criticalFails };
  if (passCount >= 28 && failCount <= 2 && mobileApiFails <= 2 && pageOk) {
    return { label: "PASS", passCount, failCount, criticalFails };
  }
  return { label: "CONDITIONAL_PASS", passCount, failCount, criticalFails };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const queue = new ValidationRequestQueue({ minIntervalMs: INTERVAL_MS });
  const rows = [];
  const cookie = process.env.BETA_CLERK_SESSION_COOKIE?.trim();

  console.log(`30-query QA — ${BASE}\n`);

  for (const spec of SUITE) {
    const desktop = await validationSearch(BASE, spec.query, queue);
    await sleep(400);
    const mobile = await searchWithUa(spec.query, MOBILE_UA);

    const products = desktop.products ?? [];
    const meta = desktop.meta ?? {};
    const quality = classifyQuality(spec, products, meta);

    const criteria = {
      A: desktop.success && desktop.status === 200,
      B: quality.relevantInTop10 >= 2 && products.length >= 2,
      C: !quality.issues.some((i) => i.code === "category_drift" || i.code === "luxury_fitness_pollution"),
      D: !quality.issues.some((i) => i.type === "duplicate"),
      E: quality.relevantInTop10 >= 2,
      F: desktop.latencyMs <= LATENCY_OUTLIER_MS,
    };
    const allCriteria = Object.values(criteria).every(Boolean);
    const critical = quality.issues.some((i) => i.severity === "critical");
    const verdict = isInfrastructureFailure(desktop)
      ? "SKIP"
      : critical || !criteria.A || !criteria.B
        ? "FAIL"
        : allCriteria
          ? "PASS"
          : "FAIL";

    const row = {
      id: spec.id,
      query: spec.query,
      bucket: spec.bucket,
      lang: spec.lang,
      verdict,
      criteria,
      critical,
      latencyMs: desktop.latencyMs,
      latencyOutlier: desktop.latencyMs > LATENCY_OUTLIER_MS,
      mobileOk: mobile.success && mobile.status === 200 && mobile.products.length >= Math.min(2, products.length > 0 ? 1 : 2),
      mobileLatencyMs: mobile.latencyMs,
      productCount: products.length,
      canonicalCategory: meta?.canonicalQuery?.category ?? null,
      top3Titles: products.slice(0, 3).map((p) => (p.title ?? "").slice(0, 80)),
      issues: quality.issues,
      degraded: desktop.degraded,
    };
    rows.push(row);
    console.log(
      `#${String(spec.id).padStart(2)} ${verdict} ${spec.query.slice(0, 40)} | ${desktop.latencyMs}ms | products=${products.length} | issues=${quality.issues.map((i) => i.code).join(",") || "none"}`
    );
  }

  const flows = await flowTests(cookie);
  const mobilePages = {
    desktop: await probePage("/", DESKTOP_UA),
    mobile: await probePage("/", MOBILE_UA),
  };
  await sleep(300);
  mobilePages.mobileSearch = await probePage(`/?q=${encodeURIComponent("iphone 16")}`, MOBILE_UA);

  const broken = rows.filter((r) => r.verdict === "FAIL" && (r.critical || r.criteria.A === false || r.productCount < 2));
  const duplicates = rows.flatMap((r) =>
    r.issues.filter((i) => i.type === "duplicate").map((i) => ({ id: r.id, query: r.query, ...i }))
  );
  const hallucinations = rows.flatMap((r) =>
    r.issues.filter((i) => i.type === "hallucination").map((i) => ({ id: r.id, query: r.query, ...i }))
  );
  const latencyOutliers = rows.filter((r) => r.latencyOutlier).sort((a, b) => b.latencyMs - a.latencyMs);
  const mobileIssues = rows.filter((r) => !r.mobileOk);
  const qualityNotes = rows.flatMap((r) =>
    r.issues.filter((i) => i.type === "quality").map((i) => ({ id: r.id, query: r.query, ...i }))
  );

  const finalVerdict = verdictFrom(rows, flows, mobilePages);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    rows,
    flows,
    mobilePages,
    broken,
    duplicates,
    hallucinations,
    latencyOutliers,
    mobileIssues,
    qualityNotes,
    finalVerdict,
  };

  const md = buildMarkdown(report);
  const jsonPath = join(OUT_DIR, "public-beta-30-query-qa.json");
  const mdPath = join(OUT_DIR, "PUBLIC_BETA_30_QUERY_QA_REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, md);
  console.log(`\nWrote ${mdPath}`);
  console.log(`Verdict: ${finalVerdict.label} (${finalVerdict.passCount}/30 pass, ${finalVerdict.failCount} fail)`);
  process.exit(finalVerdict.label === "FAIL" ? 1 : 0);
}

function buildMarkdown(r) {
  const v = r.finalVerdict;
  const table = r.rows
    .map(
      (row) =>
        `| ${row.id} | ${row.query.replace(/\|/g, "\\|").slice(0, 45)} | ${row.lang} | ${row.verdict} | ${row.latencyMs} | ${row.productCount} | ${row.mobileOk ? "Y" : "N"} | ${Object.entries(row.criteria).map(([k, ok]) => `${k}:${ok ? "✓" : "✗"}`).join(" ")} | ${row.issues.map((i) => i.code).join(", ") || "—"} |`
    )
    .join("\n");

  return `# Public beta 30-query QA report

**Generated:** ${r.generatedAt}  
**Base URL:** ${r.baseUrl}  
**Method:** Automated API QA (desktop + mobile User-Agent); HTML shell check for mobile/desktop pages. Visual mobile UI requires manual device pass.

## Final verdict: **${v.label}**

| Metric | Value |
|--------|------:|
| Pass | ${v.passCount} / 30 |
| Fail | ${v.failCount} / 30 |
| Critical failures | ${v.criticalFails} |

---

## 1. PASS/FAIL table

| # | Query | Lang | Verdict | Latency ms | Products | Mobile API | A–F | Issues |
|---|-------|------|---------|----------:|---------:|:----------:|-----|--------|
${table}

---

## 2. Broken queries

${r.broken.length ? r.broken.map((b) => `- **#${b.id}** \`${b.query}\` — products=${b.productCount}, ${b.issues.map((i) => i.code).join(", ")}`).join("\n") : "_None_"}

---

## 3. Duplicate issues

${r.duplicates.length ? r.duplicates.map((d) => `- **#${d.id}** \`${d.query}\` — ${d.code}: ${d.detail ?? ""}`).join("\n") : "_None detected in top 3_"}

---

## 4. Hallucination / trust cases

${r.hallucinations.length ? r.hallucinations.map((h) => `- **#${h.id}** \`${h.query}\` — ${h.code} (${h.severity})${h.detail ? `: ${h.detail}` : ""}`).join("\n") : "_None flagged_"}

---

## 5. Latency outliers (>${LATENCY_OUTLIER_MS}ms)

${r.latencyOutliers.length ? r.latencyOutliers.map((l) => `- **#${l.id}** \`${l.query}\` — **${l.latencyMs}ms** (mobile ${l.mobileLatencyMs}ms)`).join("\n") : "_None_"}

---

## 6. Mobile UI / client issues

| Check | Desktop | Mobile UA |
|-------|---------|-----------|
| Home \`/\` | ${r.mobilePages.desktop?.status} ${r.mobilePages.desktop?.ok ? "OK" : "FAIL"} (viewport: ${r.mobilePages.desktop?.hasViewport}) | ${r.mobilePages.mobile?.status} ${r.mobilePages.mobile?.ok ? "OK" : "FAIL"} (viewport: ${r.mobilePages.mobile?.hasViewport}) |
| Search shell | — | ${r.mobilePages.mobileSearch?.status} ${r.mobilePages.mobileSearch?.ok ? "OK" : "FAIL"} |

**Mobile API mismatches** (desktop OK, mobile tray worse):  
${r.mobileIssues.length ? r.mobileIssues.map((m) => `- #${m.id} \`${m.query}\``).join("\n") : "_None_"}

_Note: Layout/tap targets/card overflow require manual iPhone/Android pass — not evaluated by this script._

---

## 7. Search quality notes

${r.qualityNotes.length ? r.qualityNotes.map((q) => `- **#${q.id}** \`${q.query}\` — ${q.code}${q.detail ? `: ${q.detail}` : ""}`).join("\n") : "_No additional quality flags beyond table._"}

---

## 8. Flow tests

| Flow | Result |
|------|--------|
| Guest search | ${r.flows.guest?.search ? "PASS" : "FAIL"} (${r.flows.guest?.products ?? 0} products) |
| Guest save (expect 401) | ${r.flows.save?.pass ? "PASS" : "FAIL"} status=${r.flows.save?.status} |
| Guest compare (expect 401) | ${r.flows.compare?.pass ? "PASS" : "FAIL"} status=${r.flows.compare?.status} |
| Outbound redirect | ${r.flows.outbound?.ok ? "PASS" : "FAIL"} ${r.flows.outbound?.status ?? ""} |
| Signed-in save | ${r.flows.save?.skipped ? "SKIP — set BETA_CLERK_SESSION_COOKIE" : r.flows.save?.pass ? "PASS" : "FAIL"} |
| Signed-in compare | ${r.flows.compare?.skipped ? "SKIP" : r.flows.compare?.pass ? "PASS" : "FAIL"} |

---

## Sign-off

| Role | Result |
|------|--------|
| Automated QA | **${v.label}** |
| Product manual (visual mobile) | Pending |
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
