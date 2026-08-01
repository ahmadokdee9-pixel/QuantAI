#!/usr/bin/env node
/**
 * Shadow P0 — canonical response cache equivalence + isolation + latency proof.
 * Does not deploy. Does not require production enablement (tests the module + optional live).
 *
 * Usage:
 *   npx --yes tsx scripts/test-shadow-p0-canonical-cache.mjs
 * Optional live (local server with flag ON):
 *   SEARCH_BASE_URL=http://127.0.0.1:3000 npx --yes tsx scripts/test-shadow-p0-canonical-cache.mjs
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
  VOLATILE_EQUIVALENCE_PATHS,
} from "../lib/search/canonicalResponseCache.ts";

const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "beta-launch");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

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

function makeCanonicalBody(seed) {
  return {
    success: true,
    data: {
      products: [
        {
          link: `https://example.test/${seed}/a`,
          title: `${seed} Product A`,
          store: "StoreAlpha",
          price: 100 + seed.length,
          qiBuyingDecision: { decisionLabel: "BUY", confidence: 80, action: "BUY" },
          qiVerdict: "Strong Buy",
          qiComposite: 0.91,
        },
        {
          link: `https://example.test/${seed}/b`,
          title: `${seed} Product B`,
          store: "StoreBeta",
          price: 120 + seed.length,
          qiBuyingDecision: { decisionLabel: "COMPARE", confidence: 55, action: "COMPARE" },
          qiVerdict: "Compare",
          qiComposite: 0.72,
        },
      ],
      dealClusters: [],
      searchIntelligence: { version: 1, seed },
      meta: {
        intelligenceVersion: 13,
        decisionBrief: {
          recommendation: { label: "Best Overall", title: `${seed} Product A`, store: "StoreAlpha" },
          confidence: 90,
          discountNote: seed.includes("tv") ? "Discount signal (authenticity 80/100)" : null,
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

const results = {
  generatedAt: new Date().toISOString(),
  flagDefaultOff: isCanonicalResponseCacheEnabled({ ...process.env, QUANTAI_SEARCH_CANONICAL_RESPONSE_CACHE: undefined }) === false
    || isCanonicalResponseCacheEnabled({}),
  ttlSeconds: canonicalResponseCacheTtlSeconds(),
  volatileAllowlist: [...VOLATILE_EQUIVALENCE_PATHS],
  isolation: [],
  equivalence: [],
  latency: {},
  live: null,
  failures: [],
};

function recordIsolation(name, pass, detail) {
  results.isolation.push({ name, pass, detail });
  if (!pass) results.failures.push(`isolation:${name}:${detail}`);
}

function recordEq(name, pass, detail, diffs = []) {
  results.equivalence.push({ name, pass, detail, diffCount: diffs.length, sampleDiffs: diffs.slice(0, 5) });
  if (!pass) results.failures.push(`equivalence:${name}:${detail}`);
}

console.log("=== Shadow P0 canonical cache tests ===");
console.log("flag enabled (current env):", isCanonicalResponseCacheEnabled());
console.log("TTL seconds:", canonicalResponseCacheTtlSeconds());

// Flag default OFF
{
  const off = isCanonicalResponseCacheEnabled({});
  assert(off === false, "flag must default OFF");
  recordIsolation("flag_default_off", true, "OFF when unset");
}

/* ASYNC_WRAP */
(async () => {
clearCanonicalResponseCache();

const corpus = [
  { q: "MacBook Pro 14", category: "laptop" },
  { q: "iPhone 15 Pro 256GB", category: "phone" },
  { q: "OLED TV 55 inch", category: "tv" },
  { q: "corner sofa", category: "furniture" },
  { q: "Sony WH-1000XM5", category: "audio" },
  { q: "Adidas Samba", category: "footwear" },
  { q: "rare-sparse-widget-xyz", category: "sparse" },
];

let semanticMismatches = 0;
let comparisons = 0;

for (const item of corpus) {
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: item.q }));
  const A = makeCanonicalBody(item.q);
  // A vs simulated MISS B: MISS path produces A then stores
  const B = JSON.parse(JSON.stringify(A));
  await setCanonicalCachedSearchBody(key, B);
  const Craw = await getCanonicalCachedSearchBody(key);
  assert(Craw, "expected HIT");
  const C = stampCanonicalCacheHitDiagnostics(Craw, { lookupMs: 1, ageMs: 2, keyDigest: key });

  const ab = diffCanonicalIntelligence(A, B);
  const bc = diffCanonicalIntelligence(B, C);
  const ac = diffCanonicalIntelligence(A, C);
  comparisons += 3;
  const pass = ab.length === 0 && bc.length === 0 && ac.length === 0;
  if (!pass) semanticMismatches += ab.length + bc.length + ac.length;
  recordEq(
    `corpus_${item.category}`,
    pass,
    pass ? "A≡B≡C" : "mismatch",
    [...ab, ...bc, ...ac]
  );
}

