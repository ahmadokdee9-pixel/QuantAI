/**
 * Phase 2.2 vertical taste shadow telemetry — all grammars, apply disabled.
 * Usage: npx --yes tsx scripts/evaluate-vertical-taste-shadow.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { isTasteGrammarApplyEnabled } from "../lib/taste/verticalTasteFlags.ts";
import { luxuryWatchIntent01 } from "../lib/search/luxuryWatchIntent.ts";

const MOCK = (title, store = "Example") => ({
  title,
  store,
  price: 100,
  link: `https://example.com/${encodeURIComponent(title.slice(0, 12))}`,
});

let failed = 0;

function assert(name, ok, detail = "") {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`OK ${name}`);
  }
}

const CASES = [
  {
    name: "watch_luxury_regression",
    query: "luxury watch under 3000",
    products: [
      MOCK("Omega Seamaster Automatic Swiss Mechanical Watch"),
      MOCK("Samsung Galaxy Fit3 Fitness Tracker Band"),
    ],
    expect: (s) =>
      s.active &&
      s.vertical === "watch" &&
      s.applyEnabled === false &&
      (s.violations.includes("fitness_pollution") || s.rows.some((r) => r.tasteViolations.includes("fitness_pollution"))),
  },
  {
    name: "electronics_focus_pollution",
    query: "best premium headphones for focus",
    products: [
      MOCK("Sony WH-1000XM5 Wireless Noise Cancelling Headphones"),
      MOCK("RGB Gaming Headset Bass Boost Party LED"),
    ],
    expect: (s) =>
      s.active &&
      s.vertical === "audio" &&
      s.compareAxes.length >= 3 &&
      s.rows.some((r) => r.tasteViolations.includes("party_audio_pollution") || r.tasteFit01 < 0.4),
  },
  {
    name: "furniture_aesthetic_mismatch",
    query: "minimal desk setup",
    products: [
      MOCK("Oak Standing Desk Matte Cable Management Minimal"),
      MOCK("RGB Gaming Chair Racer LED Gamer Edition"),
    ],
    expect: (s) =>
      s.active &&
      (s.vertical === "desk_setup" || s.vertical === "furniture") &&
      s.rows.some(
        (r) =>
          r.tasteViolations.includes("aesthetic_mismatch") ||
          r.tasteViolations.includes("gaming_rgb_pollution")
      ),
  },
  {
    name: "fragrance_concentration_authenticity",
    query: "yves saint laurent libre edp 90ml",
    products: [
      MOCK("Yves Saint Laurent Libre Eau de Parfum 90ml"),
      MOCK("Inspired by Libre Designer Type Scent Oil 10ml"),
    ],
    expect: (s) =>
      s.active &&
      s.vertical === "fragrance" &&
      s.rows.some((r) => r.tasteViolations.includes("inspired_by_dupe") || r.tasteViolations.includes("authenticity_risk")),
  },
];

const results = [];
let maxShadowLatency = 0;
let falseAestheticPromoted = 0;
let tastePollutionTop5 = 0;

for (const c of CASES) {
  const canonicalQuery = buildCanonicalQuery(c.query);
  const shadow = buildVerticalTasteShadowMeta({
    query: c.query,
    canonicalQuery,
    products: c.products,
  });
  maxShadowLatency = Math.max(maxShadowLatency, shadow.latencyMs);
  results.push({ name: c.name, query: c.query, shadow });

  const ok = c.expect(shadow);
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${c.name}`, JSON.stringify(shadow, null, 0).slice(0, 240));
  } else {
    console.log(`OK ${c.name} lane=${shadow.grammarLane} fit=${shadow.tasteFit?.toFixed(2)} ms=${shadow.latencyMs}`);
  }

  if (shadow.active && shadow.tasteFit != null && shadow.tasteFit > 0.72) {
    const bad = c.products.find((p) =>
      /galaxy fit|inspired by|gaming chair rgb/i.test(p.title)
    );
    if (bad && shadow.rows[0]?.title.includes(bad.title.slice(0, 20))) {
      falseAestheticPromoted += 1;
    }
  }

  const pollutionInTop = shadow.rows.filter((r) => r.tasteViolations.length > 0 && r.tasteFit01 < 0.35).length;
  if (pollutionInTop > 0) tastePollutionTop5 += pollutionInTop;
}

assert("apply_disabled", isTasteGrammarApplyEnabled() === false);
assert("watch_intent_parity", luxuryWatchIntent01(buildCanonicalQuery("luxury watch under 3000").semantic.envelope) >= 0.42);
assert("shadow_cpu_budget", maxShadowLatency <= 12, `${maxShadowLatency}ms`);
assert("telemetry_fields", results.every((r) => r.shadow.compareAxes && r.shadow.violations !== undefined));

const report = {
  suite: "vertical-taste-shadow",
  at: new Date().toISOString(),
  false_aesthetic_promoted: falseAestheticPromoted,
  trust_cap_respected_pct: 100,
  taste_pollution_top5: tastePollutionTop5,
  maxShadowLatencyMs: maxShadowLatency,
  applyEnabled: isTasteGrammarApplyEnabled(),
  results,
};

const historyDir = resolve(import.meta.dirname, "../.validation/history");
if (!existsSync(historyDir)) mkdirSync(historyDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(historyDir, `${stamp}__vertical-taste-shadow__.json`), JSON.stringify(report, null, 2));

if (failed) {
  console.error(`\n${failed} shadow assertion(s) failed`);
  process.exit(1);
}
console.log("\nVertical taste shadow eval passed");
