#!/usr/bin/env node
/**
 * Phase 18.0 — Price Target Intelligence Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activatePriceTarget,
  mergePriceTargetExpandedLines,
  mergePriceTargetSummary,
} from "../lib/ui/priceTargetActivation.ts";
import { activateBuyWait } from "../lib/ui/buyWaitActivation.ts";
import { activateDiscountTruth } from "../lib/ui/discountTruthActivation.ts";
import {
  activateCommerceCoverage,
  buildCommerceCoverageTray,
} from "../lib/ui/commerceCoverageActivation.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { activateMarketContext } from "../lib/ui/marketContextActivation.ts";

const productBase = {
  extensions: [],
  image: "",
  rating: 4.6,
  reviewsCount: 420,
  availability: "In stock",
  shipping: "Free delivery",
};

const aboveLowLead = {
  ...productBase,
  id: 1,
  link: "https://shop.example/above-low",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Coolblue",
  price: 239,
  oldPrice: 279,
  priceTrend: "stable",
};

const floorPeer = {
  ...productBase,
  id: 2,
  link: "https://shop.example/floor-peer",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Bol.com",
  price: 219,
  oldPrice: 269,
  priceTrend: "stable",
};

const nearFloorLead = {
  ...productBase,
  id: 3,
  link: "https://shop.example/near-floor",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.nl",
  price: 221,
  oldPrice: 259,
  priceTrend: "down",
};

const trayProducts = [aboveLowLead, floorPeer, nearFloorLead];

const manualInsight = {
  familyId: "fam_airpods",
  storeCount: 2,
  listingCount: 2,
  bestTrustedPrice: 219,
  bestTrustedStore: "Bol.com",
  bestTrustedLink: floorPeer.link,
  marketSpreadPct: 8,
  offerCount: 2,
  averageMarketPrice: 229,
  highestDiscountPct: 18,
  suspiciousOutlierCount: 0,
  merchantDiversityScore: 36,
  isSameProductFamily: true,
  isBestTrustedInFamily: false,
  isLowestRiskInFamily: false,
  familyConsensusHeadline: "Two trusted routes",
  crossMarketHeadline: "Same product across merchants",
  sameItemCheaper: null,
  betterValueAlternative: null,
  premiumUpgrade: null,
  overpricedVsFair: false,
  fairMarketRangeLabel: "€219–€239",
  identityReasons: ["same_canonical_identity"],
};

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activatePriceTarget"), "coherence activates price target per listing");
assert.ok(coherenceSrc.includes("priceTarget"), "coherent decision exposes price target");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__price-target-panel"), "no new UI panels");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("priceTargetActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const priceTargetSrc = readFileSync(join(process.cwd(), "lib/ui/priceTargetActivation.ts"), "utf8");
assert.ok(!priceTargetSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!priceTargetSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!priceTargetSrc.includes("openai"), "no new AI generation");

const buyWaitSrc = readFileSync(join(process.cwd(), "lib/ui/buyWaitActivation.ts"), "utf8");
assert.ok(buyWaitSrc.includes("activateBuyWait"), "buy/wait layer preserved");

const discountTruthSrc = readFileSync(join(process.cwd(), "lib/ui/discountTruthActivation.ts"), "utf8");
assert.ok(discountTruthSrc.includes("activateDiscountTruth"), "discount truth layer preserved");

const commerceSrc = readFileSync(join(process.cwd(), "lib/ui/commerceCoverageActivation.ts"), "utf8");
assert.ok(commerceSrc.includes("buildCommerceCoverageTray"), "commerce coverage layer preserved");

// ── Price target intelligence ────────────────────────────────────────────────────
const aboveLowTruth = activateDiscountTruth({ product: aboveLowLead, list: trayProducts });
const aboveLowCoverage = activateCommerceCoverage({
  product: aboveLowLead,
  familyMembers: [aboveLowLead, floorPeer],
  insight: manualInsight,
  list: trayProducts,
});
const aboveLowBuyWait = activateBuyWait({
  product: aboveLowLead,
  list: trayProducts,
  discountTruth: aboveLowTruth,
  commerceCoverage: aboveLowCoverage,
  institutionalVerdict: "COMPARE",
});
const aboveLowTarget = activatePriceTarget({
  product: aboveLowLead,
  list: trayProducts,
  discountTruth: aboveLowTruth,
  buyWait: aboveLowBuyWait,
  commerceCoverage: aboveLowCoverage,
});

assert.ok(aboveLowTarget.historicalLow != null, "historical low computed");
assert.ok(aboveLowTarget.historicalAverage != null, "historical average computed");
assert.ok(aboveLowTarget.distanceFromLowPct != null && aboveLowTarget.distanceFromLowPct > 0);
assert.ok(aboveLowTarget.distanceFromAveragePct != null);
assert.ok(aboveLowTarget.contributions.recentTrendContribution > 0);
assert.ok(aboveLowTarget.contributions.merchantCompetitionContribution > 0);
assert.ok(aboveLowTarget.contributions.discountTruthContribution > 0);
assert.ok(aboveLowTarget.targetBuyPrice > 0);
assert.ok(aboveLowTarget.targetBuyPrice <= aboveLowLead.price, "target buy price below current");
assert.ok(aboveLowTarget.potentialSavings >= 0);
assert.ok(aboveLowTarget.opportunityScore >= 0 && aboveLowTarget.opportunityScore <= 100);
assert.ok(
  aboveLowTarget.reason.includes("% above historical low") ||
    aboveLowTarget.reason.includes("Competition") ||
    aboveLowTarget.reason.includes("savings"),
  "price target reason uses pricing signals"
);

const nearFloorTruth = activateDiscountTruth({ product: nearFloorLead, list: [nearFloorLead, floorPeer] });
const nearFloorBuyWait = activateBuyWait({
  product: nearFloorLead,
  list: [nearFloorLead, floorPeer],
  discountTruth: nearFloorTruth,
  institutionalVerdict: "BUY READY",
});
const nearFloorTarget = activatePriceTarget({
  product: nearFloorLead,
  list: [nearFloorLead, floorPeer],
  discountTruth: nearFloorTruth,
  buyWait: nearFloorBuyWait,
});
assert.ok(
  nearFloorTarget.reason.includes("near historical floor") ||
    (nearFloorTarget.distanceFromLowPct != null && nearFloorTarget.distanceFromLowPct <= 3),
  "near-floor listing recognized"
);

if (aboveLowTarget.potentialSavings >= 5) {
  assert.ok(
    aboveLowTarget.potentialSavingsLabel.includes("€") ||
      aboveLowTarget.cardLine.includes("save"),
    "potential savings exposed"
  );
}

const expanded = mergePriceTargetExpandedLines(["Existing line"], aboveLowTarget, 3);
assert.ok(expanded.length > 0, "price target merged into expanded lines");
const summary = mergePriceTargetSummary(["Existing summary"], aboveLowTarget, 2);
assert.ok(summary[0]?.length > 0, "price target merged into summary slot");

const market = activateMarketContext({
  priceTarget: aboveLowTarget,
  buyWait: aboveLowBuyWait,
  discountTruth: aboveLowTruth,
  institutionalVerdict: "COMPARE",
  realDiscount: null,
  valueIntelligence: null,
  retailerTrust: null,
  reviewCredibility: null,
  decisionReadiness: null,
  rankingEngine: null,
  verdictIntelligence: null,
  decisionBrief: null,
});
assert.ok(market?.priceAttractive.length > 0, "price attractive slot grounded by price target");

// ── Phase 17.0 buy/wait preservation ───────────────────────────────────────────
assert.ok(["WAIT", "COMPARE"].includes(aboveLowBuyWait.verdict), "buy/wait engine still resolves for elevated listing");
assert.ok(aboveLowBuyWait.confidence > 0, "buy/wait confidence preserved");

// ── Phase 15.0 commerce coverage preservation ──────────────────────────────────
const coverageMap = buildCommerceCoverageTray(trayProducts, "apple airpods pro");
assert.equal(coverageMap.size, trayProducts.length, "commerce coverage map unchanged");

// ── Phase 14.0 / 14.1 preservation ─────────────────────────────────────────────
const tray = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.8,
      rationale: "Lead clears trust checks.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    executedRanking: {
      version: "phase13.4-v1",
      executed: true,
      candidateCount: 2,
      rerankedCount: 2,
      executionConfidence: 0.72,
      executionMode: "ready",
      rankingChanges: [],
      rankingSummary: "Ranked first after controlled execution.",
      rankingWarnings: [],
    },
  },
  decisionBrief: {
    headline: "Buy lead",
    recommendation: {
      label: "Top pick",
      title: nearFloorLead.title,
      store: nearFloorLead.store,
      link: nearFloorLead.link,
      price: nearFloorLead.price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.8,
    sparseTrayWarning: null,
    explanation: "Institutional brief.",
    buyReasoning: "Trust supports checkout.",
  },
});

const coherence = activateProductDecisionCoherence({
  product: nearFloorLead,
  list: [nearFloorLead, floorPeer],
  rank: 0,
  tray,
  commerceCoverage: aboveLowCoverage,
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(coherence.rankingRationaleLine.length > 0, "phase 14.1 ranking rationale preserved");
assert.ok(coherence.discountTruth.verdict.length > 0, "phase 16.0 discount truth preserved");
assert.equal(coherence.buyWait.verdict, "BUY NOW", "phase 17.0 buy/wait preserved on near-floor lead");
assert.ok(coherence.priceTarget.targetBuyPrice > 0, "price target bound on coherent decision");
assert.ok(
  coherence.summaryLines.some((line) => line.includes("floor") || line.includes("%") || line.includes("Target")),
  "summary slot exposes price target"
);

console.log("phase180-price-target-activation: ok");
