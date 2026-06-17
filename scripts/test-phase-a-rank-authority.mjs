#!/usr/bin/env node
/**
 * Phase A — Rank authority regression lock.
 * Ensures one canonical trust order across API, brief, grid, and compare surfaces.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { alignDecisionBriefToCanonicalWinner } from "../lib/intelligence/decisionBriefEngine.ts";
import { buildCompareTrayInsights } from "../lib/intelligence/compareTrayInsights.ts";
import { resolveCanonicalSearchRank } from "../lib/truth/canonicalSearchRank.ts";
import { runGoldenRankingBenchmarks } from "../lib/truth/rankingValidation.ts";
import { resolveUnifiedSearchIntent } from "../lib/truth/unifiedIntentPipeline.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(route.includes("resolveCanonicalSearchRank"), "API uses canonical rank");
assert.ok(route.includes("alignDecisionBriefToCanonicalWinner"), "API aligns decision brief");
assert.ok(route.includes("products = canonicalRank.orderedProducts"), "API products follow trust order");
assert.ok(route.includes("createTrayOrderLock"), "API locks tray order before canonical rank");
assert.ok(route.includes("trayOrderLock.preserve"), "telemetry stages preserve order");
assert.ok(route.includes("filterRecommendationTray(trayOrderLock.baseline())"), "outlier filter before canonical on server");
pass("api_canonical_rank_wired");

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("trustOrderedProducts"), "client uses single trustOrderedProducts memo");
assert.ok(!surface.includes("compositeRanked"), "no split compositeRanked authority");
assert.ok(!surface.includes("intelligenceRankedProducts"), "no split intelligenceRankedProducts authority");
pass("client_single_order_memo");

const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
assert.ok(page.includes('sort === "value"'), "default value sort preserves server order");
assert.ok(!page.includes("sortByCompositeRankEnhanced"), "no client re-sort on default path");
const valueBlock = page.match(/if \(sort === "value" \|\| !sort\) \{[\s\S]*?return applyResultsFilters\(products, filters\);/);
assert.ok(valueBlock, "default value block found");
assert.ok(!valueBlock[0].includes("filterRecommendationTray"), "default value path does not apply client outlier filter");
assert.ok(!valueBlock[0].includes("dedupeSearchTray"), "default value path does not dedupe client tray");
pass("page_preserves_server_order");

const gamingQuery = "best gaming laptop under 1500 euro";
const gamingIntent = resolveUnifiedSearchIntent(gamingQuery);
assert.equal(gamingIntent.purchaseIntent, "value", "cap + quality query uses value intent");
assert.equal(gamingIntent.commerceIntents.cheapestTrusted, false, "budget cap alone does not set cheapestTrusted");
pass("budget_intent_calibration");

const benchProducts = [
  {
    id: 1,
    title: "ASUS ROG Strix G16 RTX 4070 Gaming Laptop",
    link: "https://bench/gaming-laptop",
    store: "Amazon.com",
    price: 1399,
    displayPrice: "€1399",
    rating: 4.7,
    image: "",
    reviewsCount: 420,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: ["Gaming"],
  },
  {
    id: 2,
    title: "Dell XPS 13 Ultrabook",
    link: "https://bench/xps13",
    store: "Amazon.com",
    price: 1399,
    displayPrice: "€1399",
    rating: 4.5,
    image: "",
    reviewsCount: 200,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
  },
];

const canonical = resolveCanonicalSearchRank(benchProducts, gamingQuery);
assert.equal(canonical.orderedProducts[0]?.link, "https://bench/gaming-laptop");
pass("canonical_rank_gaming_laptop");

const brief = alignDecisionBriefToCanonicalWinner(
  {
    headline: "QuantAI Recommendation",
    recommendation: {
      label: "Best Overall",
      title: "Wrong Pick",
      store: "Amazon.com",
      link: "https://bench/xps13",
      price: 1399,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 80,
    sparseTrayWarning: null,
  },
  canonical.orderedProducts[0],
  canonical.orderedProducts
);
assert.equal(brief?.recommendation.link, canonical.orderedProducts[0]?.link);
pass("decision_brief_matches_trust_one");

const compareLines = buildCompareTrayInsights(
  [canonical.orderedProducts[0], canonical.orderedProducts[1]],
  canonical.orderedProducts
);
assert.equal(compareLines[0]?.id, "grid-leader");
assert.ok(compareLines[0]?.body.includes(canonical.orderedProducts[0].title.slice(0, 20)));
pass("compare_leader_equals_grid_one");

const golden = runGoldenRankingBenchmarks();
const goldenPass = golden.filter((row) => row.pass).length;
assert.equal(goldenPass, golden.length, `golden benchmarks ${goldenPass}/${golden.length}`);
pass("golden_benchmarks_pass");

for (const link of canonical.orderLinks) {
  const index = canonical.orderedProducts.findIndex((product) => product.link === link);
  assert.equal(index, canonical.orderLinks.indexOf(link), "orderLinks matches orderedProducts");
}
pass("api_order_links_consistent");

const hardTray = [
  {
    id: 1,
    title: "Dell XPS 13 Ultrabook Business Laptop",
    link: "https://audit/mismatch",
    store: "Amazon.com",
    price: 999,
    displayPrice: "€999",
    rating: 4.5,
    image: "",
    reviewsCount: 200,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
  },
  {
    id: 2,
    title: "ASUS ROG Strix G16 RTX 4070 Gaming Laptop",
    link: "https://audit/match",
    store: "Amazon.com",
    price: 1299,
    displayPrice: "€1299",
    rating: 4.7,
    image: "",
    reviewsCount: 420,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: ["Gaming", "RTX 4070"],
  },
];
const hardRank = resolveCanonicalSearchRank(hardTray, "best gaming laptop");
assert.equal(hardRank.orderedProducts[0]?.link, "https://audit/match");
pass("hard_constraint_gaming_mismatch_demoted");

const budgetTray = [
  {
    id: 1,
    title: "ASUS ROG Strix Scar RTX 4090 Gaming Laptop",
    link: "https://audit/over",
    store: "Amazon.com",
    price: 1600,
    displayPrice: "€1600",
    rating: 4.9,
    image: "",
    reviewsCount: 2000,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: 2500,
    priceTrend: "down",
    extensions: ["Gaming", "RTX 4090"],
  },
  {
    id: 2,
    title: "Entry Gaming Laptop RTX 4060",
    link: "https://audit/in",
    store: "Amazon.com",
    price: 1490,
    displayPrice: "€1490",
    rating: 4.2,
    image: "",
    reviewsCount: 80,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: ["Gaming"],
  },
];
const budgetRank = resolveCanonicalSearchRank(budgetTray, "gaming laptop under 1500 euro");
assert.equal(budgetRank.orderedProducts[0]?.link, "https://audit/in");
pass("budget_over_cap_demoted_when_in_cap_exists");

console.log(`\nPhase A rank authority: ${passed} checks passed.`);
