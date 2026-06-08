#!/usr/bin/env node
/**
 * Phase 45 — Production Readiness validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildCategoryValueIntelligence } from "../lib/intelligence/categoryValueEngine.ts";
import { computeTrueValueIntelligence } from "../lib/intelligence/trueValueEngine.ts";
import {
  buildProductionReadinessDecisionMap,
  orderProductsBySearchRank,
} from "../lib/ui/phase45ProductionReadinessActivation.ts";
import { validateTraySafety } from "../lib/intelligence/productionSafetyEngine.ts";

const base = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
  image: "https://images.example.com/product.jpg",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount, tag) {
  return {
    ...base,
    id,
    link: `https://shop.example/${tag}/${id}`,
    title,
    store,
    price,
    oldPrice,
    rating,
    reviewsCount,
    priceTrend: price < oldPrice ? "down" : "stable",
  };
}

function trustFactory(product) {
  const trusted = /apple|ikea|amazon|dell|lenovo|wayfair|bol|hp|asus/i.test(`${product.store} ${product.title}`);
  return {
    link: product.link,
    trustScore: trusted ? 92 : 78,
    discountAuthenticity: "verified",
    retailerIntegrity: trusted ? "high" : "medium",
    priceRealism: "fair",
    compositeTrust: trusted ? 0.92 : 0.78,
  };
}

function scenario(query, tray) {
  const brief = {
    headline: "tray",
    recommendation: { label: "Top pick", title: tray[0].title, store: tray[0].store, link: tray[0].link, price: tray[0].price },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
    explanation: "Institutional brief.",
    buyReasoning: "Lead rationale.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: "Lead rationale.",
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product) => trustFactory(product)),
      },
    },
    decisionBrief: brief,
  });

  const coherenceMap = new Map(
    tray.map((product, rank) => [
      product.link,
      activateProductDecisionCoherence({ product, list: tray, rank, tray: trayCtx, searchQuery: query }),
    ])
  );

  const metaByLink = new Map(
    tray.map((product, rank) => [
      product.link,
      { price: product.price, rank, rating: product.rating, reviewsCount: product.reviewsCount, store: product.store },
    ])
  );

  const productsByLink = new Map(tray.map((product) => [product.link, { product, searchQuery: query }]));
  return { query, tray, coherenceMap, metaByLink, productsByLink };
}

function run(query, tray) {
  const data = scenario(query, tray);
  return buildProductionReadinessDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
}

function fileContains(path, needle) {
  return readFileSync(join(process.cwd(), path), "utf8").includes(needle);
}

assert.ok(fileContains("lib/ui/phase45ProductionReadinessActivation.ts", "buildProductionReadinessDecisionMap"));
assert.ok(fileContains("components/search/ProductResultsSurface.tsx", "buildProductionReadinessDecisionMap"));
assert.ok(fileContains("lib/intelligence/categoryValueEngine.ts", "sofaQualityScore"));
assert.ok(fileContains("lib/intelligence/trueValueEngine.ts", "trueValueScore"));
assert.ok(fileContains("lib/intelligence/decisionReasoningEngine.ts", "generateCategoryAwareReasoning"));

// Category value unit tests
{
  const sofa = listing(1, "Premium Leather Corner Sofa", "IKEA", 800, 999, 4.5, 120, "sofa");
  const cat = buildCategoryValueIntelligence({ product: sofa, searchQuery: "corner sofa" });
  assert.equal(cat.kind, "sofas");
  assert.ok(cat.sofaQualityScore >= 50 && cat.sofaQualityScore <= 100);

  const mac = listing(2, "MacBook Pro 14 M3 Pro 32GB 1TB", "Apple", 1999, 2199, 4.9, 400, "mbp");
  const macCat = buildCategoryValueIntelligence({ product: mac, searchQuery: "macbook pro" });
  assert.equal(macCat.kind, "macbooks");
  assert.ok(macCat.macbookQualityScore >= 70);
}

const sofaTray = [
  listing(1, "Premium Corner Sofa Grey", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(2, "Family Sectional Sofa", "Wayfair", 970, 1099, 4.4, 88, "mid"),
  listing(3, "Luxury Leather Sofa", "Made.com", 1299, 1399, 4.6, 62, "lux"),
  listing(4, "Budget Fabric Sofa", "Bol.com", 449, 499, 4.0, 200, "budget"),
  listing(5, "Scandinavian Sofa", "Leen Bakker", 999, 1199, 4.4, 75, "scandi"),
  listing(6, "Compact Sofa Bed", "Amazon", 649, 749, 4.2, 310, "compact"),
];

const laptopTray = [
  listing(1, "MacBook Air M1 16GB 512GB", "Apple", 1099, 1299, 4.8, 420, "mac"),
  listing(2, "Dell XPS 13 i7 16GB", "Dell", 999, 1199, 4.5, 180, "dell"),
  listing(3, "Lenovo ThinkPad Ryzen 16GB", "Lenovo", 849, 999, 4.4, 210, "lenovo"),
];

const macbookTray = [
  listing(1, "MacBook Pro 14 M3 Pro", "Apple", 1999, 2199, 4.9, 520, "mbp"),
  listing(2, "MacBook Air M2 16GB", "Apple", 1199, 1299, 4.8, 410, "mba"),
  listing(3, "MacBook Pro 16 M3 Max", "Apple", 2999, 3299, 4.9, 280, "mbp16"),
];

const iphoneTray = [
  listing(1, "iPhone 15 Pro 256GB", "Apple", 1099, 1199, 4.8, 890, "ip15p"),
  listing(2, "iPhone 15 128GB", "Apple", 799, 899, 4.7, 1200, "ip15"),
  listing(3, "iPhone 14 Pro 256GB", "Apple", 899, 1099, 4.6, 640, "ip14p"),
  listing(4, "iPhone 15 Pro Max 512GB", "Apple", 1299, 1399, 4.8, 510, "ip15pm"),
];

const categoryResults = {};

for (const entry of [
  ["sofas", sofaTray, "corner sofa"],
  ["laptops", laptopTray, "best laptop"],
  ["macbooks", macbookTray, "macbook pro"],
  ["iphones", iphoneTray, "iphone 15 pro"],
]) {
  const label = entry[0];
  const tray = entry[1];
  const query = entry[2];
  const { decisions: map, trayContext } = run(query, tray);
  const dist = trayContext.productionDistribution;
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  categoryResults[label] = dist;

  assert.ok(trayContext.productionReadinessApplied);
  assert.ok(trayContext.productionSafetyValidated);

  const buySignals = dist.buyReady + dist.strongBuy + dist.bestDeal;
  assert.ok(buySignals >= 1, `${label}: buy signals present`);
  assert.ok(dist.compare >= 1, `${label}: compare remains for average products`);

  const safety = validateTraySafety(map);
  assert.ok(safety.safe, `${label}: tray safety`);

  for (const [, decision] of map) {
    const intel = decision.productIntelligence;
    assert.ok(intel?.categoryValue, `${label}: categoryValue`);
    assert.ok(intel?.trueValue, `${label}: trueValue`);
    assert.ok(intel?.discountConfidence, `${label}: discountConfidence`);
    assert.ok(intel?.merchantReliability, `${label}: merchantReliability`);
    assert.ok(intel?.decisionReasoning?.primaryLine, `${label}: reasoning`);
    assert.ok(Number.isFinite(decision.confidence));
    assert.ok(Number.isFinite(intel.trueValue.trueValueScore));

    const tv = computeTrueValueIntelligence({
      marketOpportunityScore: 70,
      qualityScore: intel.categoryValue.qualityScore,
      merchantTrust: intel.merchantReliability.merchantReliabilityScore,
      discountVerified: true,
      discountConfidence: intel.discountConfidence.discountConfidence,
      confidence: decision.confidence,
      categoryValue: intel.categoryValue,
    });
    assert.ok(tv.trueValueScore >= 0 && tv.trueValueScore <= 100);
  }
}

{
  const data = scenario("corner sofa", sofaTray);
  const { trayContext } = buildProductionReadinessDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const ordered = orderProductsBySearchRank(data.tray, trayContext.intelligenceRankOrder);
  assert.equal(ordered[0]?.link, trayContext.intelligenceRankOrder[0]);
}

console.log("Phase 45 production readiness: PASS");
console.log("Category distribution:");
for (const [label, dist] of Object.entries(categoryResults)) {
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  console.log(
    `  ${label}: COMPARE ${dist.compare}/${total}, BUY READY ${dist.buyReady}/${total}, STRONG BUY ${dist.strongBuy}/${total}, BEST DEAL ${dist.bestDeal}/${total}`
  );
}
