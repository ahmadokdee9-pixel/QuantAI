#!/usr/bin/env node
/**
 * Phase 39 — Commerce Decision Calibration validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buyerDecisionIsSpecific } from "../lib/intelligence/buyerDecisionIntelligenceEngine.ts";
import {
  allBuyReadyConfidenceAligned,
  buildCommerceCalibrationDecisionMap,
  calibratedVerdictDistribution,
} from "../lib/ui/phase39CommerceCalibrationActivation.ts";

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
    buyReasoning: "Lead listing clears analyst checks.",
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
  readFileSync(join(process.cwd(), "lib/ui/phase39CommerceCalibrationActivation.ts"), "utf8").includes(
    "buildCommerceCalibrationDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

const valueTray = [
  listing(1, "Premium Corner Sofa Grey", "IKEA", 800, 899, 4.5, 120, "best"),
  listing(2, "Family Sectional Sofa", "Wayfair", 970, 1099, 4.4, 88, "mid"),
  listing(3, "Luxury Leather Sofa", "Made.com", 1299, 1399, 4.6, 62, "lux"),
  listing(4, "Budget Fabric Sofa", "Bol.com", 449, 499, 4.0, 200, "budget"),
  listing(5, "Scandinavian Sofa", "Leen Bakker", 999, 1199, 4.4, 75, "scandi"),
  listing(6, "Compact Sofa Bed", "Amazon", 649, 749, 4.2, 310, "compact"),
];

// Test 1 — BUY READY confidence >= 70
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const authority = new Map(
    [...map.entries()].map(([link, d]) => [
      link,
      {
        link,
        verdict: d.verdict,
        commercePriorityLabel: d.productIntelligence?.commercePriorityLabel ?? "COMPARE",
        calibratedConfidence: d.productIntelligence?.calibratedConfidence ?? {
          confidence: d.confidence,
          band: d.verdict,
          aligned: true,
          reason: "",
        },
        opportunityV2: d.productIntelligence?.opportunityPriorityV2 ?? {
          version: 2,
          opportunityScore: 0,
          priceAdvantageComponent: 0,
          qualityAdvantageComponent: 0,
          merchantTrustComponent: 0,
          discountRealityComponent: 0,
          marketPositionComponent: 0,
          autoBuyReady: false,
          headline: "",
        },
        realDiscountV3: d.productIntelligence?.realDiscountValidationV3 ?? {
          version: 3,
          fakeDiscountScore: 0,
          realDiscountScore: 0,
          fakeDiscountScoreHigh: false,
          reasoning: "",
        },
        obviousWinner: false,
        closeToPeers: false,
        spreadScore: 0,
        rankIndex: 0,
        gapFromTop: 0,
        traySize: map.size,
      },
    ])
  );
  assert.ok(allBuyReadyConfidenceAligned(authority), "all BUY READY confidence >= 70");
  for (const [, decision] of map) {
    if (decision.verdict === "BUY READY") {
      assert.ok(decision.confidence >= 70, `BUY READY confidence ${decision.confidence} >= 70`);
    }
  }
}

// Test 2 — Buy-first distribution on value tray
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  const dist = calibratedVerdictDistribution(
    new Map(
      [...map.entries()].map(([link, d]) => [
        link,
        {
          link,
          verdict: d.verdict,
          commercePriorityLabel: d.productIntelligence?.commercePriorityLabel ?? "COMPARE",
          calibratedConfidence: d.productIntelligence?.calibratedConfidence ?? {
            confidence: d.confidence,
            band: d.verdict,
            aligned: true,
            reason: "",
          },
          opportunityV2: d.productIntelligence?.opportunityPriorityV2 ?? {
            version: 2,
            opportunityScore: 0,
            priceAdvantageComponent: 0,
            qualityAdvantageComponent: 0,
            merchantTrustComponent: 0,
            discountRealityComponent: 0,
            marketPositionComponent: 0,
            autoBuyReady: false,
            headline: "",
          },
          realDiscountV3: d.productIntelligence?.realDiscountValidationV3 ?? {
            version: 3,
            fakeDiscountScore: 0,
            realDiscountScore: 0,
            fakeDiscountScoreHigh: false,
            reasoning: "",
          },
          obviousWinner: false,
          closeToPeers: false,
          spreadScore: 0,
          rankIndex: 0,
          gapFromTop: 0,
          traySize: map.size,
        },
      ])
    )
  );
  const actionable = map.size - dist["INSUFFICIENT DATA"];
  const buyPct = dist["BUY READY"] / actionable;
  assert.ok(dist["BUY READY"] >= 2, "buy-first: multiple BUY READY");
  assert.ok(buyPct >= 0.4, "BUY READY share reasonable");
  assert.ok(dist.bestDealFound >= 1, "single best deal holder");
}

// Test 3 — WAIT has formatted explanation when present
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    if (decision.verdict === "WAIT") {
      const wait = decision.productIntelligence?.waitExplanation;
      assert.ok(wait?.formattedBlock.includes("Expected saving"), "wait has saving");
      assert.ok(wait?.formattedBlock.includes("Probability"), "wait has probability");
      assert.ok(wait?.formattedBlock.includes("Expected timeframe"), "wait has timeframe");
    }
  }
}

// Test 4 — Best place to buy V2 on every product
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    const best = decision.productIntelligence?.bestPlaceToBuyV2;
    assert.ok(best?.merchant, "best place v2 merchant");
    assert.ok(best?.destinationSummary, "best place v2 summary");
    assert.ok(best?.priceAdvantageLine, "price advantage line");
    assert.ok(best?.trustAdvantageLine, "trust advantage line");
  }
}

// Test 5 — Buyer decision intelligence is product-specific
{
  const data = scenario("best value sofa", valueTray);
  const { decisions: map } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    const intel = decision.productIntelligence?.buyerDecisionIntelligence;
    assert.ok(intel?.whereToBuy, "where to buy answered");
    assert.ok(intel?.verdictReason, "verdict reason present");
    assert.ok(buyerDecisionIsSpecific(intel.analystBlock), "reasoning is specific");
  }
}

// Test 6 — Real discount validation v3 attached
{
  const data = scenario("modern sofa", valueTray);
  const { decisions: map } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  for (const [, decision] of map) {
    const discount = decision.productIntelligence?.realDiscountValidationV3;
    assert.ok(discount?.version === 3, "real discount v3");
    assert.ok(typeof discount?.realDiscountScore === "number", "real discount score");
  }
}

// Test 7 — Calibration tray context
{
  const data = scenario("modern sofa", valueTray);
  const { trayContext } = buildCommerceCalibrationDecisionMap(
    data.coherenceMap,
    data.metaByLink,
    data.productsByLink
  );
  assert.ok(trayContext.calibrationApplied, "calibration applied flag");
  assert.ok(trayContext.marketCoverage.merchantsScanned >= 4, "market coverage preserved");
}

console.log("Phase 39 commerce decision calibration: PASS");
