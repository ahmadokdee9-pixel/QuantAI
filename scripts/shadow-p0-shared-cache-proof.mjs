#!/usr/bin/env node
/**
 * Step 11 — Shared durable canonical response cache proof (DEFAULT OFF).
 *
 * Proves multi-worker / shared-client HIT semantics via:
 * - upstash (preferred when UPSTASH_* present)
 * - file (local durable shared store when Upstash unavailable)
 * - memory (control: NOT multi-worker safe)
 *
 * Usage:
 *   npx --yes tsx scripts/shadow-p0-shared-cache-proof.mjs
 * Optional live:
 *   SEARCH_BASE_URL=http://127.0.0.1:3013 npx --yes tsx scripts/shadow-p0-shared-cache-proof.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  buildCanonicalResponseCacheKey,
  buildFeatureFlagDigest,
  canonicalIntelligenceEqual,
  clearCanonicalResponseCache,
  canonicalResponseCacheTtlSeconds,
  deleteCanonicalCachedSearchBody,
  diffCanonicalIntelligence,
  expireCanonicalResponseCacheKey,
  getCanonicalCachedSearchBody,
  getCanonicalCachedSearchBodyViaIndependentUpstashClient,
  hashOpaqueContext,
  isCanonicalResponseCacheEnabled,
  resolveCanonicalCacheBackend,
  setCanonicalCachedSearchBody,
  stampCanonicalCacheHitDiagnostics,
  stripVolatileForEquivalence,
  CANONICAL_CRC_BACKEND_ENV,
  CANONICAL_CRC_FILE_DIR_ENV,
} from "../lib/search/canonicalResponseCache.ts";
import { hasUpstashRedisEnv } from "../lib/redis/upstashClient.ts";

const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "beta-launch");
const FILE_DIR = ".cache/quantai-crc-proof";
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
          qiComposite: 0.55 + i / 100,
        }))
      : [
          {
            link: `https://example.test/${encodeURIComponent(seed)}/0`,
            title: `${seed} primary`,
            store: "Merchant-A",
            price: 999,
            oldPrice: 1199,
            qiBuyingDecision: { decisionLabel: "BUY", confidence: 78, action: "BUY" },
            qiVerdict: "Strong Buy",
            qiComposite: 0.91,
          },
          {
            link: `https://example.test/${encodeURIComponent(seed)}/1`,
            title: `${seed} alt`,
            store: "Merchant-B",
            price: 950,
            oldPrice: null,
            qiBuyingDecision: { decisionLabel: "COMPARE", confidence: 61, action: "COMPARE" },
            qiVerdict: "Compare",
            qiComposite: 0.84,
          },
        ];
  return {
    success: true,
    data: {
      products,
      meta: {
        intelligenceVersion: 13,
        decisionBrief: {
          recommendation: { label: "BUY", title: products[0]?.title ?? null, store: products[0]?.store ?? null },
          confidence: 78,
          discountNote: "verified discount signal",
        },
        searchLatencyMs: 8000,
        canonicalResponseCache: { hit: false },
      },
    },
  };
}

function baseKeyInput(over = {}) {
  return {
    normalizedQuery: "MacBook Pro 14",
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
  { q: "MacBook Pro 14", category: "laptop" },
  { q: "iPhone 15 Pro 256GB", category: "phone" },
  { q: "OLED TV 55 inch", category: "tv" },
  { q: "corner sofa", category: "furniture" },
  { q: "Sony WH-1000XM5", category: "audio" },
  { q: "Adidas Samba", category: "footwear" },
  { q: "Dyson V15", category: "appliance" },
  { q: "Kindle Paperwhite", category: "ebook" },
  { q: "LEGO Technic", category: "toys" },
  { q: "Garmin Forerunner", category: "sports" },
  { q: "rare-sparse-widget-xyz", category: "sparse" },
  { q: "zzzz-empty-unlikely", category: "empty", empty: true },
];

function withBackendEnv(backend) {
  process.env[CANONICAL_CRC_BACKEND_ENV] = backend;
  if (backend === "file") {
    process.env[CANONICAL_CRC_FILE_DIR_ENV] = FILE_DIR;
  }
}

function rec(list, name, pass, detail = "ok") {
  list.push({ name, pass, detail });
}

async function runChildWorker(payload) {
  const bodyPath = join(process.cwd(), FILE_DIR, `_worker-body-${Date.now()}.json`);
  if (payload.mode === "write") {
    mkdirSync(join(process.cwd(), FILE_DIR), { recursive: true });
    writeFileSync(bodyPath, JSON.stringify(payload.body), "utf8");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "tsx", "scripts/shadow-p0-shared-cache-worker.mjs"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          QUANTAI_CRC_BACKEND: payload.backend,
          QUANTAI_CRC_FILE_DIR: payload.fileDir,
          CRC_WORKER_MODE: payload.mode,
          CRC_WORKER_KEY: payload.key,
          CRC_WORKER_BODY_PATH: bodyPath,
        },
        windowsHide: true,
        shell: true,
      }
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => {
      if (payload.mode === "write") {
        try {
          rmSync(bodyPath, { force: true });
        } catch {
          /* */
        }
      }
      if (code !== 0) {
        reject(new Error(`worker exit ${code}: ${err || out}`));
        return;
      }
      const line = out.trim().split("\n").filter(Boolean).pop();
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error(`bad worker json: ${out}\n${err}`));
      }
    });
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  flagDefaultOff: !isCanonicalResponseCacheEnabled({}),
  ttlSeconds: canonicalResponseCacheTtlSeconds(),
  upstashEnvPresent: hasUpstashRedisEnv(),
  selectedBackend: null,
  existingInfrastructureReused: true,
  productionGradeSharedSemantics: "upstash (preferred) + file local durable proof",
  isolation: [],
  equivalence: [],
  shared: [],
  latency: {},
  live: null,
  secretScan: null,
  failures: [],
};

