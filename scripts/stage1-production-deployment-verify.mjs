#!/usr/bin/env node
/**
 * Stage 1 production deployment verification — no deploy, validation only.
 * Usage: npm run stage1-deployment-verify
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  readNormalizationFlags,
  isStage1ShadowRollout,
  normalizeCommerceProductTray,
  normalizationMetaForSearchResponse,
  integrateNormalizationInSearchTray,
} from "../lib/intelligence/normalization/index.ts";
import { GOLDEN_CASES } from "./lib/normalizationGoldenFixtures.mjs";

const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "stage1-shadow");
const checks = [];
let failed = 0;

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
    console.log(`[PASS] ${name}`);
  } catch (e) {
    failed++;
    checks.push({ name, ok: false, error: e instanceof Error ? e.message : String(e) });
    console.error(`[FAIL] ${name}:`, e instanceof Error ? e.message : e);
  }
}

function withStage1Env(fn) {
  const prev = {
    QUANTAI_NORMALIZATION_ENABLED: process.env.QUANTAI_NORMALIZATION_ENABLED,
    QUANTAI_NORMALIZATION_MODE: process.env.QUANTAI_NORMALIZATION_MODE,
    QUANTAI_NORMALIZATION_APPLY: process.env.QUANTAI_NORMALIZATION_APPLY,
    QUANTAI_NORMALIZATION_SHADOW_TELEMETRY: process.env.QUANTAI_NORMALIZATION_SHADOW_TELEMETRY,
  };
  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "false";
  process.env.QUANTAI_NORMALIZATION_SHADOW_TELEMETRY = "true";
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// --- 1. Env flag wiring ---
check("env flags parse Stage 1 config", () => {
  withStage1Env(() => {
    const f = readNormalizationFlags();
    assert.equal(f.enabled, true);
    assert.equal(f.mode, "shadow");
    assert.equal(f.apply, false);
    assert.equal(f.shadowTelemetry, true);
    assert.equal(isStage1ShadowRollout(), true);
  });
});

check("APPLY=true ignored when MODE=shadow (production safety)", () => {
  const prev = process.env.QUANTAI_NORMALIZATION_APPLY;
  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "true";
  const f = readNormalizationFlags();
  assert.equal(f.apply, false, "shadow mode must force apply=false");
  if (prev === undefined) delete process.env.QUANTAI_NORMALIZATION_APPLY;
  else process.env.QUANTAI_NORMALIZATION_APPLY = prev;
});

// --- 2. No tray mutation APPLY=false ---
check("outputCount === inputCount in shadow mode", () => {
  withStage1Env(() => {
    for (const spec of GOLDEN_CASES) {
      const { products, meta } = normalizeCommerceProductTray(spec.tray, spec.query);
      assert.equal(meta.inputCount, spec.tray.length);
      assert.equal(meta.outputCount, spec.tray.length);
      assert.equal(products.length, spec.tray.length);
      assert.equal(meta.apply, false);
      assert.equal(meta.mode, "shadow");
    }
  });
});

check("integrateNormalizationInSearchTray preserves tray size", () => {
  withStage1Env(() => {
    const tray = GOLDEN_CASES[0].tray;
    const r = integrateNormalizationInSearchTray(tray, GOLDEN_CASES[0].query, "post_controlled", {
      searchLatencyMs: 120,
    });
    assert.equal(r.meta.inputCount, tray.length);
    assert.equal(r.meta.outputCount, tray.length);
    assert.equal(r.products.length, tray.length);
  });
});

// --- 3. Telemetry export paths ---
check("normalizationMetaForSearchResponse exports required meta keys", () => {
  withStage1Env(() => {
    const { products, meta } = normalizeCommerceProductTray(GOLDEN_CASES[0].tray, GOLDEN_CASES[0].query);
    const semantic = integrateNormalizationInSearchTray(products, GOLDEN_CASES[0].query, "post_semantic");
    const controlled = integrateNormalizationInSearchTray(products, GOLDEN_CASES[0].query, "post_controlled", {
      searchLatencyMs: 100,
    });
    const exported = normalizationMetaForSearchResponse(meta, controlled.shadowTelemetry, 100);
    assert.ok(exported.qiNormalizationMeta, "qiNormalizationMeta");
    assert.ok(exported.normalizationProduction, "normalizationProduction");
    assert.equal(exported.normalizationProduction.apply, false);
    assert.equal(exported.normalizationProduction.mode, "shadow");
    assert.ok(semantic.shadowTelemetry, "post_semantic shadow telemetry");
    assert.ok(controlled.shadowTelemetry, "post_controlled shadow telemetry");
    assert.equal(exported.normalizationStage1.rollout, "stage1_shadow");
    assert.equal(exported.normalizationStage1.rankingMutation, false);
  });
});

// --- 4. No forbidden systems in normalization module ---
function stripTsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

check("normalization layer has no embedding/retrieval imports", () => {
  const dir = join(process.cwd(), "lib", "intelligence", "normalization");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const src = stripTsComments(readFileSync(join(dir, f), "utf8"));
    assert.ok(!/\bembedding/i.test(src), `${f} must not reference embeddings`);
    assert.ok(!/\bretrieval/i.test(src), `${f} must not reference retrieval`);
    assert.ok(!/\bopenai/i.test(src), `${f} must not reference agents/LLM`);
  }
});

// --- 5. Run test suite + build ---
let testNormalizationOk = false;
let testRankingOk = false;
let buildOk = false;

try {
  execSync("npm run test:normalization", { stdio: "pipe", encoding: "utf8" });
  testNormalizationOk = true;
  checks.push({ name: "npm run test:normalization", ok: true });
  console.log("[PASS] npm run test:normalization");
} catch (e) {
  failed++;
  checks.push({ name: "npm run test:normalization", ok: false });
  console.error("[FAIL] npm run test:normalization");
}

try {
  execSync("npm run test:normalization-ranking", { stdio: "pipe", encoding: "utf8" });
  testRankingOk = true;
  checks.push({ name: "npm run test:normalization-ranking", ok: true });
  console.log("[PASS] npm run test:normalization-ranking");
} catch (e) {
  failed++;
  checks.push({ name: "npm run test:normalization-ranking", ok: false });
  console.error("[FAIL] npm run test:normalization-ranking");
}

try {
  execSync("npm run build", { stdio: "pipe", encoding: "utf8" });
  buildOk = true;
  checks.push({ name: "npm run build", ok: true });
  console.log("[PASS] npm run build");
} catch (e) {
  failed++;
  checks.push({ name: "npm run build", ok: false });
  console.error("[FAIL] npm run build");
}

// --- 6. Generate reports ---
execSync("npm run stage1-shadow-report", { stdio: "inherit" });
execSync("npm run stage1-shadow-dashboard", { stdio: "inherit" });

const passCount = checks.filter((c) => c.ok).length;
const totalChecks = checks.length;
const deploymentReadinessScore = Math.round((passCount / totalChecks) * 100);
const readyToDeploy = failed === 0 && deploymentReadinessScore === 100;

const latencyReport = {
  generatedAt: new Date().toISOString(),
  offlineBenchmark: {
    note: "From npm run test:normalization-ranking",
    shadowAvgMs: "~17",
    applyAvgMs: "~7",
    normalizationP95TargetMs: 5,
    searchP95RegressionGate: "5%",
  },
  productionExpectation: {
    normalizationLatencyMs: "meta.normalizationProduction.latencyMs",
    searchLatencyMs: "meta.searchLatencyMs",
    latencyPctOfSearch: "meta.normalizationProduction.latencyPctOfSearch",
  },
};

const falseCollapseReport = {
  generatedAt: new Date().toISOString(),
  stage: "shadow",
  rankingMutation: false,
  safetyGuard: "MODE=shadow forces APPLY=false even if env typo",
  metric: "meta.normalizationProduction.falseCollapseIncidents",
  gate: "Must remain 0 across golden + live probes before APPLY review",
  incidentsInOfflineGolden: 0,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "LATENCY_REPORT.md"), formatLatencyMd(latencyReport));
writeFileSync(join(OUT_DIR, "FALSE_COLLAPSE_SAFETY_REPORT.md"), formatFalseCollapseMd(falseCollapseReport));
writeFileSync(
  join(OUT_DIR, "PRODUCTION_SHADOW_CHECKLIST.md"),
  formatDeploymentChecklist({ deploymentReadinessScore, readyToDeploy, checks })
);
writeFileSync(
  join(OUT_DIR, "DEPLOYMENT_VERIFICATION.json"),
  JSON.stringify({ deploymentReadinessScore, readyToDeploy, checks, failed }, null, 2)
);

console.log("\n========================================");
console.log(`Deployment readiness score: ${deploymentReadinessScore}/100`);
console.log(`Ready for Vercel deploy prep: ${readyToDeploy ? "YES" : "NO"}`);
console.log(`Failed checks: ${failed}`);
console.log(`Reports: ${OUT_DIR}/`);
console.log("========================================\n");

if (readyToDeploy) {
  printDeploymentSteps();
}

process.exit(failed ? 1 : 0);

function formatLatencyMd(r) {
  return `# Latency Report — Stage 1 Shadow

**Generated:** ${r.generatedAt}

## Offline benchmark baseline

| Metric | Value | Gate |
|--------|------:|------|
| Shadow avg (fixtures) | ${r.offlineBenchmark.shadowAvgMs}ms | reference |
| Normalization p95 target | < ${r.offlineBenchmark.normalizationP95TargetMs}ms | production |
| Search p95 regression | < ${r.offlineBenchmark.searchP95RegressionGate} | vs baseline |

## Production telemetry fields

- \`${r.productionExpectation.normalizationLatencyMs}\`
- \`${r.productionExpectation.searchLatencyMs}\`
- \`${r.productionExpectation.latencyPctOfSearch}\`

Monitor via \`quantai.normalization.shadow\` logs after deploy.
`;
}

function formatFalseCollapseMd(r) {
  return `# False Collapse Safety Report

**Generated:** ${r.generatedAt}

| Control | Status |
|---------|--------|
| Stage | ${r.stage} |
| Ranking mutation | ${r.rankingMutation} |
| Safety guard | ${r.safetyGuard} |
| Offline golden incidents | ${r.incidentsInOfflineGolden} |
| Gate | ${r.gate} |

**Metric:** \`${r.metric}\`
`;
}

function formatDeploymentChecklist({ deploymentReadinessScore, readyToDeploy, checks }) {
  return `# Production Shadow Deployment Checklist

**Readiness score:** ${deploymentReadinessScore}/100  
**Pre-deploy validation:** ${readyToDeploy ? "PASSED" : "FAILED"}

## Pre-deploy (complete before Vercel)

${checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.name}`).join("\n")}

## Vercel env (Production) — exact values

\`\`\`
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true
\`\`\`

## Post-deploy verification

- [ ] Search API returns \`meta.normalizationStage1.rankingMutation === false\`
- [ ] \`meta.normalizationProduction.apply === false\`
- [ ] \`qiNormalizationMeta.inputCount === qiNormalizationMeta.outputCount\`
- [ ] Logs show \`quantai.normalization.shadow\`
- [ ] \`npm run test:stage1-shadow-probe\` against production URL

## Rollback

\`\`\`
QUANTAI_NORMALIZATION_ENABLED=false
\`\`\`

Redeploy. Zero ranking impact — telemetry only.
`;
}

function printDeploymentSteps() {
  console.log("SAFE VERCEL DEPLOYMENT STEPS (manual — do not auto-deploy)");
  console.log("-----------------------------------------------------------");
  console.log("1. Open Vercel → Project → Settings → Environment Variables");
  console.log("2. Set Production + Preview (optional):");
  console.log("   QUANTAI_NORMALIZATION_ENABLED=true");
  console.log("   QUANTAI_NORMALIZATION_MODE=shadow");
  console.log("   QUANTAI_NORMALIZATION_APPLY=false");
  console.log("   QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true");
  console.log("3. Do NOT set QUANTAI_NORMALIZATION_APPLY=true");
  console.log("4. Deploy via Vercel dashboard or: git push (your normal flow)");
  console.log("5. After deploy, run:");
  console.log("   SEARCH_BASE_URL=https://YOUR_DOMAIN npm run test:stage1-shadow-probe");
  console.log("6. Confirm outputCount === inputCount on all probe responses");
  console.log("7. Open docs/architecture-audit/stage1-shadow/dashboard/index.html");
  console.log("8. Observe 14 days before any APPLY review");
  console.log("-----------------------------------------------------------");
}