// Isolation: different queries
{
  clearCanonicalResponseCache();
  const keyA = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "MacBook Pro 14" }));
  const keyB = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "iPhone 15 Pro 256GB" }));
  await setCanonicalCachedSearchBody(keyA, makeCanonicalBody("mac"));
  const leak = await getCanonicalCachedSearchBody(keyB);
  recordIsolation("query_isolation", leak == null && keyA !== keyB, leak ? "LEAK" : "ok");
}

// Guest vs auth
{
  clearCanonicalResponseCache();
  const guestKey = buildCanonicalResponseCacheKey(baseKeyInput({ authScope: "guest" }));
  const authKey = buildCanonicalResponseCacheKey(
    baseKeyInput({ authScope: "auth", userFingerprint: hashOpaqueContext("user_abc"), tier: "pro" })
  );
  await setCanonicalCachedSearchBody(guestKey, makeCanonicalBody("guest"));
  recordIsolation(
    "guest_auth_isolation",
    guestKey !== authKey && (await getCanonicalCachedSearchBody(authKey)) == null,
    guestKey === authKey ? "key collision" : "ok"
  );
}

// Market / currency
{
  const nl = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "NL", marketCurrency: "EUR" }));
  const us = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "US", marketCurrency: "USD" }));
  recordIsolation("market_isolation", nl !== us, nl === us ? "collision" : "ok");
}

// Session fingerprint
{
  const s1 = buildCanonicalResponseCacheKey(baseKeyInput({ sessionFingerprint: hashOpaqueContext({ a: 1 }) }));
  const s2 = buildCanonicalResponseCacheKey(baseKeyInput({ sessionFingerprint: hashOpaqueContext({ a: 2 }) }));
  recordIsolation("session_isolation", s1 !== s2, s1 === s2 ? "collision" : "ok");
}

// Sort mode
{
  const v = buildCanonicalResponseCacheKey(baseKeyInput({ sortMode: "value" }));
  const p = buildCanonicalResponseCacheKey(baseKeyInput({ sortMode: "price" }));
  recordIsolation("sort_isolation", v !== p, v === p ? "collision" : "ok");
}

// Expired → miss
{
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "expire-me" }));
  await setCanonicalCachedSearchBody(key, makeCanonicalBody("expire"), 60);
  expireCanonicalResponseCacheKey(key);
  recordIsolation("ttl_expiry_miss", (await getCanonicalCachedSearchBody(key)) == null, "ok");
}

// Malformed entry fails safe
{
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "malformed" }));
  // force bad entry via set then corrupt by setting null-like through public API rejection
  const ok = await setCanonicalCachedSearchBody(key, null);
  recordIsolation("malformed_set_rejected", ok === false && (await getCanonicalCachedSearchBody(key)) == null, "ok");
}

// Cache unavailable / get after clear
{
  clearCanonicalResponseCache();
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "gone" }));
  recordIsolation("unavailable_miss", (await getCanonicalCachedSearchBody(key)) == null, "ok");
}