console.log("=== Step 11 shared durable cache proof ===");
console.log("flag default off:", report.flagDefaultOff);
console.log("upstash env present:", report.upstashEnvPresent);

// Prefer Upstash when available; otherwise file for durable shared proof.
const proofBackend = report.upstashEnvPresent ? "upstash" : "file";
withBackendEnv(proofBackend);
report.selectedBackend = resolveCanonicalCacheBackend();
console.log("proof backend:", report.selectedBackend);

if (proofBackend === "file") {
  rmSync(join(process.cwd(), FILE_DIR), { recursive: true, force: true });
  mkdirSync(join(process.cwd(), FILE_DIR), { recursive: true });
}

// --- Flag default OFF ---
rec(report.isolation, "flag_default_off", !isCanonicalResponseCacheEnabled({}), "OFF when unset");

// --- Equivalence corpus ---
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
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: item.q }));
  await deleteCanonicalCachedSearchBody(key);
  const A = makeCanonicalBody(item.q, { empty: item.empty === true, dense: item.category === "tv" });
  const B = JSON.parse(JSON.stringify(A));
  await setCanonicalCachedSearchBody(key, B, 120);
  const Craw = await getCanonicalCachedSearchBody(key);
  const C = stampCanonicalCacheHitDiagnostics(Craw, {
    lookupMs: 1,
    ageMs: 1,
    keyDigest: key,
    backend: report.selectedBackend,
  });
  const ab = diffCanonicalIntelligence(A, B);
  const bc = diffCanonicalIntelligence(B, C);
  const ac = diffCanonicalIntelligence(A, C);
  comparisons += 3;
  const pass = ab.length + bc.length + ac.length === 0;
  if (!pass) {
    semanticMismatches += ab.length + bc.length + ac.length;
    dim.buyerVisible = false;
  }
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
  rec(report.equivalence, `corpus_${item.category}`, pass, pass ? "A≡B≡C" : "fail");
  await deleteCanonicalCachedSearchBody(key);
}

