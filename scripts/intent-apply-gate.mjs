/**
 * P4.1 — Intent apply institutional gate.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

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

const soak = loadLatest("intent-apply-soak");
const rollback = loadLatest("intent-apply-rollback");
const routeSource = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");

const checks = [
  {
    name: "intent_apply_soak_p41",
    ok:
      !soak ||
      ((soak.report.pass_rate_pct ?? 0) >= 100 &&
        (soak.report.max_delta ?? 99) <= 3 &&
        (soak.report.pollution_top2 ?? 99) === 0 &&
        soak.report.unified_apply_off === true),
    detail: soak
      ? `pass=${soak.report.pass_rate_pct}% maxDelta=${soak.report.max_delta} pollution=${soak.report.pollution_top2}`
      : "no soak history (run test:intent-apply-soak)",
  },
  {
    name: "intent_apply_rollback",
    ok: !rollback || rollback.report.pass === true,
    detail: rollback ? `pass=${rollback.report.pass}` : "no rollback history",
  },
  {
    name: "intent_apply_telemetry",
    ok: routeSource.includes("intentApply") && routeSource.includes("buildIntentApplyMeta"),
    detail: "meta.intentApply wired",
  },
];

console.log("Intent apply gate (Phase 4.1)\n");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}

if (!checks.every((c) => c.ok)) process.exit(1);
console.log("\nIntent apply gate: PASS");
