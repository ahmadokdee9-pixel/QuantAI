/**
 * P3.3 — Production guard: unified apply OFF by default in production.
 * Usage: npm run test:unified-production-guard
 */
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import {
  isUnifiedApplyBlockedInProduction,
  isUnifiedCanaryEnvironmentAllowed,
  isUnifiedCanaryHardRollback,
  isUnifiedTasteApplyEnabled,
} from "../lib/taste/unifiedTasteFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
  ENABLE_UNIFIED_CANARY: process.env.ENABLE_UNIFIED_CANARY,
  TASTE_GRAMMAR_ENABLED: process.env.TASTE_GRAMMAR_ENABLED,
  TASTE_FRAGRANCE_GRAMMAR_ENABLED: process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED,
  TASTE_FURNITURE_GRAMMAR_ENABLED: process.env.TASTE_FURNITURE_GRAMMAR_ENABLED,
};

function restoreEnv() {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

let failed = 0;
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}: ${detail}`);
  if (!ok) failed += 1;
}

try {
  process.env.TASTE_GRAMMAR_ENABLED = "false";
  process.env.TASTE_FRAGRANCE_GRAMMAR_ENABLED = "false";
  process.env.TASTE_FURNITURE_GRAMMAR_ENABLED = "false";

  process.env.NODE_ENV = "production";
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  delete process.env.ENABLE_UNIFIED_CANARY;
  check(
    "production_default_apply_off",
    !isUnifiedTasteApplyEnabled() && isUnifiedApplyBlockedInProduction(),
    `apply=${isUnifiedTasteApplyEnabled()} blocked=${isUnifiedApplyBlockedInProduction()}`
  );

  process.env.ENABLE_UNIFIED_CANARY = "false";
  check(
    "hard_rollback_production",
    !isUnifiedTasteApplyEnabled() && isUnifiedCanaryHardRollback(),
    `apply=${isUnifiedTasteApplyEnabled()} rollback=${isUnifiedCanaryHardRollback()}`
  );

  process.env.NODE_ENV = "development";
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  process.env.ENABLE_UNIFIED_CANARY = "false";
  check(
    "hard_rollback_staging",
    !isUnifiedTasteApplyEnabled(),
    `apply=${isUnifiedTasteApplyEnabled()}`
  );

  delete process.env.ENABLE_UNIFIED_CANARY;
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  check(
    "staging_apply_on",
    isUnifiedTasteApplyEnabled() && isUnifiedCanaryEnvironmentAllowed(),
    `apply=${isUnifiedTasteApplyEnabled()} guard=${isUnifiedCanaryEnvironmentAllowed()}`
  );

  const query = "elegant swiss dress watch quiet luxury";
  const products = [
    { title: "Tissot Gentleman Powermatic Dress Watch Swiss", store: "A", price: 650, link: "a1", extensions: [], rating: 4.2 },
    { title: "Casio Fitness Smart Watch Step Counter", store: "B", price: 45, link: "b1", extensions: [], rating: 4.2 },
    { title: "Hamilton Jazzmaster Dress Automatic", store: "C", price: 720, link: "c1", extensions: [], rating: 4.2 },
  ];
  const canonical = buildCanonicalQuery(query);
  process.env.NODE_ENV = "production";
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  delete process.env.ENABLE_UNIFIED_CANARY;
  const prodRanked = semanticRerankSearchResults([...products], query, canonical);
  process.env.NODE_ENV = "development";
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";
  const devOffRanked = semanticRerankSearchResults([...products], query, canonical);
  const prodInert =
    !isUnifiedTasteApplyEnabled() &&
    prodRanked.map((p) => p.link).join("|") === devOffRanked.map((p) => p.link).join("|");
  check("production_rerank_inert", prodInert, `links_match=${prodInert}`);

  process.env.NODE_ENV = "production";
  process.env.ENABLE_UNIFIED_CANARY = "true";
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "true";
  check(
    "production_explicit_canary_opt_in",
    isUnifiedTasteApplyEnabled(),
    `apply=${isUnifiedTasteApplyEnabled()} (staging-only rollout; prod default remains OFF)`
  );
} finally {
  restoreEnv();
}

const report = {
  suite: "unified-production-guard",
  phase: "P3.3",
  at: new Date().toISOString(),
  checks_passed: checks.filter((c) => c.ok).length,
  checks_total: checks.length,
  pass_rate_pct: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100),
  production_default_off: checks.find((c) => c.name === "production_default_apply_off")?.ok ?? false,
  hard_rollback: checks.filter((c) => c.name.includes("rollback")).every((c) => c.ok),
  checks,
  recommendation: failed === 0 ? "production_safe_staging_soak_ready" : "fix_guard_before_staging_soak",
};

saveValidationRun(report, "unified-production-guard");

if (failed) process.exit(1);
console.log("\nUnified production guard passed");
