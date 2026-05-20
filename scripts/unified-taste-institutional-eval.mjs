/**
 * Phase 3.1 unified taste institutional eval — cross-vertical coherence + prestige integrity.
 * Usage: npx --yes tsx scripts/unified-taste-institutional-eval.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";
import { computeUnifiedTasteSignals } from "../lib/taste/unifiedTasteIdentity.ts";
import { saveValidationRun } from "./lib/validationHistory.mjs";

const MOCK = (title) => ({
  title,
  store: "Store",
  price: 420,
  link: `https://x/${title.slice(0, 8)}`,
  extensions: [],
  rating: 4.3,
});

const CASES = [
  {
    name: "quiet_luxury_watch_coherence",
    query: "elegant swiss dress watch quiet luxury",
    expectIdentity: "quiet_luxury",
    minCoherence: 0.55,
    minPrestige: 0.75,
    products: [MOCK("Tissot Gentleman Powermatic Dress Watch Swiss"), MOCK("Casio Fitness Smart Watch")],
  },
  {
    name: "haute_collector_fragrance",
    query: "niche artisan haute parfum extrait",
    expectIdentity: "haute_collector",
    minCoherence: 0.55,
    minPrestige: 0.75,
    products: [MOCK("Tom Ford Private Blend Extrait Parfum"), MOCK("Inspired by Tom Ford Clone Oil")],
  },
  {
    name: "institutional_minimal_furniture",
    query: "minimal oak desk setup clean",
    expectIdentity: "institutional_minimal",
    minCoherence: 0.55,
    minPrestige: 0.75,
    products: [MOCK("Oak Standing Desk Matte Cable Management"), MOCK("RGB Gaming Chair Racer LED")],
  },
  {
    name: "architectural_modern_stability",
    query: "architectural office minimal designer desk",
    expectIdentity: "architectural_modern",
    minCoherence: 0.55,
    minPrestige: 0.75,
    products: [MOCK("Architectural Bespoke Walnut Designer Desk"), MOCK("Plastic Premium Look Desk")],
  },
  {
    name: "executive_premium_cross_vertical",
    query: "executive premium workspace ergonomic office",
    expectIdentity: "executive_premium",
    minCoherence: 0.55,
    minPrestige: 0.75,
    minCrossVertical: 0.5,
    products: [MOCK("Steelcase Gesture Ergonomic Office Chair"), MOCK("Racing Gamer Chair")],
  },
  {
    name: "creative_studio_desk",
    query: "clean studio desk minimal monochrome",
    expectIdentity: "creative_studio",
    minCoherence: 0.55,
    minPrestige: 0.75,
    products: [MOCK("White Studio Desk Monochrome Cable Management"), MOCK("LED Gamer Desk RGB")],
  },
  {
    name: "pollution_resistance_prestige",
    query: "minimal desk setup",
    expectIdentity: "institutional_minimal",
    minCoherence: 0.5,
    minPrestige: 0.68,
    pollutionProduct: "RGB Gaming Chair Racer LED Gamer",
    products: [MOCK("Oak Minimal Desk Matte"), MOCK("RGB Gaming Chair Racer LED Gamer")],
  },
];

process.env.TASTE_UNIFIED_APPLY_ENABLED = "false";

let failed = 0;
const results = [];

for (const c of CASES) {
  const canonical = buildCanonicalQuery(c.query);
  const shadow = buildVerticalTasteShadowMeta({ query: c.query, canonicalQuery: canonical, products: c.products });
  const signals = computeUnifiedTasteSignals({
    query: c.query,
    canonicalQuery: canonical,
    products: c.products,
    tasteGrammarShadow: shadow,
  });
  const m = signals.meta;

  const ok =
    m.active &&
    m.identity === c.expectIdentity &&
    m.confidence >= 0.4 &&
    m.coherenceScore >= c.minCoherence &&
    m.prestigeIntegrity >= c.minPrestige &&
    (c.minCrossVertical == null || m.crossVerticalAlignment >= c.minCrossVertical) &&
    m.boundedInfluenceMax <= 4 &&
    !m.applyEnabled;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${c.name}`, m);
  } else {
    console.log(
      `OK ${c.name} identity=${m.identity} coherence=${m.coherenceScore} prestige=${m.prestigeIntegrity} cross=${m.crossVerticalAlignment}`
    );
  }

  results.push({ name: c.name, pass: ok, meta: m });
}

const report = {
  suite: "unified-taste-institutional",
  at: new Date().toISOString(),
  apply_enabled: false,
  cases_passed: results.filter((r) => r.pass).length,
  cases_total: results.length,
  pass_rate_pct: Math.round((results.filter((r) => r.pass).length / results.length) * 100),
  cross_vertical_coherence_min: Math.min(...results.map((r) => r.meta.coherenceScore ?? 0)),
  quiet_luxury_consistency: results.find((r) => r.name === "quiet_luxury_watch_coherence")?.meta.coherenceScore ?? 0,
  pollution_resistance: results.find((r) => r.name === "pollution_resistance_prestige")?.meta.prestigeIntegrity ?? 0,
  prestige_integrity_min: Math.min(...results.map((r) => r.meta.prestigeIntegrity ?? 0)),
  architectural_minimalism_stability:
    results.find((r) => r.name === "architectural_modern_stability")?.meta.coherenceScore ?? 0,
  max_unified_influence: 4,
  results,
};

saveValidationRun(report, "unified-taste-institutional");

if (failed) process.exit(1);
console.log("\nUnified taste institutional eval passed");
