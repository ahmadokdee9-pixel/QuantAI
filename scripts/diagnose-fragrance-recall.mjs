/**
 * Evidence-based YSL Libre recall diagnosis — supply vs routing vs identity gate.
 * Usage: SEARCH_BASE_URL=https://quant-ai-app.vercel.app node scripts/diagnose-fragrance-recall.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { validationSearch, ValidationRequestQueue } from "./lib/validationQueue.mjs";

const QUERY = process.env.FRAGRANCE_DIAG_QUERY || "yves saint laurent libre edp 90ml";
const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "../.validation/fragrance-recall-diagnosis.json");

async function loadCanonical() {
  const { buildCanonicalQuery } = await import("../lib/search/canonicalQuery.ts");
  return buildCanonicalQuery(QUERY);
}

function stageFindings(meta) {
  const stages = Array.isArray(meta?.stageSuppression) ? meta.stageSuppression : [];
  return stages
    .filter((s) => (s.suppressed ?? 0) > 0)
    .map((s) => ({ stage: s.stage, before: s.before, after: s.after, suppressed: s.suppressed }));
}

function diagnose(canonical, api) {
  const findings = [];
  const products = api.products ?? [];
  const meta = api.meta ?? {};
  const cat = meta?.canonicalQuery?.category ?? canonical.category;

  findings.push({
    check: "category_routing",
    ok: cat === "fragrance",
    evidence: { expected: "fragrance", got: cat, marketMode: canonical.marketMode },
  });

  findings.push({
    check: "canonical_identity",
    ok: Boolean(canonical.brand && canonical.model),
    evidence: {
      brand: canonical.brand,
      model: canonical.model,
      variant: canonical.variant,
      upstreamQuery: canonical.upstreamQuery,
      intent: canonical.intent?.primary,
    },
  });

  if (products.length === 0) {
    const suppression = stageFindings(meta);
    const identityDebug = meta?.identityDebug ?? null;
    const gateHeavy = suppression.some((s) => s.stage === "hard_identity_gate" && (s.suppressed ?? 0) >= 5);
    const upstreamLow = (meta?.upstreamReliabilityScore ?? 100) < 40;
    const discoveryEmpty = (meta?.discoveryCandidates ?? 0) === 0 && (meta?.externalRowsAccepted ?? 0) === 0;

    let primaryCause = "unknown";
    if (api.infrastructure) primaryCause = "infrastructure_rate_or_upstream";
    else if (discoveryEmpty && upstreamLow) primaryCause = "upstream_supply_empty";
    else if (gateHeavy) primaryCause = "identity_gate_over_filter";
    else if (suppression.length === 0) primaryCause = "upstream_supply_empty";
    else primaryCause = "mixed_pipeline_suppression";

    findings.push({
      check: "empty_tray_root_cause",
      ok: false,
      evidence: {
        primaryCause,
        productCount: 0,
        suppression,
        identityCounts: identityDebug?.counts ?? null,
        upstreamReliabilityScore: meta?.upstreamReliabilityScore ?? null,
        discoveryCandidates: meta?.discoveryCandidates ?? null,
        fallbackReason: meta?.fallbackReason ?? null,
      },
    });
  } else {
    const top = products.slice(0, 8);
    const libreHits = top.filter((p) => /\b(libre|yves|saint\s+laurent|ysl)\b/i.test(p.title ?? "")).length;
    const perfumeHits = top.filter((p) => /\b(perfume|parfum|edp|eau de)\b/i.test(p.title ?? "")).length;
    findings.push({
      check: "recall_quality",
      ok: libreHits >= 1,
      evidence: {
        productCount: products.length,
        libreHitsInTop8: libreHits,
        perfumeHitsInTop8: perfumeHits,
        topTitles: top.map((p) => ({ title: p.title, store: p.store, price: p.price })),
      },
    });
  }

  return findings;
}

const queue = new ValidationRequestQueue({ minIntervalMs: 0 });
const canonical = await loadCanonical();
const api = await validationSearch(BASE_URL, QUERY, queue);

const report = {
  generatedAt: new Date().toISOString(),
  query: QUERY,
  baseUrl: BASE_URL,
  canonical: {
    category: canonical.category,
    brand: canonical.brand,
    model: canonical.model,
    variant: canonical.variant,
    marketMode: canonical.marketMode,
    upstreamQuery: canonical.upstreamQuery,
    normalizedQuery: canonical.normalizedQuery,
  },
  api: {
    status: api.status,
    success: api.success,
    productCount: api.products?.length ?? 0,
    infrastructure: api.infrastructure ?? null,
    degraded: api.degraded ?? false,
  },
  findings: diagnose(canonical, api),
  verdict: null,
};

const failed = report.findings.filter((f) => f.ok === false);
const emptyCause = report.findings.find((f) => f.check === "empty_tray_root_cause")?.evidence?.primaryCause;
report.verdict =
  api.infrastructure
    ? "Blocked by infrastructure (rate limit or upstream HTTP) — not a ranking regression."
    : (api.products?.length ?? 0) === 0
      ? `Empty tray — primary signal: ${emptyCause ?? "investigate upstream and identity gate stages"}.`
      : failed.some((f) => f.check === "recall_quality")
        ? "Tray populated but weak Libre/YSL alignment in top results — ranking or supply breadth issue."
        : "Recall present with acceptable YSL/Libre alignment in top results.";

mkdirSync(resolve(OUT, ".."), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify(report, null, 2));
console.log(`\nVerdict: ${report.verdict}`);
console.log(`Written: ${OUT}`);
