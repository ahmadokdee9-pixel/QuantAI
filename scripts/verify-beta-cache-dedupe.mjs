#!/usr/bin/env node
/**
 * Cache + in-flight dedupe stability — production or staging.
 * Usage: SEARCH_BASE_URL=https://your-app.vercel.app npm run test:beta-cache-dedupe
 */
const BASE = (process.env.SEARCH_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const QUERY = process.env.BETA_CACHE_QUERY || "quantai cache probe sofa";
const PARALLEL = Number(process.env.BETA_CACHE_PARALLEL || "3");
const MIN_PRODUCTS = Number(process.env.BETA_CACHE_MIN_PRODUCTS || "2");
/** Second sequential hit should be at least this much faster than first (ms). */
const MIN_SPEEDUP_MS = Number(process.env.BETA_CACHE_MIN_SPEEDUP_MS || "1500");
/** Parallel burst should complete within this wall ms (dedupe + cache). */
const PARALLEL_MAX_MS = Number(process.env.BETA_CACHE_PARALLEL_MAX_MS || "12000");

let failed = 0;
function pass(msg) {
  console.log(`[PASS] ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`[FAIL] ${msg}`);
}

async function search(q) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
  const latencyMs = Date.now() - t0;
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* */
  }
  const products = (json?.data?.products ?? []).length;
  const meta = json?.data?.meta ?? {};
  return {
    status: res.status,
    success: json?.success === true,
    latencyMs,
    products,
    searchLatencyMs: meta.searchLatencyMs,
    withinCold: meta.latencyBudget?.withinColdBudget,
  };
}

async function main() {
  console.log(`Cache/dedupe probe — ${BASE}\nQuery: ${QUERY}\n`);

  const cold = await search(QUERY);
  if (cold.status !== 200 || !cold.success) {
    fail(`sequential_cold status=${cold.status}`);
  } else if (cold.products < MIN_PRODUCTS) {
    fail(`sequential_cold products=${cold.products}`);
  } else {
    pass(`sequential_cold ${cold.latencyMs}ms products=${cold.products}`);
  }

  await new Promise((r) => setTimeout(r, 600));
  const warm = await search(QUERY);
  if (warm.status !== 200 || !warm.success) {
    fail(`sequential_warm status=${warm.status}`);
  } else if (warm.products < MIN_PRODUCTS) {
    fail(`sequential_warm products=${warm.products}`);
  } else {
    pass(`sequential_warm ${warm.latencyMs}ms products=${warm.products}`);
  }

  if (cold.success && warm.success) {
    const speedup = cold.latencyMs - warm.latencyMs;
    if (speedup >= MIN_SPEEDUP_MS) {
      pass(`cache_speedup ${speedup}ms (cold ${cold.latencyMs} → warm ${warm.latencyMs})`);
    } else {
      fail(
        `cache_speedup ${speedup}ms < ${MIN_SPEEDUP_MS}ms — guest cache may be cold or stabilization not deployed`
      );
    }
  }

  const burstKey = `${QUERY} burst ${Date.now()}`;
  const t0 = Date.now();
  const burst = await Promise.all(
    Array.from({ length: PARALLEL }, () => search(burstKey))
  );
  const burstWall = Date.now() - t0;
  const okBurst = burst.filter((r) => r.success && r.status === 200);
  if (okBurst.length < PARALLEL) {
    fail(`parallel_burst success=${okBurst.length}/${PARALLEL}`);
  } else {
    pass(`parallel_burst ${PARALLEL}x same query wall=${burstWall}ms`);
  }
  const maxLat = Math.max(...burst.map((r) => r.latencyMs));
  if (burstWall <= PARALLEL_MAX_MS) {
    pass(`parallel_wall ${burstWall}ms <= ${PARALLEL_MAX_MS}ms (dedupe expected)`);
  } else {
    fail(`parallel_wall ${burstWall}ms > ${PARALLEL_MAX_MS}ms`);
  }
  pass(`parallel_max_request_latency ${maxLat}ms`);

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
