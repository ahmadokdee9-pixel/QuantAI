#!/usr/bin/env node
/**
 * Step 10 — Production-grade shadow P0 evidence expansion.
 * Flag remains DEFAULT OFF in code. Live server may enable flag via env only.
 *
 *   npx --yes tsx scripts/shadow-p0-production-evidence.mjs
 *   SEARCH_BASE_URL=http://127.0.0.1:3012 npx --yes tsx scripts/shadow-p0-production-evidence.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildCanonicalResponseCacheKey,
  buildFeatureFlagDigest,
  canonicalIntelligenceEqual,
  clearCanonicalResponseCache,
  canonicalResponseCacheTtlSeconds,
  diffCanonicalIntelligence,
  expireCanonicalResponseCacheKey,
  getCanonicalCachedSearchBody,
  hashOpaqueContext,
  isCanonicalResponseCacheEnabled,
  setCanonicalCachedSearchBody,
  stampCanonicalCacheHitDiagnostics,
  stripVolatileForEquivalence,
} from "../lib/search/canonicalResponseCache.ts";

const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "beta-launch");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}
function stats(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return {
    n: s.length,
    p50: percentile(s, 50),
    p95: percentile(s, 95),
    max: s.length ? s[s.length - 1] : null,
    min: s.length ? s[0] : null,
    average: s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null,
  };
}

/** Buyer-visible intelligence slice for live comparisons (excludes operational transport). */
function intelligenceSlice(body) {
  const data = body?.data ?? {};
  const products = Array.isArray(data.products) ? data.products : [];
  const brief = data.meta?.decisionBrief ?? null;
  return stripVolatileForEquivalence({
    success: body?.success === true,
    order: products.map((p) => p.link),
    products: products.map((p) => ({
      link: p.link,
      title: p.title,
      store: p.store ?? p.merchant,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      qiBuyingDecision: p.qiBuyingDecision ?? null,
      qiVerdict: p.qiVerdict ?? null,
      qiComposite: p.qiComposite ?? null,
    })),
    merchants: [...new Set(products.map((p) => String(p.store || p.merchant || "").trim()).filter(Boolean))],
    decisionBrief: brief
      ? {
          label: brief.recommendation?.label ?? brief.recommendation ?? null,
          title: brief.recommendation?.title ?? null,
          store: brief.recommendation?.store ?? null,
          confidence: brief.confidence ?? null,
          discountNote: brief.discountNote ?? null,
        }
      : null,
    intelligenceVersion: data.meta?.intelligenceVersion ?? null,
  });
}

function sliceEqual(a, b) {
  return JSON.stringify(intelligenceSlice(a)) === JSON.stringify(intelligenceSlice(b));
}

function makeCanonicalBody(seed, opts = {}) {
  const dense = opts.dense === true;
  const empty = opts.empty === true;
  const products = empty
    ? []
    : dense
      ? Array.from({ length: 18 }, (_, i) => ({
          link: `https://example.test/${encodeURIComponent(seed)}/${i}`,
          title: `${seed} SKU ${i}`,
          store: `Merchant-${i % 7}`,
          price: 50 + i * 3,
          oldPrice: i % 4 === 0 ? 80 + i * 3 : null,
          qiBuyingDecision: {
            decisionLabel: i % 3 === 0 ? "BUY" : i % 3 === 1 ? "COMPARE" : "BEST VALUE",
            confidence: 40 + (i % 50),
            action: i % 3 === 0 ? "BUY" : "COMPARE",
          },
          qiVerdict: i % 3 === 0 ? "Strong Buy" : "Compare",
          qiComposite: 0.4 + i / 40,
        }))
      : [
          {
            link: `https://example.test/${encodeURIComponent(seed)}/a`,
            title: `${seed} Product A`,
            store: "StoreAlpha",
            price: 100 + seed.length,
            oldPrice: opts.discount ? 150 : null,
            qiBuyingDecision: { decisionLabel: "BUY", confidence: 80, action: "BUY" },
            qiVerdict: "Strong Buy",
            qiComposite: 0.91,
          },
          {
            link: `https://example.test/${encodeURIComponent(seed)}/b`,
            title: `${seed} Product B`,
            store: "StoreBeta",
            price: 120 + seed.length,
            oldPrice: null,
            qiBuyingDecision: { decisionLabel: "COMPARE", confidence: 55, action: "COMPARE" },
            qiVerdict: "Compare",
            qiComposite: 0.72,
          },
        ];
  return {
    success: true,
    data: {
      products,
      dealClusters: [],
      searchIntelligence: { version: 1, seed },
      meta: {
        intelligenceVersion: 13,
        decisionBrief: {
          recommendation: products[0]
            ? { label: "Best Overall", title: products[0].title, store: products[0].store }
            : null,
          confidence: products.length ? 90 : 0,
          discountNote: opts.discount ? "Discount signal (authenticity 80/100)" : null,
        },
        canonicalQuery: { normalizedQuery: seed, market: { country: "NL", currency: "EUR" } },
        searchLatencyMs: 7777,
        latencyBudget: { totalMs: 7777 },
        reliability: { telemetry: { counters: { requests: 1 } } },
      },
    },
  };
}

