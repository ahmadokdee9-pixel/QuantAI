/**
 * Phase 2.1 vertical taste grammar — shadow-mode assertions (offline + optional live).
 * Usage: npx --yes tsx scripts/evaluate-vertical-taste-grammar.mjs
 * Live:  SEARCH_BASE_URL=https://quant-ai-app.vercel.app npx --yes tsx scripts/evaluate-vertical-taste-grammar.mjs
 */
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import {
  hasLuxuryWatchIntent,
  luxuryWatchIntent01,
} from "../lib/search/luxuryWatchIntent.ts";
import { luxuryWatchGrammar } from "../lib/taste/grammars/luxuryWatchGrammar.ts";
import {
  VERTICAL_TASTE_REGISTRY,
  getActiveGrammarModulesForCategory,
  getRegistryEntriesForCategory,
} from "../lib/taste/verticalTasteRegistry.ts";
import { isTasteGrammarApplyEnabled } from "../lib/taste/verticalTasteFlags.ts";
import { buildVerticalTasteShadowMeta } from "../lib/taste/verticalTasteShadow.ts";

const MOCK_PRODUCT = {
  title: "Omega Seamaster Automatic Swiss Mechanical Dress Watch",
  store: "Example",
  price: 1200,
  link: "https://example.com/watch",
};

let failed = 0;

function assert(name, ok, detail = "") {
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`OK ${name}`);
  }
}

// Registry architecture
assert("registry_has_watch_lane", VERTICAL_TASTE_REGISTRY.some((r) => r.grammarId === "luxury_watch_v1"));
assert(
  "registry_maps_category",
  getRegistryEntriesForCategory("watch").length >= 1
);
assert(
  "lazy_category_modules",
  getActiveGrammarModulesForCategory("watch").length === 1 &&
    getActiveGrammarModulesForCategory("fragrance").length === 1
);

// Phase 1 parity — intent functions unchanged path
const luxuryQuery = "luxury watch under 3000";
const c = buildCanonicalQuery(luxuryQuery);
const intentLegacy = luxuryWatchIntent01(c.semantic.envelope);
const intentGrammar = luxuryWatchGrammar.detectIntent(luxuryQuery, c).intent01;
assert(
  "luxury_intent_parity",
  Math.abs(intentLegacy - intentGrammar) < 0.001,
  `legacy=${intentLegacy} grammar=${intentGrammar}`
);
assert("has_luxury_intent", hasLuxuryWatchIntent(c.semantic.envelope));

// Contract surface
const lane = luxuryWatchGrammar.resolveGrammarLane(luxuryQuery, c);
assert("resolve_grammar_lane", lane != null, String(lane));
const listing = luxuryWatchGrammar.detectListingEvidence(MOCK_PRODUCT, c);
assert("listing_evidence_tier", listing.evidenceTier === "E1" || listing.evidenceTier === "E0");
const modifiers = luxuryWatchGrammar.computeTasteModifiers(luxuryQuery, MOCK_PRODUCT, c);
assert("taste_modifiers_shape", typeof modifiers.tasteFit01 === "number");

// Shadow mode — apply must stay off in CI/default
assert("apply_disabled", isTasteGrammarApplyEnabled() === false);

const shadow = buildVerticalTasteShadowMeta({
  query: luxuryQuery,
  canonicalQuery: c,
  products: [MOCK_PRODUCT, { ...MOCK_PRODUCT, title: "Samsung Galaxy Fit3 Fitness Tracker" }],
});
assert("shadow_active_luxury_watch", shadow.active === true, JSON.stringify(shadow));
assert("shadow_grammar_lane", shadow.grammarLane != null);
assert("shadow_taste_fit", shadow.tasteFit01 != null && shadow.tasteFit01 > 0);
assert("shadow_apply_off", shadow.applyEnabled === false);
assert("shadow_rows", shadow.rows.length >= 1);
assert(
  "shadow_fitness_violation",
  shadow.rows.some((r) => r.tasteViolations.includes("fitness_pollution")) ||
    shadow.tasteViolations.includes("fitness_pollution")
);
assert("shadow_latency_budget", shadow.latencyMs < 150, `${shadow.latencyMs}ms`);

// Inactive category — furniture stub should not activate
const desk = buildCanonicalQuery("minimal desk setup");
const shadowDesk = buildVerticalTasteShadowMeta({
  query: "minimal desk setup",
  canonicalQuery: desk,
  products: [MOCK_PRODUCT],
});
assert(
  "stub_category_inactive",
  shadowDesk.active === false || shadowDesk.intent01 < 0.42,
  JSON.stringify({ active: shadowDesk.active, intent01: shadowDesk.intent01 })
);

// Optional live shadow meta (requires P2.1 deploy on target)
const BASE = process.env.SEARCH_BASE_URL;
const LIVE_STRICT = process.env.TASTE_GRAMMAR_LIVE_STRICT === "true";
if (BASE) {
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(luxuryQuery)}`);
    const json = await res.json();
    const live = json?.data?.meta?.tasteGrammarShadow;
    if (!live) {
      const msg = "production missing tasteGrammarShadow — deploy P2.1 or unset SEARCH_BASE_URL";
      if (LIVE_STRICT) assert("live_shadow_meta_present", false, msg);
      else console.log(`SKIP live shadow: ${msg}`);
    } else {
      assert("live_shadow_meta_present", typeof live === "object");
      assert("live_apply_disabled", live.applyEnabled === false);
      assert("live_version", live.version === "vertical-taste-shadow-v1");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (LIVE_STRICT) assert("live_shadow_fetch", false, msg);
    else console.log(`SKIP live shadow fetch: ${msg}`);
  }
} else {
  console.log("SKIP live shadow (set SEARCH_BASE_URL + TASTE_GRAMMAR_LIVE_STRICT=true after deploy)");
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nVertical taste grammar shadow eval passed");
