/**
 * P4.2 — Institutional gate: staging soak, cross-layer audit, stability, rollback, production guard.
 * Usage: npm run test:intent-apply-p42-gate
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { isIntentIntelligenceApplyEnabled } from "../lib/intent/intentIntelligenceFlags.ts";

const HISTORY = resolve(import.meta.dirname, "../.validation/history");

function loadLatest(suiteName) {
  if (!existsSync(HISTORY)) return null;
  const files = readdirSync(HISTORY)
    .filter((f) => f.includes(`__${suiteName}__`) && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  const path = join(HISTORY, files[files.length - 1]);
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
}

const soak = loadLatest("intent-apply-staging-soak");
const cross = loadLatest("intent-apply-cross-layer-drift");
const stability = loadLatest("intent-apply-ranking-stability");
const rollback = loadLatest("intent-apply-rollback");
const routeSource = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");

const savedProd = process.env.NODE_ENV;
const savedApply = process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
process.env.NODE_ENV = "production";
delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
const prodApplyDefaultOff = !isIntentIntelligenceApplyEnabled();
process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = "true";
const prodApplyWhenFlagged = isIntentIntelligenceApplyEnabled();
if (savedProd === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = savedProd;
if (savedApply === undefined) delete process.env.INTENT_INTELLIGENCE_APPLY_ENABLED;
else process.env.INTENT_INTELLIGENCE_APPLY_ENABLED = savedApply;

const checks = [
  {
    name: "p42_staging_soak",
    ok:
      soak &&
      (soak.report.pass_rate_pct ?? 0) >= 100 &&
      (soak.report.max_delta ?? 99) <= 3 &&
      (soak.report.pollution_top2 ?? 99) === 0 &&
      soak.report.production_apply_enabled === false &&
      soak.report.unified_apply_off === true,
    detail: soak
      ? `pass=${soak.report.pass_rate_pct}% dutch=${soak.report.dutch_pass}/${soak.report.dutch_total}`
      : "run test:intent-apply-staging-soak",
  },
  {
    name: "p42_cross_layer_drift",
    ok:
      cross &&
      (cross.report.pass_rate_pct ?? 0) >= 100 &&
      cross.report.p2_vertical_apply_off === true &&
      cross.report.p3_unified_apply_off === true &&
      (cross.report.cap_violations?.length ?? 0) === 0,
    detail: cross
      ? `pass=${cross.report.pass_rate_pct}% drift=${(cross.report.drift_trays ?? []).join(",") || "none"}`
      : "run test:intent-apply-cross-layer-audit",
  },
  {
    name: "p42_ranking_stability",
    ok:
      stability &&
      (stability.report.pass_rate_pct ?? 0) >= 100 &&
      (stability.report.ranking_deterministic_pct ?? 0) >= 100 &&
      (stability.report.rollback_restore_pct ?? 0) >= 100,
    detail: stability
      ? `deterministic=${stability.report.ranking_deterministic_pct}% rollback=${stability.report.rollback_restore_pct}%`
      : "run test:intent-apply-ranking-stability",
  },
  {
    name: "p41_rollback_verification",
    ok: rollback && rollback.report.pass === true,
    detail: rollback ? `pass=${rollback.report.pass}` : "run test:intent-apply-rollback",
  },
  {
    name: "intent_apply_telemetry",
    ok: routeSource.includes("intentApply") && routeSource.includes("buildIntentApplyMeta"),
    detail: "meta.intentApply wired",
  },
  {
    name: "production_apply_default_off",
    ok: prodApplyDefaultOff,
    detail: `NODE_ENV=production unset flag → applyEnabled=${!prodApplyDefaultOff}`,
  },
];

const p43Safe =
  checks.every((c) => c.ok) &&
  prodApplyDefaultOff &&
  (!soak || soak.report.pass_rate_pct === 100) &&
  (!cross || cross.report.cap_violations?.length === 0);

console.log("Intent apply gate (Phase 4.2)\n");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}

console.log("\n--- P4.3 READINESS ---");
console.log(
  p43Safe
    ? "RECOMMEND: P4.3 may start (production guard for intent apply still advised — flag-only rollback today)."
    : "HOLD: resolve P4.2 failures before P4.3."
);
if (prodApplyWhenFlagged && !prodApplyDefaultOff) {
  console.log(
    "NOTE: INTENT_INTELLIGENCE_APPLY_ENABLED=true activates apply in production (no NODE_ENV guard yet)."
  );
}

if (!checks.every((c) => c.ok)) process.exit(1);
console.log("\nIntent apply P4.2 gate: PASS");
