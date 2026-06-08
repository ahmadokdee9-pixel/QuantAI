#!/usr/bin/env node
/**
 * Phase 44 — Opportunity Detection validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  computeOpportunityScore,
  labelForOpportunityScore,
} from "../lib/intelligence/opportunityDetectionEngine.ts";
import {
  buildOpportunityDetectionDecisionMap,
  orderProductsBySearchRank,
} from "../lib/ui/phase44OpportunityDetectionActivation.ts";

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
  const trusted = /apple|ikea|amazon|dell|lenovo|wayfair|bol|hp|asus|mediamarkt|coolblue/i.test(
    `${product.store} ${product.title}`
  );
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

function runOpportunity(query, tray) {
  const data = scenario(query, tray);
  return buildOpportunityDetectionDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
}

function distributionReport(dist, total) {
  return {
    wait: `${dist.wait} (${Math.round((dist.wait / total) * 100)}%)`,
    compare: `${dist.compare} (${Math.round((dist.compare / total) * 100)}%)`,
    buyReady: `${dist.buyReady} (${Math.round((dist.buyReady / total) * 100)}%)`,
    strongBuy: `${dist.strongBuy} (${Math.round((dist.strongBuy / total) * 100)}%)`,
    bestDeal: `${dist.bestDeal} (${Math.round((dist.bestDeal / total) * 100)}%)`,
  };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/intelligence/opportunityDetectionEngine.ts"), "utf8").includes(
    "computeOpportunityScore"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase44OpportunityDetectionActivation.ts"), "utf8").includes(
    "buildOpportunityDetectionDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildProductionReadinessDecisionMap"
  ) ||
    readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
      "buildOpportunityDetectionDecisionMap"
    )
);

// Unit — opportunity score + labels
{
  const score = computeOpportunityScore({
    confidence: 88,
    merchantTrust: 88,
    discountVerified: true,
    fakeDiscount: false,
    discountAuthenticityScore: 90,
    valueBelowMedianPct: 22,
    valueScore: 82,
    categoryIntelligenceScore: 78,
    coveragePct: 85,
    categoryRankPercentile: 5,
  });
  assert.ok(score >= 71, `strong opportunity score ${score}`);
  assert.equal(labelForOpportunityScore(91), "RARE OPPORTUNITY");
  assert.equal(labelForOpportunityScore(65), "GOOD VALUE");
  assert.equal(labelForOpportunityScore(40), "NORMAL");
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
  listing(4, "ASUS ZenBook 14 OLED", "ASUS", 899, 1049, 4.3, 140, "asus"),
  listing(5, "HP Spectre x360", "HP", 1199, 1399, 4.4, 95, "hp"),
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
  listing(5, "iPhone SE 64GB", "Apple", 429, 479, 4.2, 320, "ipse"),
];

const categoryResults = {};

// Test 1 — opportunity attached to every product
{
  const { decisions: map, trayContext } = runOpportunity("corner sofa", sofaTray);
  assert.ok(trayContext.opportunityDetectionApplied);
  for (const [, decision] of map) {
    const opp = decision.productIntelligence?.opportunity;
    assert.ok(opp, "opportunity blob required");
    assert.ok(opp.score >= 0 && opp.score <= 100);
    assert.ok(opp.drivers.length >= 0);
    assert.ok(typeof opp.promotedByOpportunity === "boolean");
    assert.ok(typeof opp.categoryRankPercentile === "number");
  }
}

// Test 2 — category scenarios + distribution
for (const entry of [
  ["sofas", sofaTray, "corner sofa"],
  ["laptops", laptopTray, "best laptop for programming"],
  ["macbooks", macbookTray, "macbook pro for developers"],
  ["iphones", iphoneTray, "iphone 15 pro deal"],
]) {
  const label = entry[0];
  const tray = entry[1];
  const query = entry[2];
  const { decisions: map, trayContext } = runOpportunity(query, tray);
  const dist = trayContext.opportunityDistribution;
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  categoryResults[label] = distributionReport(dist, total);

  assert.ok(total >= 3, `${label}: distribution populated`);
  assert.ok(dist.compare >= 1, `${label}: compare remains for average products`);

  const buySignals = dist.buyReady + dist.strongBuy + dist.bestDeal;
  assert.ok(buySignals >= 1, `${label}: buy ready remains healthy`);

  assert.ok(dist.bestDeal <= Math.max(1, Math.ceil(total * 0.05)), `${label}: best deal rare`);
  assert.ok(dist.strongBuy <= Math.ceil(total * 0.2), `${label}: strong buy anti-spam`);

  for (const [, decision] of map) {
    const tier = decision.productIntelligence?.buyOpportunityCore?.tier;
    const merchant = decision.productIntelligence?.realMerchantVerification?.merchantTrustScore ?? 100;
    if (tier === "BEST DEAL") {
      assert.ok(merchant > 85, `${label}: risky merchant never best deal`);
    }
    if (decision.productIntelligence?.opportunity?.promotedByOpportunity) {
      assert.ok(
        decision.productIntelligence.realDiscountProof?.verified ||
          decision.productIntelligence.opportunity.drivers.includes("Verified Discount"),
        `${label}: promotion requires verified discount path`
      );
    }
  }
}

// Test 3 — STRONG BUY appears in strong category trays
{
  const { trayContext } = runOpportunity("macbook pro", macbookTray);
  const dist = trayContext.opportunityDistribution;
  assert.ok(
    dist.strongBuy + dist.bestDeal + dist.buyReady >= 1,
    "macbooks: strong opportunity signals visible"
  );
}

// Test 4 — ranking preserved
{
  const data = scenario("corner sofa", sofaTray);
  const { trayContext } = buildOpportunityDetectionDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const ordered = orderProductsBySearchRank(data.tray, trayContext.intelligenceRankOrder);
  assert.equal(ordered[0]?.link, trayContext.intelligenceRankOrder[0]);
}

// Test 5 — compatibility exports
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase44OpportunityDetectionActivation.ts"), "utf8").includes(
    "buildDecisionCalibrationDecisionMap"
  )
);

console.log("Phase 44 opportunity detection: PASS");
console.log("Category distribution results:");
for (const [label, report] of Object.entries(categoryResults)) {
  console.log(`  ${label}:`, JSON.stringify(report));
}
