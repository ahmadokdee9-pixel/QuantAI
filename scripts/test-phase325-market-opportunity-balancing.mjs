#!/usr/bin/env node
/**
 * Phase 32.5 — Market opportunity balancing validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  dominantVerdictShare,
  isBalancedTrayDistribution,
  trayMarketRoles,
  trayVerdictDistribution,
} from "../lib/ui/marketOpportunityBalancingEngine.ts";
import { buildCategoryReasoningDecisionMap } from "../lib/ui/phase32CategoryReasoningActivation.ts";
import { assignTrayVerdictAuthority } from "../lib/ui/decisionAlignmentEngine.ts";
import { buildBriefAuthorityDecisionMap } from "../lib/ui/phase31DecisionBriefActivation.ts";

const base = {
  extensions: [],
  image: "",
  availability: "In stock",
  shipping: "Free delivery",
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

function scenario(name, query, tray, trustFactory) {
  const brief = {
    headline: `${name} tray`,
    recommendation: {
      label: "Top pick",
      title: tray[0].title,
      store: tray[0].store,
      link: tray[0].link,
      price: tray[0].price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
    explanation: `${name} institutional brief.`,
    buyReasoning: "Lead listing clears analyst checks.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: `${name} lead rationale.`,
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product, index) => trustFactory(product, index)),
      },
    },
    decisionBrief: brief,
  });

  const coherenceMap = new Map(
    tray.map((product, rank) => [
      product.link,
      activateProductDecisionCoherence({
        product,
        list: tray,
        rank,
        tray: trayCtx,
        searchQuery: query,
      }),
    ])
  );

  const metaByLink = new Map(
    tray.map((product, rank) => [
      product.link,
      {
        price: product.price,
        rank,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        store: product.store,
      },
    ])
  );

  const productsByLink = new Map(
    tray.map((product) => [product.link, { product, searchQuery: query }])
  );

  return { name, coherenceMap, metaByLink, productsByLink };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/marketOpportunityBalancingEngine.ts"), "utf8").includes(
    "assignBalancedTrayVerdictAuthority"
  )
);

const sofaStores = ["IKEA", "Leen Bakker", "Bol.com", "Made.com", "Coolblue", "UnknownOutlet"];
const sofaTray = Array.from({ length: 30 }, (_, index) => {
  const store = sofaStores[index % sofaStores.length];
  const price = 499 + index * 27 + (index % 4) * 11;
  return listing(
    index + 1,
    `Modular Corner Sofa Grey Fabric ${index % 2 === 0 ? "L-shape deep seat" : "sectional"} model ${index + 1}`,
    store,
    price,
    price + 180,
    3.6 + (index % 12) * 0.08,
    20 + index * 17,
    "sofa"
  );
});

const sofaScenario = scenario(
  "Sofa30",
  "modular corner sofa grey fabric",
  sofaTray,
  (product) => ({
    link: product.link,
    trustScore: product.store === "UnknownOutlet" ? 36 : 68 + (product.price % 7),
    fakeDiscountRisk: product.store === "UnknownOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 520 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "UnknownOutlet",
  })
);

const briefMap = buildBriefAuthorityDecisionMap(
  sofaScenario.coherenceMap,
  sofaScenario.metaByLink,
  sofaScenario.productsByLink
);
const authority = assignTrayVerdictAuthority(briefMap);
const categoryMap = buildCategoryReasoningDecisionMap(
  sofaScenario.coherenceMap,
  sofaScenario.metaByLink,
  sofaScenario.productsByLink
);

assert.ok(isBalancedTrayDistribution(authority, 8), "30-product sofa tray is balanced");

const distribution = trayVerdictDistribution(authority);
const roles = trayMarketRoles(authority);
const dominant = dominantVerdictShare(authority);
const rows = [...categoryMap.values()];

assert.ok(distribution["BUY READY"] >= 1, "tray has BUY READY leader");
assert.ok(distribution.COMPARE >= 1, "tray has COMPARE opportunities");
assert.ok(distribution.WAIT >= 1, "tray has WAIT opportunities");
assert.ok(distribution.WAIT / 30 <= 0.45, "WAIT does not overwhelm tray");
assert.ok(dominant.share <= 0.55, "no single verdict dominates actionable tray");
assert.ok(roles.trayLeader, "tray leader identified");
assert.ok(roles.strongestCompare, "strongest compare identified");
assert.ok(roles.weakestValue, "weakest value identified");

for (const row of rows) {
  assert.ok(
    row.productIntelligence?.alignmentFlags?.includes("phase325_market_opportunity_balanced"),
    "category map carries phase325 balancing flag"
  );
}

console.log("phase325-market-opportunity-balancing: ok");
console.log(
  JSON.stringify({
    distribution,
    roles,
    dominant,
    sampleVerdicts: rows.slice(0, 5).map((row) => ({
      verdict: row.verdict,
      thesis: row.decisionThesis,
    })),
  })
);