// Latency: synthetic large body MISS (set) vs HIT (get)
{
  clearCanonicalResponseCache();
  const big = makeCanonicalBody("latency");
  big.data.products = Array.from({ length: 24 }, (_, i) => ({
    ...big.data.products[0],
    link: `https://example.test/lat/${i}`,
    title: `Latency product ${i}`,
    qiComposite: 0.5 + i / 100,
  }));
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "latency bench" }));
  const missMs = [];
  const hitMs = [];
  const lookupMs = [];
  for (let i = 0; i < 40; i++) {
    clearCanonicalResponseCache();
    const t0 = Date.now();
    // MISS path cost of cache write after "compute" — compute excluded; measure store only after clone of completed body
    await setCanonicalCachedSearchBody(key, big);
    missMs.push(Date.now() - t0);
    const t1 = Date.now();
    const hit = await getCanonicalCachedSearchBody(key);
    const dt = Date.now() - t1;
    hitMs.push(dt);
    lookupMs.push(dt);
    assert(hit && canonicalIntelligenceEqual(big, hit), "hit equality");
  }
  results.latency = {
    note: "Module-level store/get over ~24-product canonical body (compute excluded). Live wall-clock optional via SEARCH_BASE_URL.",
    missStore: stats(missMs),
    hitGet: stats(hitMs),
    cacheLookup: stats(lookupMs),
  };
  console.log("latency missStore", results.latency.missStore);
  console.log("latency hitGet", results.latency.hitGet);
}

// Optional live probe
const base = (process.env.SEARCH_BASE_URL || "").replace(/\/$/, "");
if (base) {
  console.log("=== Live probe", base, "===");
  const live = {
    base,
    samples: [],
    missWall: [],
    hitWall: [],
    eqPass: true,
    errors: [],
  };
  async function probe(q) {
    const t0 = Date.now();
    const res = await fetch(`${base}/api/search?q=${encodeURIComponent(q)}`);
    const wallMs = Date.now() - t0;
    const json = await res.json();
    const cacheHeader = res.headers.get("x-quantai-canonical-cache");
    return { wallMs, json, cacheHeader, status: res.status };
  }
  try {
    for (const item of corpus.slice(0, 6)) {
      const miss = await probe(item.q);
      live.missWall.push(miss.wallMs);
      await new Promise((r) => setTimeout(r, 500));
      const hit = await probe(item.q);
      live.hitWall.push(hit.wallMs);
      const equal = canonicalIntelligenceEqual(miss.json, hit.json);
      if (!equal) {
        live.eqPass = false;
        live.errors.push({
          q: item.q,
          diffs: diffCanonicalIntelligence(miss.json, hit.json).slice(0, 8),
          missHeader: miss.cacheHeader,
          hitHeader: hit.cacheHeader,
        });
      }
      live.samples.push({
        q: item.q,
        missMs: miss.wallMs,
        hitMs: hit.wallMs,
        missHeader: miss.cacheHeader,
        hitHeader: hit.cacheHeader,
        products: miss.json?.data?.products?.length ?? 0,
        equal,
      });
      await new Promise((r) => setTimeout(r, 800));
    }
    live.missStats = stats(live.missWall);
    live.hitStats = stats(live.hitWall);
  } catch (e) {
    live.errors.push(String(e?.message || e));
    live.eqPass = false;
  }
  results.live = live;
  console.log("live miss", live.missStats, "hit", live.hitStats, "eq", live.eqPass);
}

const isolationPass = results.isolation.every((x) => x.pass);
const equivalencePass = results.equivalence.every((x) => x.pass) && semanticMismatches === 0;

results.summary = {
  corpusSize: corpus.length,
  totalEquivalenceComparisons: comparisons,
  semanticMismatches,
  isolationPass,
  equivalencePass,
  flagDefaultOff: true,
};

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, "shadow-p0-equivalence.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log("WROTE", outPath);
console.log("SUMMARY", results.summary);

if (!isolationPass || !equivalencePass) {
  console.error("SHADOW_P0_FAIL");
  process.exit(1);
}
console.log("SHADOW_P0_MODULE_PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