function baseKeyInput(over = {}) {
  return {
    normalizedQuery: "oled tv 55 inch",
    authScope: "guest",
    userFingerprint: null,
    tier: "free",
    marketCountry: "NL",
    marketCurrency: "EUR",
    language: "english",
    sortMode: "value",
    sessionFingerprint: null,
    featureFlagDigest: buildFeatureFlagDigest(process.env),
    intelligenceVersion: 13,
    pipelineCacheTag: "quantai-search-pipeline-v56-unified-live-soak-v1",
    ...over,
  };
}

const CORPUS = [
  { q: "MacBook Pro 14", category: "laptop", dense: true, discount: true },
  { q: "MacBook Air M2", category: "laptop-variant", dense: true },
  { q: "gaming laptop under 1500", category: "laptop-budget", dense: true },
  { q: "iPhone 15 Pro 256GB", category: "phone", dense: true, discount: true },
  { q: "iPhone 15", category: "phone-variant", dense: true },
  { q: "Samsung Galaxy S24", category: "phone-android", dense: true },
  { q: "OLED TV 55 inch", category: "tv", dense: true, discount: true },
  { q: "LG C4 OLED 65", category: "tv-variant", dense: true },
  { q: "4K smart TV", category: "tv-broad", dense: true },
  { q: "corner sofa", category: "furniture", dense: true },
  { q: "IKEA Kivik sofa", category: "furniture-brand", dense: true },
  { q: "office desk chair", category: "furniture-office", dense: true },
  { q: "Sony WH-1000XM5", category: "audio", dense: false },
  { q: "AirPods Pro 2", category: "audio-earbuds", dense: true, discount: true },
  { q: "Bose QuietComfort", category: "audio-variant", dense: true },
  { q: "Adidas Samba", category: "footwear", dense: true, discount: true },
  { q: "Nike Air Force 1", category: "footwear-nike", dense: true },
  { q: "Dyson V15", category: "appliance", dense: true },
  { q: "Nespresso Vertuo", category: "appliance-coffee", dense: true },
  { q: "Kindle Paperwhite", category: "ebook", dense: true },
  { q: "LEGO Star Wars set", category: "toys", dense: true },
  { q: "yoga mat non slip", category: "sports", dense: true },
  { q: "rare-sparse-widget-xyz-999", category: "sparse", dense: false },
  { q: "zzzz-empty-unlikely-sku-000", category: "empty", empty: true },
  { q: "MacBook Pro 14", category: "repeat-identical", dense: true, discount: true },
];

const report = {
  generatedAt: new Date().toISOString(),
  step: 10,
  flagDefaultOff: !isCanonicalResponseCacheEnabled({}),
  ttlSeconds: canonicalResponseCacheTtlSeconds(),
  module: {
    isolation: [],
    equivalence: [],
    concurrent: [],
    failures: [],
  },
  live: null,
  gatesNote: "See Step 10 shell validation log",
};

function recIso(name, pass, detail) {
  report.module.isolation.push({ name, pass, detail: detail ?? "" });
  if (!pass) report.module.failures.push(`iso:${name}`);
}
function recEq(name, pass, detail, diffs = []) {
  report.module.equivalence.push({
    name,
    pass,
    detail: detail ?? "",
    diffCount: diffs.length,
    sampleDiffs: diffs.slice(0, 3),
  });
  if (!pass) report.module.failures.push(`eq:${name}`);
}

console.log("=== Step 10 module evidence ===");
console.log("flag default off:", report.flagDefaultOff, "ttl:", report.ttlSeconds);

