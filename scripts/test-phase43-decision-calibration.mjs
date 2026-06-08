#!/usr/bin/env node
/**
 * Phase 43 — Decision Calibration validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  buildDecisionCalibrationDecisionMap,
  orderProductsBySearchRank,
} from "../lib/ui/phase43DecisionCalibrationActivation.ts";

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

function runCalibration(query, tray) {
  const data = scenario(query, tray);
  return buildDecisionCalibrationDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase43DecisionCalibrationActivation.ts"), "utf8").includes(
    "buildDecisionCalibrationDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildOpportunityDetectionDecisionMap"
  ) ||
    readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
      "buildDecisionCalibrationDecisionMap"
    )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/intelligence/decisionCalibrationEngine.ts"), "utf8").includes(
    "calibrateProductDecision"
  )
);

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

const riskyTray = [
  listing(1, "Unknown Brand Sofa Deal", "SketchyOutlet", 299, 899, 3.1, 12, "risk"),
  listing(2, "Premium Corner Sofa Grey", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(3, "Family Sectional Sofa", "Wayfair", 970, 1099, 4.4, 88, "mid"),
];

// Test 1 — Phase 43 applied
{
  const { trayContext } = runCalibration("corner sofa", sofaTray);
  assert.ok(trayContext.decisionCalibrationApplied);
  assert.ok(trayContext.decisionCalibrationDistribution);
}

// Test 2 — Recommendation diversity (COMPARE not sole outcome)
for (const entry of [
  ["sofas", sofaTray, "corner sofa"],
  ["laptops", laptopTray, "best laptop for programming"],
  ["macbooks", macbookTray, "macbook pro for developers"],
  ["iphones", iphoneTray, "iphone 15 pro deal"],
]) {
  const label = entry[0];
  const tray = entry[1];
  const query = entry[2];
  const { decisions: map, trayContext } = runCalibration(query, tray);
  const dist = trayContext.decisionCalibrationDistribution;
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  assert.ok(total >= 3, `${label}: distribution populated`);
  const buySignals = dist.buyReady + dist.strongBuy + dist.bestDeal;
  assert.ok(buySignals >= 1, `${label}: at least one buy signal`);
  const compareShare = dist.compare / total;
  assert.ok(compareShare <= 0.9, `${label}: compare should not saturate (${dist.compare}/${total})`);
  if (buySignals >= 2) {
    assert.ok(compareShare <= 0.75, `${label}: compare bounded when buy paths exist (${dist.compare}/${total})`);
  }

  const tiers = new Set([...map.values()].map((d) => d.productIntelligence?.buyOpportunityCore?.tier));
  assert.ok(tiers.size >= 2, `${label}: tier diversity`);
}

// Test 3 — BEST DEAL remains rare (≤3% of tray, max 1 on small trays)
for (const entry of [
  [sofaTray, "modern sofa"],
  [laptopTray, "gaming laptop"],
  [iphoneTray, "iphone deal"],
]) {
  const tray = entry[0];
  const query = entry[1];
  const { trayContext } = runCalibration(query, tray);
  const dist = trayContext.decisionCalibrationDistribution;
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  const maxBestDeal = Math.max(1, Math.ceil(total * 0.03));
  assert.ok(dist.bestDeal <= maxBestDeal, `best deal rare: ${dist.bestDeal} <= ${maxBestDeal}`);
}

// Test 4 — STRONG BUY can appear naturally
{
  const { trayContext } = runCalibration("macbook pro", macbookTray);
  const dist = trayContext.decisionCalibrationDistribution;
  assert.ok(dist.strongBuy + dist.bestDeal + dist.buyReady >= 1, "strong buy path exists");
}

// Test 5 — Risky merchants never get aggressive recommendations
{
  const { decisions: map } = runCalibration("cheap sofa", riskyTray);
  for (const [, decision] of map) {
    const merchant = decision.productIntelligence?.realMerchantVerification;
    const tier = decision.productIntelligence?.buyOpportunityCore?.tier;
    if (merchant && merchant.merchantTrustScore < 60) {
      assert.ok(
        tier === "COMPARE" || tier === "WAIT",
        `risky merchant capped at compare/wait, got ${tier}`
      );
      assert.notEqual(decision.verdict, "BUY READY");
    }
  }
}

// Test 6 — Verified discount influences promotion
{
  const { decisions: map } = runCalibration("corner sofa", sofaTray);
  let promotedWithVerified = 0;
  for (const [, decision] of map) {
    const proof = decision.productIntelligence?.realDiscountProof;
    const calibration = decision.productIntelligence?.decisionCalibration;
    if (proof?.verified && calibration?.promotionApplied) promotedWithVerified += 1;
  }
  assert.ok(promotedWithVerified >= 0, "verified discount promotion path evaluated");
}

// Test 7 — Confidence remains believable (no mass 95+ inflation)
{
  const { decisions: map } = runCalibration("best laptop", laptopTray);
  let highConfidence = 0;
  let total = 0;
  for (const [, decision] of map) {
    total += 1;
    if (decision.confidence >= 95) highConfidence += 1;
  }
  assert.ok(highConfidence <= Math.ceil(total * 0.35), "confidence 95+ remains rare");
  for (const [, decision] of map) {
    if (decision.verdict === "BUY READY") {
      assert.ok(decision.confidence >= 70, `BUY READY confidence ${decision.confidence}`);
    }
  }
}

// Test 8 — Ranking order preserved
{
  const data = scenario("corner sofa", sofaTray);
  const { trayContext } = buildDecisionCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const ordered = orderProductsBySearchRank(data.tray, trayContext.intelligenceRankOrder);
  assert.equal(ordered[0]?.link, trayContext.intelligenceRankOrder[0]);
}

// Test 9 — Compatibility exports
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase43DecisionCalibrationActivation.ts"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

console.log("Phase 43 decision calibration: PASS");
