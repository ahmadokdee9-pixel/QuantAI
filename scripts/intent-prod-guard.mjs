/**
 * P4.3 — Production guard: intent apply OFF by default in production.
 * Usage: npm run test:intent-prod-guard
 */
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import {
  isIntentApplyBlockedInProduction,
  isIntentApplyHardRollback,
  isIntentIntelligenceApplyEnabled,
  resolveIntentRolloutMode,
} from "../lib/intent/intentIntelligenceFlags.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const saved = {
  NODE_ENV: process.env.NODE_ENV,
  INTENT_INTELLIGENCE_APPLY_ENABLED: process.env.INTENT_INTELLIGENCE_APPLY_ENABLED,
  INTENT_INTELLIGENCE_PROD_APPLY: process.env.INTENT_INTELLIGENCE_PROD_APPLY,
  INTENT_INTELLIGENCE_CANARY_APPLY: process.env.INTENT_INTELLIGENCE_CANARY_APPLY,
  TASTE_UNIFIED_APPLY_ENABLED: process.env.TASTE_UNIFIED_APPLY_ENABLED,
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
  process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";

  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
  check(
    "production_apply_off_without_prod_flag",
    !isIntentIntelligenceApplyEnabled() && isIntentApplyBlockedInProduction(),
    `apply=${isIntentIntelligenceApplyEnabled()} blocked=${isIntentApplyBlockedInProduction()} mode=${resolveIntentRolloutMode()}`
  );

  check(
    "node_env_production_alone_inert",
    resolveIntentRolloutMode() === "off",
    `rolloutMode=${resolveIntentRolloutMode()}`
  );

  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  check(
    "hard_rollback_production",
    !isIntentIntelligenceApplyEnabled() && isIntentApplyHardRollback(),
    `apply=${isIntentIntelligenceApplyEnabled()} rollback=${isIntentApplyHardRollback()}`
  );

  process.env.NODE_ENV = "development";
  delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  check(
    "staging_apply_on",
    isIntentIntelligenceApplyEnabled() && resolveIntentRolloutMode() === "staging",
    `apply=${isIntentIntelligenceApplyEnabled()} mode=${resolveIntentRolloutMode()}`
  );

  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  process.env.INTENT_INTELLIGENCE_CANARY_APPLY = "true";
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  check(
    "production_canary_opt_in",
    isIntentIntelligenceApplyEnabled() && resolveIntentRolloutMode() === "canary",
    `apply=${isIntentIntelligenceApplyEnabled()} mode=${resolveIntentRolloutMode()}`
  );

  process.env.INTENT_INTELLIGENCE_PROD_APPLY = "true";
  check(
    "production_full_opt_in",
    isIntentIntelligenceApplyEnabled() && resolveIntentRolloutMode() === "production",
    `apply=${isIntentIntelligenceApplyEnabled()} mode=${resolveIntentRolloutMode()}`
  );

  const query = "authentic ysl libre trusted seller only";
  const products = [
    { title: "YSL Libre EDP 90ml Authentic", store: "Douglas", price: 95, link: "d1", extensions: [], rating: 4.2 },
    { title: "Inspired by Libre Clone Oil", store: "Temu Deals", price: 12, link: "t1", extensions: [], rating: 4.2 },
    { title: "Yves Saint Laurent Libre 90ml", store: "Notino", price: 92, link: "n1", extensions: [], rating: 4.2 },
  ];
  const canonical = buildCanonicalQuery(query);

  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  delete process.env.INTENT_INTELLIGENCE_PROD_APPLY;
  delete process.env.INTENT_INTELLIGENCE_CANARY_APPLY;
  const prodRanked = semanticRerankSearchResults([...products], query, canonical);
  process.env.NODE_ENV = "development";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "false";
  const devOffRanked = semanticRerankSearchResults([...products], query, canonical);
  const prodInert =
    !isIntentIntelligenceApplyEnabled() &&
    prodRanked.map((p) => p.link).join("|") === devOffRanked.map((p) => p.link).join("|");
  check("production_rerank_inert_without_opt_in", prodInert, `links_match=${prodInert}`);

  process.env.NODE_ENV = "production";
  process.env.INTENT_INTELLIGENCE_PROD_APPLY = "true";
  process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
  const prodOnRanked = semanticRerankSearchResults([...products], query, canonical);
  check(
    "production_bounded_when_opted_in",
    isIntentIntelligenceApplyEnabled() && prodOnRanked.length === products.length,
    `apply=${isIntentIntelligenceApplyEnabled()} rows=${prodOnRanked.length}`
  );
} finally {
  restoreEnv();
}

const report = {
  suite: "intent-prod-guard",
  phase: "P4.3",
  at: new Date().toISOString(),
  checks_passed: checks.filter((c) => c.ok).length,
  checks_total: checks.length,
  pass_rate_pct: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100),
  production_default_off: checks.find((c) => c.name === "production_apply_off_without_prod_flag")?.ok ?? false,
  checks,
  recommendation: failed === 0 ? "production_guard_pass" : "fix_guard_before_rollout",
};

saveValidationRun(report, "intent-prod-guard");

if (failed) process.exit(1);
console.log("\nIntent production guard passed");