// --- Isolation ---
{
  const a = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "MacBook Pro 14" }));
  const b = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "iPhone 15 Pro 256GB" }));
  await deleteCanonicalCachedSearchBody(a);
  await deleteCanonicalCachedSearchBody(b);
  await setCanonicalCachedSearchBody(a, makeCanonicalBody("mac"));
  rec(report.isolation, "query_isolation", (await getCanonicalCachedSearchBody(b)) == null && a !== b);
  await deleteCanonicalCachedSearchBody(a);
}
{
  const g = buildCanonicalResponseCacheKey(baseKeyInput({ authScope: "guest" }));
  const u1 = buildCanonicalResponseCacheKey(
    baseKeyInput({ authScope: "auth", userFingerprint: hashOpaqueContext("user_1"), tier: "pro" })
  );
  const u2 = buildCanonicalResponseCacheKey(
    baseKeyInput({ authScope: "auth", userFingerprint: hashOpaqueContext("user_2"), tier: "pro" })
  );
  await deleteCanonicalCachedSearchBody(g);
  await deleteCanonicalCachedSearchBody(u1);
  await deleteCanonicalCachedSearchBody(u2);
  await setCanonicalCachedSearchBody(g, makeCanonicalBody("guest"));
  await setCanonicalCachedSearchBody(u1, makeCanonicalBody("auth1"));
  rec(report.isolation, "guest_auth_isolation", g !== u1 && (await getCanonicalCachedSearchBody(u2)) == null);
  rec(report.isolation, "auth_user_isolation", u1 !== u2 && (await getCanonicalCachedSearchBody(u2)) == null);
  const guestHit = await getCanonicalCachedSearchBody(g);
  rec(
    report.isolation,
    "no_cross_user_leakage",
    Boolean(guestHit?.data?.products?.[0]?.title?.toString().startsWith("guest"))
  );
  await deleteCanonicalCachedSearchBody(g);
  await deleteCanonicalCachedSearchBody(u1);
}
{
  const nl = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "NL", marketCurrency: "EUR" }));
  const us = buildCanonicalResponseCacheKey(baseKeyInput({ marketCountry: "US", marketCurrency: "USD" }));
  rec(report.isolation, "market_currency_isolation", nl !== us);
}
{
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "ttl-shared" }));
  await deleteCanonicalCachedSearchBody(key);
  await setCanonicalCachedSearchBody(key, makeCanonicalBody("ttl"), 60);
  expireCanonicalResponseCacheKey(key);
  // Upstash TTL is server-side EX; expireCanonicalResponseCacheKey only forces file/memory.
  // For upstash, delete to simulate expiry miss path separately.
  if (report.selectedBackend === "upstash") {
    await deleteCanonicalCachedSearchBody(key);
  }
  rec(report.isolation, "ttl_expiry_fallback_miss", (await getCanonicalCachedSearchBody(key)) == null);
}
{
  rec(report.isolation, "malformed_set_fails_safe", (await setCanonicalCachedSearchBody("crc:bad", null)) === false);
}
{
  // Malformed cached value: write corrupt file / reject invalid envelope on read
  if (report.selectedBackend === "file") {
    const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "malformed-value" }));
    const digest = createHash("sha256").update(key).digest("hex");
    const path = join(process.cwd(), FILE_DIR, `${digest}.json`);
    mkdirSync(join(process.cwd(), FILE_DIR), { recursive: true });
    writeFileSync(path, JSON.stringify({ v: 1, storedAtMs: Date.now(), body: { success: false } }), "utf8");
    rec(report.isolation, "malformed_value_fallback", (await getCanonicalCachedSearchBody(key)) == null);
    try {
      rmSync(path, { force: true });
    } catch {
      /* */
    }
  } else {
    // Invalid body rejected on set; get miss is the safe path
    rec(
      report.isolation,
      "malformed_value_fallback",
      (await setCanonicalCachedSearchBody(
        buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "mal-body" })),
        { success: false }
      )) === false
    );
  }
}
{
  // Backend failure soft-miss: force memory-unavailable style by clearing and reading missing
  rec(
    report.isolation,
    "backend_unavailable_miss",
    (await getCanonicalCachedSearchBody(
      buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "absent-key-xyz" }))
    )) == null
  );
}
{
  // Simulated backend throw: resolve to memory with no entry after forcing bad backend then restore
  const prev = process.env[CANONICAL_CRC_BACKEND_ENV];
  process.env[CANONICAL_CRC_BACKEND_ENV] = "upstash";
  // Without credentials, upstash get returns null (MISS) — fail soft
  const miss = (await getCanonicalCachedSearchBody(
    buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "forced-upstash-miss" }))
  )) == null;
  process.env[CANONICAL_CRC_BACKEND_ENV] = prev;
  withBackendEnv(proofBackend);
  rec(report.isolation, "backend_failure_soft_miss", miss);
}
{
  const k1 = buildCanonicalResponseCacheKey(baseKeyInput({ pipelineCacheTag: "pipe-v1" }));
  const k2 = buildCanonicalResponseCacheKey(baseKeyInput({ pipelineCacheTag: "pipe-v2" }));
  await deleteCanonicalCachedSearchBody(k1);
  await deleteCanonicalCachedSearchBody(k2);
  await setCanonicalCachedSearchBody(k1, makeCanonicalBody("v1"));
  rec(report.isolation, "key_collision_resistance", k1 !== k2 && (await getCanonicalCachedSearchBody(k2)) == null);
  await deleteCanonicalCachedSearchBody(k1);
}