// --- Expanded equivalence corpus ---
let comparisons = 0;
let semanticMismatches = 0;
const dim = {
  productIdentity: true,
  productOrdering: true,
  scores: true,
  merchantDiversity: true,
  buyingDecision: true,
  buyerVisible: true,
};

for (const item of CORPUS) {
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: item.q }));
  const A = makeCanonicalBody(item.q, item);
  const B = JSON.parse(JSON.stringify(A));
  await setCanonicalCachedSearchBody(key, B);
  const Craw = await getCanonicalCachedSearchBody(key);
  const C = stampCanonicalCacheHitDiagnostics(Craw, { lookupMs: 1, ageMs: 1, keyDigest: key });
  const ab = diffCanonicalIntelligence(A, B);
  const bc = diffCanonicalIntelligence(B, C);
  const ac = diffCanonicalIntelligence(A, C);
  comparisons += 3;
  const pass = ab.length + bc.length + ac.length === 0;
  if (!pass) {
    semanticMismatches += ab.length + bc.length + ac.length;
    dim.buyerVisible = false;
  }
  // dimension checks via slice
  const sa = intelligenceSlice(A);
  const sc = intelligenceSlice(C);
  if (JSON.stringify(sa.order) !== JSON.stringify(sc.order)) dim.productOrdering = false;
  if (JSON.stringify(sa.products.map((p) => p.link)) !== JSON.stringify(sc.products.map((p) => p.link))) {
    dim.productIdentity = false;
  }
  if (JSON.stringify(sa.products.map((p) => p.qiComposite)) !== JSON.stringify(sc.products.map((p) => p.qiComposite))) {
    dim.scores = false;
  }
  if (JSON.stringify(sa.merchants) !== JSON.stringify(sc.merchants)) dim.merchantDiversity = false;
  if (
    JSON.stringify(sa.products.map((p) => p.qiBuyingDecision)) !==
    JSON.stringify(sc.products.map((p) => p.qiBuyingDecision))
  ) {
    dim.buyingDecision = false;
  }
  recEq(`corpus_${item.category}_${item.q.slice(0, 24)}`, pass, pass ? "A≡B≡C" : "fail", [
    ...ab,
    ...bc,
    ...ac,
  ]);
}

// --- Isolation / safety ---
clearCanonicalResponseCache();
{
  const a = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "MacBook Pro 14" }));
  const b = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "iPhone 15 Pro 256GB" }));
  await setCanonicalCachedSearchBody(a, makeCanonicalBody("mac"));
  recIso("query_isolation", (await getCanonicalCachedSearchBody(b)) == null && a !== b);
}
{
  const g = buildCanonicalResponseCacheKey(baseKeyInput({ authScope: "guest" }));
  const u1 = buildCanonicalResponseCacheKey(
    baseKeyInput({ authScope: "auth", userFingerprint: hashOpaqueContext("user_1"), tier: "pro" })
  );
  const u2 = buildCanonicalResponseCacheKey(
    baseKeyInput({ authScope: "auth", userFingerprint: hashOpaqueContext("user_2"), tier: "pro" })
  );
  await setCanonicalCachedSearchBody(g, makeCanonicalBody("guest"));
  await setCanonicalCachedSearchBody(u1, makeCanonicalBody("auth1"));
  recIso("guest_auth_isolation", g !== u1 && (await getCanonicalCachedSearchBody(u2)) == null);
  recIso("auth_user_isolation", u1 !== u2 && (await getCanonicalCachedSearchBody(u2)) == null);
  // cross-user: guest must not get auth body
  const guestHit = await getCanonicalCachedSearchBody(g);
  recIso(
    "no_cross_user_leakage",
    Boolean(guestHit?.data?.products?.[0]?.title?.toString().startsWith("guest"))
  );
}
{
  const nl = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "NL", marketCurrency: "EUR" }));
  const us = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "US", marketCurrency: "USD" }));
  const de = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "DE", marketCurrency: "EUR" }));
  recIso("market_currency_isolation", nl !== us && nl !== de && us !== de);
}
{
  const s1 = buildCanonicalResponseCacheKey(baseKeyInput({ sessionFingerprint: hashOpaqueContext({ persona: "a" }) }));
  const s2 = buildCanonicalResponseCacheKey(baseKeyInput({ sessionFingerprint: hashOpaqueContext({ persona: "b" }) }));
  recIso("persona_session_isolation", s1 !== s2);
}
{
  const f1 = buildCanonicalResponseCacheKey(
    baseKeyInput({ featureFlagDigest: hashOpaqueContext("flags-a") })
  );
  const f2 = buildCanonicalResponseCacheKey(
    baseKeyInput({ featureFlagDigest: hashOpaqueContext("flags-b") })
  );
  recIso("feature_flag_isolation", f1 !== f2);
}
{
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "ttl-test" }));
  await setCanonicalCachedSearchBody(key, makeCanonicalBody("ttl"), 60);
  expireCanonicalResponseCacheKey(key);
  recIso("ttl_expiry_fallback_miss", (await getCanonicalCachedSearchBody(key)) == null);
}
{
  recIso("malformed_set_fails_safe", (await setCanonicalCachedSearchBody("crc:bad", null)) === false);
  recIso("malformed_undefined_fails_safe", (await setCanonicalCachedSearchBody("crc:bad2", undefined)) === false);
}
{
  clearCanonicalResponseCache();
  recIso(
    "cache_unavailable_miss",
    await getCanonicalCachedSearchBody(buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "none" }))) ==
      null
  );
}
{
  // stale identity: different pipeline tag must not collide
  const k1 = buildCanonicalResponseCacheKey(baseKeyInput({ pipelineCacheTag: "pipe-v1" }));
  const k2 = buildCanonicalResponseCacheKey(baseKeyInput({ pipelineCacheTag: "pipe-v2" }));
  await setCanonicalCachedSearchBody(k1, makeCanonicalBody("v1"));
  recIso("stale_pipeline_tag_isolation", k1 !== k2 && (await getCanonicalCachedSearchBody(k2)) == null);
}

