/**
 * Real-world search validation — tray quality, failure modes, deploy regression deltas.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run test:realworld
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ValidationRequestQueue,
  validationSearch,
  isInfrastructureFailure,
  infrastructureLabel,
} from "./lib/validationQueue.mjs";
import { saveValidationRun, loadPreviousRun, compareValidationRuns, deployId } from "./lib/validationHistory.mjs";

const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const OUT_JSON = process.env.VALIDATION_OUT || resolve(import.meta.dirname, "../.validation/realworld-report.json");

const SUITE = [
  { query: "best headphones for focus", bucket: "electronics", intent: "aesthetic_nl", category: "audio" },
  { query: "best premium headphones for focus", bucket: "electronics", intent: "aesthetic_nl", category: "audio" },
  { query: "gaming monitor for PS5 under 500", bucket: "electronics", intent: "constraint_nl", category: "electronics" },
  { query: "iphone 16", bucket: "electronics", intent: "exact_sku", category: "phone" },
  { query: "iphone 15 pro max titanium", bucket: "electronics", intent: "exact_sku", category: "phone" },
  { query: "iphone 16 case", bucket: "electronics", intent: "accessory_ok", category: "phone" },
  { query: "airpods", bucket: "electronics", intent: "exact_sku", category: "audio" },
  { query: "compare airpods pro vs airpods 4", bucket: "electronics", intent: "comparison", category: "audio" },
  { query: "adidas samba", bucket: "fashion", intent: "exact_sku", category: "shoes" },
  { query: "nike shoes like vomero but cheaper", bucket: "fashion", intent: "alternative", category: "shoes" },
  { query: "minimal white sneakers like Common Projects", bucket: "fashion", intent: "aesthetic_nl", category: "shoes" },
  { query: "luxury looking sofa under 1000", bucket: "furniture", intent: "budget_premium", category: "furniture" },
  { query: "cheap but luxury looking sofa", bucket: "furniture", intent: "budget_premium", category: "furniture" },
  { query: "sofa", bucket: "furniture", intent: "category", category: "furniture" },
  { query: "minimal desk setup", bucket: "furniture", intent: "aesthetic_nl", category: "desk_setup" },
  { query: "كنبة زاوية", bucket: "furniture", intent: "arabic", category: "furniture" },
  { query: "iphone 15 برو max titanium", bucket: "electronics", intent: "mixed_ar_en", category: "phone" },
  { query: "كرسي office minimal", bucket: "furniture", intent: "mixed_ar_en", category: "furniture" },
  { query: "كرسي مكتب مريح وفخم", bucket: "furniture", intent: "arabic_nl", category: "furniture" },
  { query: "luxury ساعة under 300", bucket: "luxury", intent: "mixed_ar_en", category: "watch" },
  { query: "ساعة شكلها luxury بس سعرها معقول", bucket: "luxury", intent: "arabic_budget_premium", category: "watch" },
  { query: "جزمة مثل nike vomero بس ارخص", bucket: "fashion", intent: "mixed_ar_en", category: "shoes" },
  { query: "ايفون 16 رخيص", bucket: "budget", intent: "arabic_budget", category: "phone" },
  { query: "سماعات ايربودز", bucket: "budget", intent: "arabic", category: "audio" },
  { query: "yves saint laurent libre edp 90ml", bucket: "luxury", intent: "exact_sku", category: "fragrance" },
  { query: "robot vacuum under 400", bucket: "budget", intent: "constraint_nl", category: "home" },
];

const ACCESSORY_RX = /\b(case|cover|hoesje|protector|strap|band|charger|cable|adapter|screen protector|tempered glass)\b/i;
const WRONG_GEN_RX = /\biphone\s*1[0-4]\b/i;
const FAKE_RX = /\b(replica|fake|dummy|box only|prop)\b/i;
const FITNESS_WATCH_RX =
  /\b(galaxy\s+fit|fitbit|mi\s+band|smart\s+band|fitness\s+tracker|activity\s+tracker|amazfit\s+band)\b|galaxy\s+fit\d+/i;
const LUXURY_WATCH_QUERY_RX =
  /\b(luxury|elegant|swiss|mechanical|prestige|rolex|omega|tag heuer|فخم|فاخر|شكلها\s*luxury)\b/i;

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function classifyFailures(spec, products, meta) {
  const failures = [];
  const top5 = products.slice(0, 5);
  const cat = meta?.canonicalQuery?.category ?? meta?.canonicalQuery?.semantic?.productCategory ?? null;

  if (!products.length) failures.push({ code: "empty_tray", severity: "critical" });
  if (meta?.errorState) failures.push({ code: "api_error_state", severity: "critical", detail: String(meta.errorState) });

  if (spec.category && cat && cat !== spec.category) {
    failures.push({ code: "semantic_drift", severity: "high", detail: `expected ${spec.category}, got ${cat}` });
  }

  const accessoryInTop =
    spec.intent !== "accessory_ok" ? top5.filter((p) => ACCESSORY_RX.test(p.title ?? "")).length : 0;
  if (accessoryInTop >= 2) {
    failures.push({ code: "accessory_pollution", severity: "high", detail: `${accessoryInTop}/5 top are accessories` });
  }

  if (spec.intent === "exact_sku" && /iphone/i.test(spec.query)) {
    const wrongGen = top5.filter((p) => WRONG_GEN_RX.test(p.title ?? "")).length;
    if (wrongGen >= 1) failures.push({ code: "wrong_generation", severity: "high", detail: `${wrongGen} older iPhone in top5` });
  }

  const maxPrice = meta?.canonicalQuery?.budget?.maxPrice;
  if (maxPrice && top5.length) {
    const over = top5.filter((p) => p.price > 0 && p.price > maxPrice * 1.12).length;
    if (over >= 3) failures.push({ code: "budget_mismatch", severity: "medium", detail: `${over}/5 above €${maxPrice}` });
  }

  const dupLinks = new Set();
  let dupCount = 0;
  for (const p of products) {
    const k = p.link || p.title;
    if (dupLinks.has(k)) dupCount++;
    dupLinks.add(k);
  }
  if (dupCount >= 3) failures.push({ code: "duplicate_flooding", severity: "medium", detail: `${dupCount} duplicate links` });

  if (FAKE_RX.test(top5.map((p) => p.title ?? "").join(" "))) failures.push({ code: "trust_risk_listing", severity: "high" });

  const highConfLowTrust = top5.filter((p) => {
    const conf = p.qiBuyingDecision?.confidence ?? p.qiComposite ?? 0;
    const trust = p.qiRealityTrust?.sellerTrustScore ?? 65;
    return conf >= 72 && trust < 52;
  }).length;
  if (highConfLowTrust >= 2) {
    failures.push({ code: "confidence_hallucination", severity: "medium", detail: "high score + weak seller" });
  }

  if (spec.intent === "aesthetic_nl" || spec.intent === "budget_premium") {
    const weakStyle = top5.filter((p) => !/(minimal|premium|luxury|clean|designer|leather|wood|matte)/i.test(p.title ?? "")).length;
    if (weakStyle >= 4 && products.length >= 5) {
      failures.push({ code: "style_mismatch", severity: "low", detail: "top titles lack aesthetic cues" });
    }
  }

  const topRelevance = top5.filter((p) => (p.qiListingIdentity?.semanticMismatchPenalty01 ?? 0) >= 0.55).length;
  if (topRelevance >= 3) failures.push({ code: "irrelevant_ranking", severity: "high", detail: "semantic mismatch in top5" });

  if (
    (spec.bucket === "luxury" || spec.category === "watch") &&
    LUXURY_WATCH_QUERY_RX.test(spec.query)
  ) {
    const fitnessInTop = top5.filter((p) => FITNESS_WATCH_RX.test(p.title ?? "")).length;
    if (fitnessInTop >= 2) {
      failures.push({
        code: "luxury_watch_fitness_pollution",
        severity: "high",
        detail: `${fitnessInTop}/5 top are fitness/smart-band listings`,
      });
    }
  }

  return failures;
}

function scoreTray(spec, products, failures) {
  let ranking = 100;
  let decision = 100;
  let trust = 100;

  for (const f of failures) {
    const hit = f.severity === "critical" ? 35 : f.severity === "high" ? 22 : f.severity === "medium" ? 12 : 6;
    ranking -= hit;
    if (["confidence_hallucination", "trust_risk_listing"].includes(f.code)) trust -= hit;
    if (["accessory_pollution", "wrong_generation", "budget_mismatch"].includes(f.code)) decision -= hit * 0.8;
  }

  if (!products.length) return { ranking: 0, decision: 0, trust: 0 };

  const top3 = products.slice(0, 3);
  const hasVerdict = top3.filter((p) => p.qiVerdict || p.qiBuyingDecision?.stanceLabel).length;
  decision -= (3 - hasVerdict) * 8;

  const prices = products.map((p) => p.price).filter((n) => n > 0);
  const med = median(prices);
  const spread = prices.length ? (Math.max(...prices) - Math.min(...prices)) / (med || 1) : 0;
  if (spread > 4) ranking -= 5;

  return {
    ranking: Math.max(0, Math.min(100, ranking)),
    decision: Math.max(0, Math.min(100, decision)),
    trust: Math.max(0, Math.min(100, trust)),
  };
}

const queue = new ValidationRequestQueue();
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  deployId: deployId(),
  queries: [],
  summary: {},
};

for (const spec of SUITE) {
  const row = { ...spec, failures: [], scores: {}, topTitles: [], productCount: 0 };
  try {
    const result = await validationSearch(BASE_URL, spec.query, queue);
    row.status = result.status;
    row.success = result.success;
    row.latencyMs = result.latencyMs;
    row.degraded = Boolean(result.degraded);

    if (isInfrastructureFailure(result)) {
      row.infrastructureFailure = true;
      row.infrastructure = result.infrastructure;
      row.failures.push({
        code: "infrastructure",
        severity: "infrastructure",
        detail: infrastructureLabel(result),
      });
      row.pass = null;
      row.skipped = true;
      row.scores = { ranking: null, decision: null, trust: null };
      report.queries.push(row);
      continue;
    }

    const { products, meta } = result;
    row.productCount = products.length;
    row.canonicalCategory = meta?.canonicalQuery?.category ?? null;
    row.marketMode = meta?.canonicalQuery?.marketMode ?? null;
    row.intentPrimary = meta?.canonicalQuery?.intent?.primary ?? null;
    row.topTitles = products.slice(0, 5).map((p) => ({
      title: (p.title ?? "").slice(0, 100),
      price: p.price,
      store: p.store,
      qi: p.qiComposite ?? null,
    }));
    row.failures = classifyFailures(spec, products, meta);
    row.scores = scoreTray(spec, products, row.failures);
    row.pass =
      row.failures.filter((f) => f.severity === "critical" || f.severity === "high").length === 0 &&
      row.productCount >= 2;
  } catch (e) {
    row.error = e instanceof Error ? e.message : "unknown";
    row.pass = false;
    row.infrastructureFailure = true;
    row.scores = { ranking: 0, decision: 0, trust: 0 };
  }
  report.queries.push(row);
}

const rankable = report.queries.filter((q) => !q.infrastructureFailure && q.pass !== null);
const n = report.queries.length;
const passed = rankable.filter((q) => q.pass).length;
const infraSkips = report.queries.filter((q) => q.infrastructureFailure).length;

const avgRanking =
  rankable.reduce((s, q) => s + (q.scores?.ranking ?? 0), 0) / Math.max(1, rankable.length);
const avgDecision =
  rankable.reduce((s, q) => s + (q.scores?.decision ?? 0), 0) / Math.max(1, rankable.length);
const avgTrust = rankable.reduce((s, q) => s + (q.scores?.trust ?? 0), 0) / Math.max(1, rankable.length);

const failureCounts = {};
for (const q of report.queries) {
  for (const f of q.failures ?? []) {
    failureCounts[f.code] = (failureCounts[f.code] ?? 0) + 1;
  }
}

report.summary = {
  total: n,
  rankable: rankable.length,
  passed,
  passRatePct: pct(passed, rankable.length),
  infrastructureSkips: infraSkips,
  avgRanking: Math.round(avgRanking),
  avgDecision: Math.round(avgDecision),
  avgTrust: Math.round(avgTrust),
  failureCounts,
  byBucket: {},
};

for (const bucket of [...new Set(SUITE.map((s) => s.bucket))]) {
  const rows = report.queries.filter((q) => q.bucket === bucket && !q.infrastructureFailure);
  report.summary.byBucket[bucket] = {
    count: rows.length,
    passRatePct: pct(rows.filter((q) => q.pass).length, rows.length),
    avgRanking: Math.round(rows.reduce((s, q) => s + (q.scores?.ranking ?? 0), 0) / Math.max(1, rows.length)),
  };
}

const previous = loadPreviousRun("realworld");
const comparison = compareValidationRuns(report, previous);
report.regression = comparison;

const saved = saveValidationRun(report, "realworld");

try {
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
} catch {
  // ignore write errors
}

console.log(JSON.stringify(report.summary, null, 2));
if (comparison.hasBaseline) {
  console.log("\n--- DEPLOY COMPARISON ---");
  console.log(JSON.stringify(comparison.summary, null, 2));
  if (comparison.regressions.length) {
    console.log("\nRegressions:");
    for (const r of comparison.regressions.slice(0, 12)) {
      console.log(`  · [${r.severity}] ${r.query}: ${r.kind} — ${r.detail}`);
    }
  }
}

console.log("\n--- FAILURES BY QUERY ---");
for (const q of report.queries.filter((q) => q.infrastructureFailure || !q.pass || (q.failures?.length ?? 0) > 0)) {
  const tag = q.infrastructureFailure ? "INFRA" : q.pass ? "WARN" : "FAIL";
  console.log(`\n[${tag}] ${q.query}`);
  console.log(`  products=${q.productCount} cat=${q.canonicalCategory} scores=${JSON.stringify(q.scores)}`);
  for (const f of q.failures ?? []) console.log(`  · ${f.code} (${f.severity}): ${f.detail ?? ""}`);
  for (const t of q.topTitles?.slice(0, 3) ?? []) console.log(`  → ${t.title} | €${t.price} | ${t.store}`);
}

console.log(`\nReport: ${OUT_JSON}`);
console.log(`History: ${saved.file}`);

process.exitCode = infraSkips > 0 || (rankable.length && passed < rankable.length * 0.85) ? 1 : 0;