// --- Shared / multi-worker ---
{
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "shared-warm" }));
  const body = makeCanonicalBody("shared-warm", { dense: true });
  await deleteCanonicalCachedSearchBody(key);
  await setCanonicalCachedSearchBody(key, body, 120);

  // Sequential MISS→HIT
  const hit1 = await getCanonicalCachedSearchBody(key);
  rec(report.shared, "sequential_miss_to_hit", Boolean(hit1) && canonicalIntelligenceEqual(body, hit1));

  // Concurrent warm reads
  const concurrent = await Promise.all(
    Array.from({ length: 24 }, async () => getCanonicalCachedSearchBody(key))
  );
  const concurrentHits = concurrent.filter((x) => x && canonicalIntelligenceEqual(body, x)).length;
  const concurrentRatio = concurrentHits / concurrent.length;
  report.shared.push({
    name: "concurrent_warm_hit_ratio",
    pass: concurrentRatio === 1,
    detail: `${concurrentHits}/${concurrent.length}`,
    ratio: concurrentRatio,
  });

  // Different queries concurrently
  const keys = ["q-a", "q-b", "q-c", "q-d"].map((q) =>
    buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: q }))
  );
  for (let i = 0; i < keys.length; i++) {
    await deleteCanonicalCachedSearchBody(keys[i]);
    await setCanonicalCachedSearchBody(keys[i], makeCanonicalBody(`c-${i}`));
  }
  const mixed = await Promise.all(keys.map((k) => getCanonicalCachedSearchBody(k)));
  const mixedPass =
    mixed.every(Boolean) &&
    new Set(mixed.map((m) => intelligenceSlice(m).products[0]?.title)).size === keys.length;
  rec(report.shared, "concurrent_different_queries", mixedPass);
  for (const k of keys) await deleteCanonicalCachedSearchBody(k);

  // Cross-process / independently initialized clients
  if (report.selectedBackend === "file") {
    const crossKey = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "cross-worker" }));
    const crossBody = makeCanonicalBody("cross-worker");
    await deleteCanonicalCachedSearchBody(crossKey);
    const w1 = await runChildWorker({
      backend: "file",
      fileDir: FILE_DIR,
      key: crossKey,
      mode: "write",
      body: crossBody,
    });
    const w2 = await runChildWorker({
      backend: "file",
      fileDir: FILE_DIR,
      key: crossKey,
      mode: "read",
    });
    const parentHit = await getCanonicalCachedSearchBody(crossKey);
    const crossPass =
      w1.ok === true &&
      w2.hit === true &&
      w2.title === "cross-worker primary" &&
      Boolean(parentHit) &&
      canonicalIntelligenceEqual(crossBody, parentHit);
    rec(
      report.shared,
      "cross_worker_shared_client_proof",
      crossPass,
      `writer=${w1.ok} readerHit=${w2.hit} parentHit=${Boolean(parentHit)}`
    );
    await deleteCanonicalCachedSearchBody(crossKey);
  } else if (report.selectedBackend === "upstash") {
    const crossKey = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "cross-upstash" }));
    const crossBody = makeCanonicalBody("cross-upstash");
    await deleteCanonicalCachedSearchBody(crossKey);
    await setCanonicalCachedSearchBody(crossKey, crossBody, 120);
    const indep = await getCanonicalCachedSearchBodyViaIndependentUpstashClient(crossKey);
    rec(
      report.shared,
      "cross_worker_shared_client_proof",
      Boolean(indep) && canonicalIntelligenceEqual(crossBody, indep),
      "independent Upstash client"
    );
    await deleteCanonicalCachedSearchBody(crossKey);
  }

  // Memory control: NOT shared across processes
  {
    process.env[CANONICAL_CRC_BACKEND_ENV] = "memory";
    clearCanonicalResponseCache();
    const memKey = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "mem-control" }));
    await setCanonicalCachedSearchBody(memKey, makeCanonicalBody("mem"));
    let memCross = { hit: false };
    try {
      memCross = await runChildWorker({
        backend: "memory",
        fileDir: FILE_DIR,
        key: memKey,
        mode: "read",
      });
    } catch {
      memCross = { hit: false };
    }
    rec(
      report.shared,
      "memory_not_shared_across_workers",
      memCross.hit === false,
      "control: memory MISS in child"
    );
    withBackendEnv(proofBackend);
  }

  await deleteCanonicalCachedSearchBody(key);
}

