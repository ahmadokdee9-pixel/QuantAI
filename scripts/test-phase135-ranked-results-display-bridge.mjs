#!/usr/bin/env node
/**
 * Phase 13.5 — Ranked Results Display Bridge tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyRankedResultsDisplayBridge,
  isExecutedRankingActive,
} from "../lib/ranking/rankedResultsDisplayBridge.ts";

function makeProduct(id, qiRank, linkSuffix) {
  return {
    id,
    title: `Product ${id}`,
    store: "Example Store",
    price: id * 10,
    displayPrice: `$${id * 10}`,
    rating: 4.5,
    link: `https://store.example/${linkSuffix}`,
    image: `https://cdn.example/${id}.jpg`,
    reviewsCount: 100,
    shipping: "Free",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
    qiRank,
  };
}

const executedRankingActive = {
  version: "phase13.4-v1",
  executed: true,
  candidateCount: 3,
  rerankedCount: 2,
  executionConfidence: 0.72,
  executionMode: "ready",
  rankingChanges: [],
  rankingSummary: "Controlled ranking executed in ready mode (HIGH tier) with 2 reranked products at confidence 0.72.",
  rankingWarnings: [],
};

const executedRankingInactive = {
  ...executedRankingActive,
  executed: false,
  rerankedCount: 0,
};

// ── Route + UI wiring guards ───────────────────────────────────────────────────
const page = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
assert.ok(page.includes("applyRankedResultsDisplayBridge"), "home page uses display bridge");
assert.ok(page.includes("isExecutedRankingActive"), "home page checks executed ranking state");
assert.ok(page.includes("searchMeta?.executedRanking"), "home page consumes executedRanking meta only");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("applyRankedResultsDisplayBridge"), "stabilization checks display bridge");

const resultsSurface = readFileSync(
  join(process.cwd(), "components", "search", "ProductResultsSurface.tsx"),
  "utf8"
);
assert.ok(!resultsSurface.includes("phase13.5"), "ProductResultsSurface has no phase 13.5 redesign");
assert.ok(!resultsSurface.includes("rankedResultsDisplayBridge"), "display bridge stays in page layer");

// ── Bridge isolation guards ──────────────────────────────────────────────────
const bridgeSrc = readFileSync(
  join(process.cwd(), "lib/ranking/rankedResultsDisplayBridge.ts"),
  "utf8"
);
assert.ok(bridgeSrc.includes("ExecutedRankingMeta"), "bridge typed against executedRanking");
assert.ok(!bridgeSrc.includes("@/lib/intelligence/"), "bridge does not import Phase 12 intelligence");
assert.ok(!bridgeSrc.includes("rankingExecution"), "bridge does not consume rankingExecution");
assert.ok(!bridgeSrc.includes("productRanking"), "bridge does not consume productRanking");
assert.ok(!bridgeSrc.includes("Math.random"), "no randomization");

// ── Active flag ────────────────────────────────────────────────────────────────
assert.equal(isExecutedRankingActive(executedRankingActive), true);
assert.equal(isExecutedRankingActive(executedRankingInactive), false);
assert.equal(isExecutedRankingActive(null), false);
assert.equal(isExecutedRankingActive(undefined), false);

// ── Executed ranking orders by qiRank ──────────────────────────────────────────
const scrambled = [
  makeProduct(101, 2, "weak"),
  makeProduct(102, 0, "strong"),
  makeProduct(103, 1, "mid"),
];

const rankedDisplay = applyRankedResultsDisplayBridge({
  products: scrambled,
  executedRanking: executedRankingActive,
});

assert.deepEqual(
  rankedDisplay.map((product) => product.id),
  [102, 103, 101],
  "executed ranking displays products in qiRank order"
);
assert.deepEqual(
  rankedDisplay.map((product) => product.qiRank),
  [0, 1, 2],
  "qiRank values preserved after ordering"
);

// ── Fallback preserves original order ────────────────────────────────────────
const fallbackDisplay = applyRankedResultsDisplayBridge({
  products: scrambled,
  executedRanking: executedRankingInactive,
});

assert.deepEqual(
  fallbackDisplay.map((product) => product.id),
  [101, 102, 103],
  "non-executed ranking preserves original product order"
);
assert.equal(fallbackDisplay, scrambled, "non-executed path returns same array reference");

// ── Product data preserved ───────────────────────────────────────────────────
assert.equal(rankedDisplay.length, scrambled.length, "product count unchanged");
for (const product of rankedDisplay) {
  const source = scrambled.find((entry) => entry.id === product.id);
  assert.ok(source, "product preserved in tray");
  assert.equal(product.link, source.link, "link preserved");
  assert.equal(product.price, source.price, "price preserved");
  assert.equal(product.image, source.image, "image preserved");
  assert.equal(product.displayPrice, source.displayPrice, "display price preserved");
  assert.equal(product.store, source.store, "merchant preserved");
}

// ── Deterministic repeatability ────────────────────────────────────────────────
assert.deepEqual(
  applyRankedResultsDisplayBridge({ products: scrambled, executedRanking: executedRankingActive }),
  applyRankedResultsDisplayBridge({ products: scrambled, executedRanking: executedRankingActive }),
  "deterministic output"
);

// ── Does not mutate source array ───────────────────────────────────────────────
const beforeOrder = scrambled.map((product) => product.id);
applyRankedResultsDisplayBridge({ products: scrambled, executedRanking: executedRankingActive });
assert.deepEqual(
  scrambled.map((product) => product.id),
  beforeOrder,
  "source array order unchanged"
);

// ── Missing qiRank sinks to end when executed ──────────────────────────────────
const partialRank = [
  makeProduct(201, 1, "b"),
  makeProduct(202, undefined, "a"),
  makeProduct(203, 0, "c"),
];
const partialOrdered = applyRankedResultsDisplayBridge({
  products: partialRank,
  executedRanking: executedRankingActive,
});
assert.deepEqual(
  partialOrdered.map((product) => product.id),
  [203, 201, 202],
  "products without qiRank fall back to end when ranking executed"
);

console.log("phase135-ranked-results-display-bridge: ok");
