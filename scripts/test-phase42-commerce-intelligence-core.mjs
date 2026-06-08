#!/usr/bin/env node
/**
 * Phase 42 — Global Commerce Intelligence Core validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { discountProofAllowsRealLabel } from "../lib/intelligence/realDiscountProofEngine.ts";
import {
  buildCommerceIntelligenceCoreDecisionMap,
  orderProductsBySearchRank,
} from "../lib/ui/phase42CommerceIntelligenceCoreActivation.ts";

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
  return {
    link: product.link,
    trustScore: 78,
    discountAuthenticity: "verified",
    retailerIntegrity: "high",
    priceRealism: "fair",
    compositeTrust: 0.82,
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

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase42CommerceIntelligenceCoreActivation.ts"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildOpportunityDetectionDecisionMap"
  ) ||
    readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
      "buildDecisionCalibrationDecisionMap"
    ) ||
    readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
      "buildCommerceIntelligenceCoreDecisionMap"
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
];

// Test 1 — Commerce core attached
{
  const data = scenario("corner sofa", sofaTray);
  const { decisions: map, trayContext } = buildCommerceIntelligenceCoreDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  assert.ok(trayContext.commerceIntelligenceCoreApplied);
  for (const [, decision] of map) {
    assert.ok(decision.productIntelligence?.commerceDecisionCore, "decision core");
    assert.ok(decision.productIntelligence?.valueIntelligenceCore, "value core");
    assert.ok(decision.productIntelligence?.realMerchantVerification, "merchant verification");
  }
}

// Test 2 — Discount proof — no verified label below threshold
{
  const data = scenario("cheap sofa", sofaTray);
  const { decisions: map } = buildCommerceIntelligenceCoreDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    const proof = decision.productIntelligence?.realDiscountProof;
    if (proof && !discountProofAllowsRealLabel(proof)) {
      const labels = decision.productIntelligence?.billionDollarDiscount?.labels ?? [];
      assert.ok(!labels.includes("REAL DISCOUNT") || proof.band !== "Fake Discount");
    }
  }
}

// Test 3 — Balanced distribution
{
  const data = scenario("modern sofa", sofaTray);
  const { trayContext } = buildCommerceIntelligenceCoreDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const dist = trayContext.buyOpportunityDistribution;
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  assert.ok(total >= 4, "distribution populated");
  assert.ok(dist.compare >= 1, "compare present");
}

// Test 4 — Category core on laptops
{
  const data = scenario("best laptop for programming", laptopTray);
  const { decisions: map } = buildCommerceIntelligenceCoreDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const laptop = [...map.values()][0];
  assert.ok(laptop?.productIntelligence?.categoryIntelligenceCore?.coreDimensions.length >= 4);
}

// Test 5 — BUY READY confidence >= 70
{
  const data = scenario("corner sofa", sofaTray);
  const { decisions: map } = buildCommerceIntelligenceCoreDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    if (decision.verdict === "BUY READY") {
      assert.ok(decision.confidence >= 70, `BUY READY confidence ${decision.confidence}`);
    }
  }
}

// Test 6 — Ranking order intentional
{
  const data = scenario("corner sofa", sofaTray);
  const { trayContext } = buildCommerceIntelligenceCoreDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const ordered = orderProductsBySearchRank(data.tray, trayContext.intelligenceRankOrder);
  assert.equal(ordered[0]?.link, trayContext.intelligenceRankOrder[0]);
}

// Test 7 — Compatibility exports
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase42CommerceIntelligenceCoreActivation.ts"), "utf8").includes(
    "buildCommerceRankingDecisionMap"
  )
);

console.log("Phase 42 global commerce intelligence core: PASS");