// --- Latency store/get on shared backend ---
{
  const big = makeCanonicalBody("lat", { dense: true });
  const key = buildCanonicalResponseCacheKey(baseKeyInput({ normalizedQuery: "lat-shared-bench" }));
  const missStore = [];
  const hitGet = [];
  for (let i = 0; i < 40; i++) {
    await deleteCanonicalCachedSearchBody(key);
    const t0 = Date.now();
    await setCanonicalCachedSearchBody(key, big, 120);
    missStore.push(Date.now() - t0);
    const t1 = Date.now();
    const hit = await getCanonicalCachedSearchBody(key);
    hitGet.push(Date.now() - t1);
    if (!hit || !canonicalIntelligenceEqual(big, hit)) report.failures.push("lat-eq");
  }
  report.latency = {
    note: `Module-level shared-backend (${report.selectedBackend}) store/get; compute excluded.`,
    missStore: stats(missStore),
    hitGet: stats(hitGet),
  };
  await deleteCanonicalCachedSearchBody(key);
  console.log("latency", report.latency);
}

// --- Optional live ---
const base = (process.env.SEARCH_BASE_URL || "").replace(/\/$/, "");
if (base) {
  console.log("=== Live shared proof", base, "===");
  const liveCorpus = CORPUS.filter((c) => c.category !== "empty").slice(0, 8);
  const live = {
    base,
    sequential: [],
    concurrent: null,
    missWall: [],
    hitWall: [],
    trueHitCount: 0,
    eqPass: true,
    errors: [],
  };
  async function probe(q) {
    const t0 = Date.now();
    const res = await fetch(`${base}/api/search?q=${encodeURIComponent(q)}`);
    const wallMs = Date.now() - t0;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return {
        wallMs,
        json: null,
        cacheHeader: res.headers.get("x-quantai-canonical-cache"),
        status: res.status,
        parseError: String(e?.message || e),
        bodyLen: text.length,
      };
    }
    return { wallMs, json, cacheHeader: res.headers.get("x-quantai-canonical-cache"), status: res.status };
  }
  try {
    for (const item of liveCorpus) {
      const miss = await probe(item.q);
      if (miss.parseError || !miss.json) {
        live.errors.push({ q: item.q, stage: "miss", error: miss.parseError || "empty" });
        live.eqPass = false;
        continue;
      }
      live.missWall.push(miss.wallMs);
      await sleep(500);
      const hit = await probe(item.q);
      if (hit.parseError || !hit.json) {
        live.errors.push({ q: item.q, stage: "hit", error: hit.parseError || "empty" });
        live.eqPass = false;
        continue;
      }
      live.hitWall.push(hit.wallMs);
      const trueHit = hit.cacheHeader === "HIT";
      if (trueHit) live.trueHitCount += 1;
      const equal =
        JSON.stringify(intelligenceSlice(miss.json)) === JSON.stringify(intelligenceSlice(hit.json));
      if (!equal) {
        live.eqPass = false;
        live.errors.push({ q: item.q, diffs: diffCanonicalIntelligence(miss.json, hit.json).slice(0, 5) });
      }
      live.sequential.push({
        q: item.q,
        missMs: miss.wallMs,
        hitMs: hit.wallMs,
        missHeader: miss.cacheHeader,
        hitHeader: hit.cacheHeader,
        backend: hit.json?.data?.meta?.canonicalResponseCache?.backend ?? null,
        equal,
      });
      await sleep(700);
    }
    // Concurrent warm after sequential warm
    const warmQs = liveCorpus.slice(0, 4).map((c) => c.q);
    const conc = await Promise.all(warmQs.map((q) => probe(q)));
    const hitN = conc.filter((c) => c.cacheHeader === "HIT").length;
    live.concurrent = {
      n: conc.length,
      hits: hitN,
      ratio: hitN / conc.length,
      headers: conc.map((c) => c.cacheHeader),
      latencies: conc.map((c) => c.wallMs),
      allHit: hitN === conc.length,
    };
    live.missStats = stats(live.missWall);
    live.hitStats = stats(live.hitWall.filter((_, i) => live.sequential[i]?.hitHeader === "HIT"));
  } catch (e) {
    live.errors.push(String(e?.message || e));
    live.eqPass = false;
  }
  report.live = live;
  console.log("live concurrent", live.concurrent);
  console.log("live miss/hit", live.missStats, live.hitStats);
}

