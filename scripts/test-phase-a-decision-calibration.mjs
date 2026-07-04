#!/usr/bin/env node
/**
 * Universal decision calibration regression — category-agnostic policy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCompareTrayInsights } from "../lib/intelligence/compareTrayInsights.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildProductionReadinessDecisionMap } from "../lib/ui/phase45ProductionReadinessActivation.ts";
import { resolveCanonicalSearchRank } from "../lib/truth/canonicalSearchRank.ts";
import {
  applyCanonicalDecisionCalibration,
  applyTrayCanonicalDecisionCalibration,
  detectHardConstraintMismatch,
  hasFlatLabelCluster,
  hasFlatThirtyPercentCluster,
  summarizeCalibrationLabels,
  syncCalibratedBriefRecommendationLabel,
} from "../lib/ui/canonicalDecisionCalibration.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

function baseRecord(overrides = {}) {
  return {
    version: 1,
    link: overrides.link ?? "https://example.com/a",
    finalRankScore: overrides.finalRankScore ?? 88,
    baseScore: overrides.baseScore ?? 72,
    truthDelta: overrides.truthDelta ?? 8,
    compositeBreakdown: {
      relevance: overrides.relevance ?? 72,
      trust: overrides.trust ?? 68,
      recommendation: overrides.recommendation ?? 70,
      taste: 55,
      motivation: 50,
      constraints: overrides.constraints ?? 0,
      decision: 60,
    },
    layers: overrides.layers ?? [],
    whyRanked: overrides.whyRanked ?? "Strong trust and match for this query.",
    influencedLayers: [],
    evidenceChain: overrides.evidenceChain ?? [
      "Strong query relevance",
      "No major mismatch detected",
    ],
  };
}

function mockDecision(args = {}) {
  const link = args.link ?? "https://example.com/a";
  const record = baseRecord({ link, ...args.record });
  const overallMatch = args.overallMatch ?? record.compositeBreakdown.relevance;
  const foundation = args.foundation ?? {
    productMatch: {
      overallMatchScore: overallMatch,
      intentMatchScore: overallMatch,
      strongestMismatchReason: "No major mismatch detected",
    },
    purchaseConstraints: { hardRequirements: [] },
    recommendationIntelligence: { recommendationTier: "RECOMMENDED" },
    productReasoning: { recommendationStrength: "GOOD" },
  };

  return {
    link,
    verdict: "COMPARE",
    confidence: 30,
    confidenceReason: "legacy",
    reasonLine: "legacy reason",
    reasonAuthority: { source: "test", confidence: 0.5 },
    displayChips: [],
    summaryLines: ["legacy", "legacy"],
    alternativePressureScore: 0,
    buyerAuthority: 0,
    productIntelligence: {
      rankingDecisionRecord: record,
      truthFoundation: foundation,
      realDiscountProof: args.realDiscountProof ?? null,
      discountConfidence: args.discountConfidence ?? null,
      globalPriceIntelligence: args.globalPriceIntelligence ?? null,
      trueValue: args.trueValue ?? null,
      categoryValue: args.categoryValue ?? null,
      merchantReliability: args.merchantReliability ?? { merchantReliabilityScore: record.compositeBreakdown.trust },
      commerceDecisionCore: {
        version: 1,
        tier: "COMPARE",
        verdict: "COMPARE",
        decisionConfidence: 30,
        compositeScore: 70,
        valueScore: 70,
        merchantTrustScore: 70,
        discountAuthenticityScore: 70,
        marketCoverageScore: 70,
        alternativeAdvantageScore: 70,
        categoryIntelligenceScore: 70,
        executiveWouldBuy: false,
        reasoning: "legacy",
      },
      buyOpportunityCore: {
        version: 1,
        tier: "COMPARE",
        verdict: "COMPARE",
        distribution: { wait: 0, compare: 1, buyReady: 0, strongBuy: 0, bestDeal: 0 },
        executivePass: false,
        reasoning: "legacy",
      },
    },
  };
}

const listingBase = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
  image: "https://images.example.com/p.jpg",
  rating: 4.6,
  reviewsCount: 400,
  priceTrend: "stable",
};

function listing(id, title, store, price, tag) {
  return {
    ...listingBase,
    id,
    link: `https://shop.example/${tag}/${id}`,
    title,
    store,
    price,
    displayPrice: `€${price}`,
    oldPrice: price + 120,
  };
}

function runPipeline(query, tray) {
  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: "Test.",
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product) => ({
          link: product.link,
          trustScore: 88,
          discountAuthenticity: "verified",
          retailerIntegrity: "high",
          priceRealism: "fair",
          compositeTrust: 0.88,
        })),
      },
    },
    decisionBrief: null,
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
      {
        price: product.price,
        rank,
        rating: product.rating,
        reviewsCount: product.reviewsCount ?? 0,
        store: product.store,
      },
    ])
  );
  const productsByLink = new Map(tray.map((product) => [product.link, { product, searchQuery: query }]));
  const canonical = resolveCanonicalSearchRank(tray, query);
  return buildProductionReadinessDecisionMap(
    coherenceMap,
    metaByLink,
    productsByLink,
    null,
    null,
    canonical.orderLinks
  );
}

// 1 — Top valid product cannot be AVOID
{
  const leader = applyCanonicalDecisionCalibration(
    mockDecision({
      link: "https://leader",
      overallMatch: 68,
      record: { finalRankScore: 90, truthDelta: 8, relevance: 58, trust: 66 },
      foundation: {
        productMatch: {
          overallMatchScore: 68,
          intentMatchScore: 70,
          strongestMismatchReason: "No major mismatch detected",
        },
        purchaseConstraints: { hardRequirements: [] },
        recommendationIntelligence: { recommendationTier: "NOT_RECOMMENDED" },
        productReasoning: { recommendationStrength: "CAUTION" },
      },
    }),
    { rankIndex: 0, traySize: 4, topFinalScore: 90, gapToLeader: 0, leaderGapToSecond: 6 }
  );
  assert.notEqual(leader.recommendationLabel, "AVOID", "rank #1 must not be AVOID");
  pass("top_valid_not_avoid");
}

// 2 — Strong relevance + no hard mismatch cannot be AVOID
{
  const row = mockDecision({
    overallMatch: 64,
    record: { relevance: 56, trust: 62, finalRankScore: 80 },
    foundation: {
      productMatch: {
        overallMatchScore: 64,
        intentMatchScore: 66,
        strongestMismatchReason: "No major mismatch detected",
      },
      purchaseConstraints: { hardRequirements: [] },
      recommendationIntelligence: { recommendationTier: "CONSIDER" },
      productReasoning: { recommendationStrength: "CAUTION" },
    },
  });
  assert.equal(detectHardConstraintMismatch(row), false);
  const calibrated = applyCanonicalDecisionCalibration(row, {
    rankIndex: 1,
    traySize: 4,
    topFinalScore: 88,
    gapToLeader: 8,
    leaderGapToSecond: 7,
  });
  assert.notEqual(calibrated.recommendationLabel, "AVOID");
  pass("strong_relevance_not_avoid");
}

// 3 — Wrong product type must be AVOID
{
  const mismatch = mockDecision({
    overallMatch: 32,
    foundation: {
      productMatch: {
        overallMatchScore: 32,
        intentMatchScore: 30,
        strongestMismatchReason: "Wrong product category for gaming query",
      },
      purchaseConstraints: { hardRequirements: [] },
      recommendationIntelligence: { recommendationTier: "NOT_RECOMMENDED" },
      productReasoning: { recommendationStrength: "WEAK" },
    },
    record: {
      finalRankScore: 48,
      relevance: 34,
      trust: 40,
      evidenceChain: ["Wrong product category for gaming query"],
    },
  });
  assert.ok(detectHardConstraintMismatch(mismatch));
  const calibrated = applyCanonicalDecisionCalibration(mismatch, {
    rankIndex: 3,
    traySize: 4,
    topFinalScore: 90,
    gapToLeader: 42,
    leaderGapToSecond: 8,
  });
  assert.equal(calibrated.recommendationLabel, "AVOID");
  pass("wrong_type_avoid");
}

// 4 — Over-budget item demoted (AVOID or COMPARE, not BUY)
{
  const over = mockDecision({
    overallMatch: 50,
    record: {
      finalRankScore: 62,
      relevance: 48,
      trust: 58,
      evidenceChain: ["Over budget vs hard cap", "Strong query relevance"],
    },
    foundation: {
      productMatch: { overallMatchScore: 50, intentMatchScore: 48, strongestMismatchReason: "No major mismatch detected" },
      purchaseConstraints: { hardRequirements: ["budget cap: 500"] },
      recommendationIntelligence: { recommendationTier: "CONSIDER" },
      productReasoning: { recommendationStrength: "CAUTION" },
    },
  });
  assert.ok(detectHardConstraintMismatch(over));
  const calibrated = applyCanonicalDecisionCalibration(over, {
    rankIndex: 2,
    traySize: 4,
    topFinalScore: 88,
    gapToLeader: 26,
    leaderGapToSecond: 7,
  });
  assert.ok(calibrated.recommendationLabel === "AVOID" || calibrated.recommendationLabel === "COMPARE");
  assert.notEqual(calibrated.recommendationLabel, "BUY");
  pass("over_budget_not_buy");
}

// 5 — Valid alternatives become COMPARE
{
  const alt = applyCanonicalDecisionCalibration(
    mockDecision({
      link: "https://alt",
      overallMatch: 58,
      record: { finalRankScore: 78, relevance: 54, trust: 60, truthDelta: 3 },
    }),
    { rankIndex: 1, traySize: 4, topFinalScore: 86, gapToLeader: 8, leaderGapToSecond: 7 }
  );
  assert.equal(alt.recommendationLabel, "COMPARE");
  pass("valid_alternative_compare");
}

// 6 — Clear winner becomes BUY or STRONG BUY
{
  const winner = applyCanonicalDecisionCalibration(
    mockDecision({
      link: "https://winner",
      overallMatch: 76,
      record: { finalRankScore: 94, truthDelta: 11, relevance: 72, trust: 74 },
    }),
    { rankIndex: 0, traySize: 4, topFinalScore: 94, gapToLeader: 0, leaderGapToSecond: 9 }
  );
  assert.ok(["BUY", "STRONG BUY", "BEST VALUE"].includes(winner.recommendationLabel ?? ""));
  assert.ok(winner.confidence >= 68);
  pass("clear_winner_buy");
}

// 7 — Confidence not flat 30/35 on normal trays
{
  const order = ["https://a", "https://b", "https://c"];
  const decisions = new Map([
    ["https://a", mockDecision({ link: "https://a", record: { finalRankScore: 91, truthDelta: 9, relevance: 75, trust: 70 } })],
    ["https://b", mockDecision({ link: "https://b", record: { finalRankScore: 83, truthDelta: 4, relevance: 68, trust: 66 } })],
    ["https://c", mockDecision({ link: "https://c", record: { finalRankScore: 74, truthDelta: 1, relevance: 62, trust: 58 } })],
  ]);
  const tray = applyTrayCanonicalDecisionCalibration(decisions, order);
  const confidences = order.map((link) => tray.get(link)?.confidence ?? 0);
  assert.ok(!hasFlatThirtyPercentCluster(confidences, 2));
  assert.ok(confidences.every((c) => c !== 30 && c !== 35));
  assert.ok(Math.max(...confidences) - Math.min(...confidences) >= 8);
  pass("confidence_spread");
}

// 8 — Sofa/furniture mixed logical decisions
{
  const sofaTray = [
    listing(1, "Premium Corner Sofa Grey", "IKEA", 800, "sofa"),
    listing(2, "Family Sectional Sofa", "Wayfair", 970, "sofa"),
    listing(3, "Luxury Leather Corner Sofa", "Made.com", 1299, "sofa"),
    listing(4, "Budget Fabric Sofa", "Bol.com", 449, "sofa"),
  ];
  const { decisions } = runPipeline("corner sofa", sofaTray);
  const order = resolveCanonicalSearchRank(sofaTray, "corner sofa").orderLinks;
  const { counts, confidences } = summarizeCalibrationLabels(decisions, order);
  assert.ok(counts.AVOID < order.length, "sofa tray should not be all AVOID");
  assert.ok(counts.COMPARE + counts.BUY + counts["STRONG BUY"] + counts["BEST VALUE"] >= 1);
  assert.ok(Math.max(...confidences) - Math.min(...confidences) >= 5);
  const leader = decisions.get(order[0]);
  assert.notEqual(leader?.recommendationLabel, "AVOID");
  pass("sofa_mixed_decisions");
}

// 9 — Electronics mixed logical decisions
{
  const phoneTray = [
    listing(1, "iPhone 15 Pro 256GB", "Apple", 1099, "ip"),
    listing(2, "iPhone 15 128GB", "Apple", 799, "ip2"),
    listing(3, "Samsung Galaxy S24", "Samsung", 899, "sam"),
    listing(4, "iPhone 14 Pro 256GB", "Apple", 899, "ip3"),
  ];
  const { decisions } = runPipeline("iphone 15 pro", phoneTray);
  const order = resolveCanonicalSearchRank(phoneTray, "iphone 15 pro").orderLinks;
  const { counts } = summarizeCalibrationLabels(decisions, order);
  assert.ok(counts.COMPARE + counts.BUY + counts["STRONG BUY"] + counts["BEST VALUE"] >= 2);
  assert.ok(counts.AVOID < order.length);
  pass("electronics_mixed_decisions");
}

// 10 — Labels align across card, brief, compare lane, canonical rank
{
  const leader = applyCanonicalDecisionCalibration(
    mockDecision({ link: "https://leader", record: { finalRankScore: 92, truthDelta: 9, relevance: 76, trust: 72 } }),
    { rankIndex: 0, traySize: 2, topFinalScore: 92, gapToLeader: 0, leaderGapToSecond: 7 }
  );
  const brief = syncCalibratedBriefRecommendationLabel(
    {
      headline: "Pick",
      recommendation: { label: "Legacy", title: "Leader", store: "Store", link: "https://leader", price: 100 },
      why: [],
      alternatives: [],
      discountNote: null,
      confidence: 30,
      sparseTrayWarning: null,
    },
    leader
  );
  assert.equal(brief?.recommendation.label, leader.recommendationLabel);
  const products = [
    { id: 1, title: "Leader", link: "https://leader", store: "Apple", price: 100, displayPrice: "€100", rating: 4.6, image: "", reviewsCount: 100, shipping: "", availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [] },
    { id: 2, title: "Alt", link: "https://alt", store: "Store", price: 90, displayPrice: "€90", rating: 4.4, image: "", reviewsCount: 80, shipping: "", availability: "In stock", oldPrice: null, priceTrend: "stable", extensions: [] },
  ];
  const line = buildCompareTrayInsights(products, products, {
    leaderRecommendationLabel: leader.recommendationLabel,
  }).find((row) => row.id === "grid-leader");
  assert.ok(line?.body.includes(leader.recommendationLabel ?? ""));
  pass("surface_label_alignment");
}

const canonicalRank = readFileSync(join(process.cwd(), "lib/truth/canonicalSearchRank.ts"), "utf8");
assert.ok(!canonicalRank.includes("canonicalDecisionCalibration"));
pass("rank_authority_unchanged");

// 11 — MacBook: multi-merchant tray, mixed labels, no false AVOID cluster
{
  const macTray = [
    listing(1, "MacBook Pro 14 M3 Pro 512GB", "Apple", 1999, "mbp"),
    listing(2, "MacBook Air M2 16GB 512GB", "Apple", 1199, "mba"),
    listing(3, "MacBook Pro 16 M3 Max 1TB", "Apple", 2999, "mbp16"),
    listing(4, "Dell XPS 13 Ultrabook", "Dell", 999, "xps"),
  ];
  const { decisions } = runPipeline("macbook pro", macTray);
  const order = resolveCanonicalSearchRank(macTray, "macbook pro").orderLinks;
  const stores = new Set(order.map((link) => macTray.find((p) => p.link === link)?.store));
  const { counts, labels } = summarizeCalibrationLabels(decisions, order);
  assert.ok(stores.size >= 2, "MacBook tray should keep multiple merchants");
  assert.ok(!hasFlatLabelCluster(labels, "AVOID", order.length), "MacBook should not be all AVOID");
  assert.ok(!hasFlatLabelCluster(labels, "COMPARE", order.length), "MacBook should not be all COMPARE");
  const buyTier = counts.BUY + counts["STRONG BUY"] + counts["BEST VALUE"];
  assert.ok(buyTier >= 1 && buyTier <= 2, "MacBook should have 1–2 buy-tier labels");
  assert.ok(counts.COMPARE >= 1, "MacBook should keep COMPARE alternatives");
  pass("macbook_mixed_merchants");
}

// 12 — iPhone: price/value differences reflected in labels
{
  const phoneTray = [
    listing(1, "iPhone 15 Pro 256GB", "Apple", 1099, "ip15p"),
    listing(2, "iPhone 15 128GB", "Apple", 799, "ip15"),
    listing(3, "iPhone 14 Pro 256GB", "Amazon", 899, "ip14p"),
    listing(4, "Samsung Galaxy S24 Ultra", "Samsung", 1199, "sam"),
  ];
  const { decisions } = runPipeline("iphone 15 pro", phoneTray);
  const order = resolveCanonicalSearchRank(phoneTray, "iphone 15 pro").orderLinks;
  const { counts, labels } = summarizeCalibrationLabels(decisions, order);
  const leader = decisions.get(order[0]);
  assert.ok(["BUY", "STRONG BUY", "COMPARE", "BEST VALUE"].includes(leader?.recommendationLabel ?? ""));
  assert.ok(counts.COMPARE >= 1);
  assert.ok(!hasFlatLabelCluster(labels, "AVOID", order.length));
  const confidences = order.map((link) => decisions.get(link)?.confidence ?? 0);
  assert.ok(Math.max(...confidences) - Math.min(...confidences) >= 5);
  pass("iphone_value_reflected");
}

// 13 — Sofa: higher-quality sofa can beat cheaper weak sofa (leader not forced to cheapest)
{
  const sofaTray = [
    listing(1, "Premium Corner Sofa Grey", "IKEA", 800, "sofa1"),
    listing(2, "Family Sectional Sofa", "Wayfair", 970, "sofa2"),
    listing(3, "Luxury Leather Corner Sofa", "Made.com", 1299, "sofa3"),
    listing(4, "Budget Fabric Sofa", "Bol.com", 449, "sofa4"),
  ];
  const { decisions } = runPipeline("corner sofa", sofaTray);
  const order = resolveCanonicalSearchRank(sofaTray, "corner sofa").orderLinks;
  const leader = decisions.get(order[0]);
  const cheapest = sofaTray.reduce((a, b) => (a.price < b.price ? a : b));
  assert.notEqual(leader?.recommendationLabel, "AVOID");
  assert.ok(
    leader?.link !== cheapest.link || ["BUY", "COMPARE", "BEST VALUE"].includes(leader?.recommendationLabel ?? ""),
    "quality leader or acceptable label when cheapest ranks first"
  );
  pass("sofa_quality_over_cheap");
}

// 14 — TV: verified discount improves value label / chips
{
  const discounted = applyCanonicalDecisionCalibration(
    mockDecision({
      link: "https://tv-deal",
      overallMatch: 62,
      record: { finalRankScore: 82, truthDelta: 6, relevance: 58, trust: 64, evidenceChain: ["Verified OLED discount vs market median"] },
      realDiscountProof: {
        verified: true,
        band: "Strong verified discount",
        marketMedianDifferencePct: 12,
        displayLine: "Verified 12% below market median",
        verifiedSavingEur: 180,
        discountAuthenticityLine: "Credible markdown",
      },
      discountConfidence: {
        discountConfidence: 82,
        displayLine: "Verified 12% below market median",
        allowsPromotionalWording: true,
        label: "Verified deal",
      },
      trueValue: { trueValueScore: 72, band: "Strong", reasoning: "Strong OLED value" },
    }),
    { rankIndex: 1, traySize: 4, topFinalScore: 90, gapToLeader: 8, leaderGapToSecond: 7 }
  );
  assert.ok(
    ["BEST VALUE", "BUY", "COMPARE"].includes(discounted.recommendationLabel ?? ""),
    "discounted TV should not be AVOID"
  );
  assert.ok(
    (discounted.displayChips ?? []).some((chip) => /verified|discount|save|median/i.test(chip.label)),
    "discount evidence should appear in chips"
  );
  pass("tv_discount_value");
}

// 15 — Discount chips surface when credible evidence exists
{
  const withDeal = applyCanonicalDecisionCalibration(
    mockDecision({
      realDiscountProof: {
        verified: true,
        band: "Exceptional verified discount",
        marketMedianDifferencePct: 18,
        displayLine: "Save €220 vs median",
        verifiedSavingEur: 220,
      },
      discountConfidence: {
        discountConfidence: 88,
        displayLine: "Save €220 vs median",
        allowsPromotionalWording: true,
        label: "Verified",
      },
    }),
    { rankIndex: 0, traySize: 3, topFinalScore: 88, gapToLeader: 0, leaderGapToSecond: 5 }
  );
  assert.ok((withDeal.displayChips ?? []).length >= 1);
  pass("discount_chips_visible");
}

// 16 — Hard mismatch still AVOID (regression)
{
  const bad = applyCanonicalDecisionCalibration(
    mockDecision({
      overallMatch: 28,
      foundation: {
        productMatch: {
          overallMatchScore: 28,
          intentMatchScore: 26,
          strongestMismatchReason: "Wrong product type for laptop query",
        },
        purchaseConstraints: { hardRequirements: [] },
        recommendationIntelligence: { recommendationTier: "NOT_RECOMMENDED" },
        productReasoning: { recommendationStrength: "WEAK" },
      },
      record: {
        finalRankScore: 42,
        relevance: 30,
        trust: 38,
        evidenceChain: ["Wrong product type for laptop query"],
      },
    }),
    { rankIndex: 2, traySize: 4, topFinalScore: 90, gapToLeader: 48, leaderGapToSecond: 8 }
  );
  assert.equal(bad.recommendationLabel, "AVOID");
  pass("hard_mismatch_still_avoid");
}

console.log(`\nPhase A universal decision calibration: ${passed}/${passed} passed.`);
