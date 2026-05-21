/**
 * Phase 4.0 — Intent Intelligence institutional gate.
 * Usage: npm run test:intent-intelligence-gate
 * Run after: npm run test:intent-intelligence
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

const intent = loadLatest("intent-intelligence");
const routeSource = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");

const checks = [
  {
    name: "intent_intelligence_history",
    ok:
      !intent ||
      ((intent.report.pass_rate_pct ?? 0) >= 90 &&
        intent.report.apply_enabled !== true &&
        (intent.report.max_latency_ms ?? 99) <= 12),
    detail: intent
      ? `pass=${intent.report.pass_rate_pct}% apply=${intent.report.apply_enabled} latency=${intent.report.max_latency_ms}ms`
      : "no intent history (run test:intent-intelligence)",
  },
  {
    name: "intent_arabic_coverage",
    ok: !intent || (intent.report.arabic_pass ?? 0) >= 2,
    detail: intent ? `arabic_pass=${intent.report.arabic_pass}` : "no history",
  },
  {
    name: "intent_english_coverage",
    ok: !intent || (intent.report.english_pass ?? 0) >= 3,
    detail: intent ? `english_pass=${intent.report.english_pass}` : "no history",
  },
  {
    name: "intent_mixed_coverage",
    ok: !intent || (intent.report.mixed_pass ?? 0) >= 1,
    detail: intent ? `mixed_pass=${intent.report.mixed_pass}` : "no history",
  },
  {
    name: "intent_vague_coverage",
    ok: !intent || (intent.report.vague_pass ?? 0) >= 1,
    detail: intent ? `vague_pass=${intent.report.vague_pass}` : "no history",
  },
  {
    name: "intent_telemetry_wired",
    ok: routeSource.includes("intentIntelligence") && routeSource.includes("computeIntentIntelligence"),
    detail: "meta.intentIntelligence in search route",
  },
  {
    name: "intent_apply_off_by_default",
    ok: !intent || intent.report.apply_enabled !== true,
    detail: intent ? `apply=${intent.report.apply_enabled}` : "no history",
  },
];

console.log("Intent intelligence gate (Phase 4.0)\n");
if (intent) console.log(`intent: ${intent.path}\n`);

for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
}

const allOk = checks.every((c) => c.ok);
if (!allOk) process.exit(1);
console.log("\nIntent intelligence gate: PASS");