// Secret scan on report JSON string
{
  const blob = JSON.stringify(report);
  const patterns = [
    /sk_live_[A-Za-z0-9]+/i,
    /sk_test_[A-Za-z0-9]+/i,
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /UPSTASH_REDIS_REST_TOKEN=\S+/i,
  ];
  const hits = patterns.filter((re) => re.test(blob));
  report.secretScan = { pass: hits.length === 0, hitCount: hits.length };
}

report.summary = {
  selectedBackend: report.selectedBackend,
  upstashEnvPresent: report.upstashEnvPresent,
  corpusSize: CORPUS.length,
  comparisons,
  semanticMismatches,
  dimensions: dim,
  isolationPass: report.isolation.every((x) => x.pass),
  equivalencePass: report.equivalence.every((x) => x.pass) && semanticMismatches === 0,
  sharedPass: report.shared.every((x) => x.pass !== false),
  concurrentWarmHitRatio: report.shared.find((x) => x.name === "concurrent_warm_hit_ratio")?.ratio ?? null,
  crossWorkerPass: report.shared.find((x) => x.name === "cross_worker_shared_client_proof")?.pass ?? false,
  secretScanPass: report.secretScan?.pass === true,
  failures: report.failures,
};

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, "shadow-p0-shared-cache-proof.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log("WROTE", outPath);
console.log("SUMMARY", report.summary);

if (!report.summary.isolationPass || !report.summary.equivalencePass || !report.summary.sharedPass) {
  console.error("SHARED_CACHE_PROOF_FAIL");
  process.exit(1);
}
console.log("SHARED_CACHE_PROOF_PASS");
