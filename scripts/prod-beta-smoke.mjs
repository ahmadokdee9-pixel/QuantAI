#!/usr/bin/env node
/**
 * Public beta production smoke — health, guest search, auth-safe API boundaries.
 * Usage: SEARCH_BASE_URL=https://your-app.vercel.app npm run test:beta-prod-smoke
 */
const BASE = (process.env.SEARCH_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const GUEST_QUERY = process.env.BETA_SMOKE_QUERY || "iphone 16";
const MIN_PRODUCTS = Number(process.env.BETA_SMOKE_MIN_PRODUCTS || "2");
const INTERVAL_MS = Number(process.env.BETA_SMOKE_INTERVAL_MS || "2000");

let failed = 0;

function pass(name, detail = "") {
  console.log(`[PASS] ${name}${detail ? `: ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failed += 1;
  console.error(`[FAIL] ${name}${detail ? `: ${detail}` : ""}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  let json = null;
  if (ct.includes("application/json")) {
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
  }
  return { res, json, text, ct };
}

async function checkHealth() {
  const { res, json } = await fetchJson(`${BASE}/api/health`);
  if (res.status !== 200) {
    fail("health_status", String(res.status));
    return;
  }
  if (json?.ok !== true) {
    fail("health_ok_flag");
    return;
  }
  const svc = json.services ?? {};
  for (const key of ["clerk", "supabase", "serpapi", "openai"]) {
    if (!svc[key]) fail(`health_service_${key}`, "not configured");
    else pass(`health_service_${key}`);
  }
  if (!svc.upstash && process.env.REQUIRE_UPSTASH === "true") {
    fail("health_upstash", "REQUIRE_UPSTASH=true but not configured");
  } else if (!svc.upstash) {
    console.warn("[WARN] Upstash not configured — use Upstash in Production (see docs/UPSTASH_RATE_LIMIT_VERIFICATION.md)");
  } else {
    pass("health_upstash");
  }
  pass("health_endpoint");
}

async function checkGuestSearch() {
  const url = `${BASE}/api/search?q=${encodeURIComponent(GUEST_QUERY)}`;
  const t0 = Date.now();
  const { res, json } = await fetchJson(url, { method: "GET" });
  const latencyMs = Date.now() - t0;

  if (res.status === 429) {
    fail("guest_search_rate_limit", "retry later or use cached tray path");
    return;
  }
  if (res.status !== 200) {
    fail("guest_search_status", String(res.status));
    return;
  }
  if (json?.success !== true) {
    fail("guest_search_success", json?.error ?? json?.message ?? "unknown");
    return;
  }
  const products = json?.data?.products ?? [];
  if (products.length < MIN_PRODUCTS) {
    fail("guest_search_tray", `products=${products.length} min=${MIN_PRODUCTS}`);
    return;
  }
  const meta = json?.data?.meta ?? {};
  if (meta.normalizationStage1?.rankingMutation === true) {
    fail("guest_search_ranking_mutation", "normalization must not mutate in beta");
    return;
  }
  pass("guest_search_tray", `${products.length} products in ${latencyMs}ms`);
  if (latencyMs > Number(process.env.BETA_SMOKE_MAX_LATENCY_MS || "12000")) {
    console.warn(`[WARN] guest search latency ${latencyMs}ms exceeds soft cap`);
  }
}

async function checkSavedProductsAuthBoundary() {
  const { res, json } = await fetchJson(`${BASE}/api/intelligence/saved-products`);
  if (res.status === 401) {
    pass("saved_products_auth_boundary", "401 without session");
    return;
  }
  if (res.status === 200 && json?.configured === false) {
    pass("saved_products_degraded", "200 with configured=false");
    return;
  }
  if (res.status === 200 && Array.isArray(json?.items)) {
    pass("saved_products_ok", "authenticated or public read — verify manually");
    return;
  }
  fail("saved_products_unexpected", String(res.status));
}

async function checkCompareAuthBoundary() {
  const { res, json } = await fetchJson(`${BASE}/api/search/compare-verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products: [] }),
  });
  if (res.status === 401) {
    pass("compare_verdict_auth_boundary", "401 without session");
    return;
  }
  if (res.status === 400 && json?.error) {
    pass("compare_verdict_auth_or_validation", String(json.error).slice(0, 60));
    return;
  }
  fail("compare_verdict_unexpected", String(res.status));
}

async function checkSignedInSafeOptional() {
  if (process.env.SKIP_SIGNED_IN_SMOKE === "true") {
    console.log("[SKIP] signed-in smoke (set Clerk session cookie manually — see checklist)");
    return;
  }
  const cookie = process.env.BETA_CLERK_SESSION_COOKIE?.trim();
  if (!cookie) {
    console.log("[SKIP] signed-in smoke — set BETA_CLERK_SESSION_COOKIE or SKIP_SIGNED_IN_SMOKE=true");
    return;
  }
  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  const searchRes = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: GUEST_QUERY }),
  });
  if (searchRes.status !== 200) {
    fail("signed_in_search", String(searchRes.status));
    return;
  }
  pass("signed_in_search");
  await sleep(INTERVAL_MS);
  const savedRes = await fetch(`${BASE}/api/intelligence/saved-products`, { headers });
  if (savedRes.status !== 200) {
    fail("signed_in_saved", String(savedRes.status));
    return;
  }
  pass("signed_in_saved_products");
}

async function main() {
  console.log(`Beta production smoke — ${BASE}\n`);
  await checkHealth();
  await sleep(INTERVAL_MS);
  await checkGuestSearch();
  await sleep(INTERVAL_MS);
  await checkSavedProductsAuthBoundary();
  await sleep(500);
  await checkCompareAuthBoundary();
  await sleep(500);
  await checkSignedInSafeOptional();

  if (failed > 0) {
    console.error(`\n${failed} smoke check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll beta production smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