// Concurrent identical + different
{
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "concurrent-same" }));
  const body = makeCanonicalBody("concurrent-same", { dense: true });
  await setCanonicalCachedSearchBody(key, body);
  const reads = await Promise.all(
    Array.from({ length: 20 }, async () => await getCanonicalCachedSearchBody(key))
  );
  const allOk = reads.every((r) => r && canonicalIntelligenceEqual(body, r));
  report.module.concurrent.push({ name: "concurrent_identical_reads", pass: allOk, n: reads.length });
  if (!allOk) report.module.failures.push("concurrent_identical");
}
{
  clearCanonicalResponseCache();
  const keys = ["c-a", "c-b", "c-c", "c-d"].map((q) =>
    buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: q }))
  );
  for (let i = 0; i < keys.length; i++) {
    await setCanonicalCachedSearchBody(keys[i], makeCanonicalBody(`c-${i}`));
  }
  const mixed = await Promise.all(keys.map((k) => getCanonicalCachedSearchBody(k)));
  const pass =
    mixed.every(Boolean) &&
    new Set(mixed.map((m) => intelligenceSlice(m).products[0]?.title)).size === keys.length;
  report.module.concurrent.push({ name: "concurrent_different_keys", pass, n: keys.length });
  if (!pass) report.module.failures.push("concurrent_different");
  recIso("concurrent_different_no_leak", pass);
}

// Module latency (store/get)
{
  const big = makeCanonicalBody("lat", { dense: true });
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "lat-bench" }));
  const missStore = [];
  const hitGet = [];
  for (let i = 0; i < 80; i++) {
    clearCanonicalResponseCache();
    const t0 = Date.now();
    await setCanonicalCachedSearchBody(key, big);
    missStore.push(Date.now() - t0);
    const t1 = Date.now();
    const hit = await getCanonicalCachedSearchBody(key);
    hitGet.push(Date.now() - t1);
    if (!hit || !canonicalIntelligenceEqual(big, hit)) report.module.failures.push("lat-eq");
  }
  report.module.latency = { missStore: stats(missStore), hitGet: stats(hitGet) };
}

report.module.summary = {
  corpusSize: CORPUS.length,
  comparisons,
  semanticMismatches,
  dimensions: dim,
  isolationPass: report.module.isolation.every((x) => x.pass),
  equivalencePass: report.module.equivalence.every((x) => x.pass) && semanticMismatches === 0,
  concurrentPass: report.module.concurrent.every((x) => x.pass),
  failures: report.module.failures,
};

console.log("MODULE SUMMARY", report.module.summary);

// --- Live evidence ---
const base = (process.env.SEARCH_BASE_URL || "").replace(/\/$/, "");
if (base) {
  console.log("=== Live evidence", base, "===");
  const liveCorpus = CORPUS.filter((c) => c.category !== "repeat-identical").slice(0, 16);
  const missWall = [];
  const hitWall = [];
  const hitWallTrue = [];
  const rows = [];
  let trueHitEq = 0;
  let trueHitN = 0;
  let sliceFail = 0;
  let headerMissOnly = 0;

  async function probe(q) {
    const t0 = Date.now();
    const res = await fetch(`${base}/api/search?q=${encodeURIComponent(q)}`);
    const wallMs = Date.now() - t0;
    let json = {};
    try {
      json = await res.json();
    } catch {
      json = { success: false };
    }
    return {
      wallMs,
      json,
      status: res.status,
      header: res.headers.get("x-quantai-canonical-cache"),
      n: json?.data?.products?.length ?? 0,
    };
  }

  // Warm burst carefully: miss then 2 hits per query
  for (const item of liveCorpus) {
    await sleep(Number(process.env.SHADOW_LIVE_GAP_MS || 4500));
    const miss = await probe(item.q);
    missWall.push(miss.wallMs);
    await sleep(600);
    const hit1 = await probe(item.q);
    await sleep(250);
    const hit2 = await probe(item.q);

    const isTrueHit = hit1.header === "HIT";
    if (isTrueHit) {
      trueHitN += 1;
      hitWallTrue.push(hit1.wallMs, hit2.wallMs);
      const eq = sliceEqual(miss.json, hit1.json) && sliceEqual(miss.json, hit2.json);
      if (eq) trueHitEq += 1;
      else sliceFail += 1;
    } else {
      headerMissOnly += 1;
      hitWall.push(hit1.wallMs);
    }

    rows.push({
      q: item.q,
      category: item.category,
      missMs: miss.wallMs,
      hit1Ms: hit1.wallMs,
      hit2Ms: hit2.wallMs,
      missHeader: miss.header,
      hit1Header: hit1.header,
      hit2Header: hit2.header,
      missN: miss.n,
      hitN: hit1.n,
      trueHit: isTrueHit,
      sliceEqual: isTrueHit ? sliceEqual(miss.json, hit1.json) : null,
      fullEqual: isTrueHit ? canonicalIntelligenceEqual(miss.json, hit1.json) : null,
    });
    console.log(
      JSON.stringify({
        q: item.q,
        miss: miss.wallMs,
        hit: hit1.wallMs,
        h: hit1.header,
        n: miss.n,
        eq: rows.at(-1).sliceEqual,
      })
    );
  }

  // Concurrent different queries (after corpus) — fire 4 different HITs if warmed
  let concurrentLive = { attempted: false };
  try {
    const warmed = rows.filter((r) => r.trueHit).slice(0, 4).map((r) => r.q);
    if (warmed.length >= 3) {
      concurrentLive.attempted = true;
      const t0 = Date.now();
      const outs = await Promise.all(warmed.map((q) => probe(q)));
      concurrentLive = {
        attempted: true,
        wallMs: Date.now() - t0,
        allHit: outs.every((o) => o.header === "HIT"),
        headers: outs.map((o) => o.header),
        latencies: outs.map((o) => o.wallMs),
      };
    }
  } catch (e) {
    concurrentLive = { attempted: true, error: String(e?.message || e) };
  }

  report.live = {
    base,
    corpusSize: liveCorpus.length,
    rows,
    missStats: stats(missWall),
    hitStatsTrueOnly: stats(hitWallTrue),
    hitStatsNonHitSeconds: stats(hitWall),
    trueHitCount: trueHitN,
    trueHitEqualCount: trueHitEq,
    sliceFailOnTrueHit: sliceFail,
    nonHitSecondRequests: headerMissOnly,
    concurrentLive,
    outliers: {
      missMaxRow: rows.reduce((a, b) => (b.missMs > (a?.missMs ?? 0) ? b : a), null),
      slowNonHit: rows.filter((r) => !r.trueHit && r.hit1Ms > 3000),
    },
  };
  console.log(
    "LIVE SUMMARY",
    JSON.stringify(
      {
        miss: report.live.missStats,
        hitTrue: report.live.hitStatsTrueOnly,
        trueHitCount: trueHitN,
        trueHitEqual: trueHitEq,
        concurrentLive,
      },
      null,
      2
    )
  );
}

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, "shadow-p0-production-evidence.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log("WROTE", outPath);

if (!report.module.summary.isolationPass || !report.module.summary.equivalencePass) {
  console.error("STEP10_MODULE_FAIL");
  process.exit(1);
}
console.log("STEP10_MODULE_PASS");
