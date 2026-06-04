#!/usr/bin/env node
/**
 * Phase 17.0 — Buy Now vs Wait Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateBuyWait,
  mergeBuyWaitChip,
  mergeBuyWaitExpandedLines,
} from "../lib/ui/buyWaitActivation.ts";
import {
  activateDiscountTruth,
  buildDiscountTruthTray,
} from "../lib/ui/discountTruthActivation.ts";
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

const buyNowLead = {
  ...productBase,
  id: 1,
  link: "https://shop.example/buy-now",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Coolblue",
  price: 210,
  oldPrice: 260,
  priceTrend: "down",
};

const buyNowPeer = {
  ...productBase,
  id: 2,
  link: "https://shop.example/buy-now-peer",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Bol.com",
  price: 235,
  oldPrice: 270,
  priceTrend: "stable",
};

const waitLead = {
  ...productBase,
  id: 3,
  link: "https://shop.example/wait-lead",
  title: "Apple AirPods Pro 2 USB-C",
  store: "MediaMarkt",
  price: 249,
  oldPrice: 279,
  priceTrend: "up",
};

const compareLead = {
  ...productBase,
  id: 4,
  link: "https://shop.example/compare-lead",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Amazon.nl",
  price: 238,
  oldPrice: 259,
  priceTrend: "stable",
};

const comparePeer = {
  ...productBase,
  id: 5,
  link: "https://shop.example/compare-peer",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Bol.com",
  price: 219,
  oldPrice: 239,
  priceTrend: "stable",
};

const trayProducts = [buyNowLead, buyNowPeer, waitLead, compareLead, comparePeer];

const manualInsight = {
  familyId: "fam_airpods",
  storeCount: 2,
  listingCount: 2,
  bestTrustedPrice: 219,
  bestTrustedStore: "Bol.com",
  bestTrustedLink: comparePeer.link,
  marketSpreadPct: 6,
  offerCount: 2,
  averageMarketPrice: 224,
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
  fairMarketRangeLabel: "€219–€249",
  identityReasons: ["same_canonical_identity"],
};

// ── UI wiring guards ───────────────────────────────────────────────────────────
const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("mergeBuyWaitChip"), "card consumes buy/wait chip slot");
assert.ok(!cardBody.includes("qa-ref-intel-card__buy-wait-panel"), "no new UI panels");

const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateBuyWait"), "coherence activates buy/wait per listing");
assert.ok(coherenceSrc.includes("buyWait"), "coherent decision exposes buy/wait");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("buyWaitActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const buyWaitSrc = readFileSync(join(process.cwd(), "lib/ui/buyWaitActivation.ts"), "utf8");
assert.ok(!buyWaitSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!buyWaitSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!buyWaitSrc.includes("openai"), "no new AI generation");

const discountTruthSrc = readFileSync(join(process.cwd(), "lib/ui/discountTruthActivation.ts"), "utf8");
assert.ok(discountTruthSrc.includes("activateDiscountTruth"), "discount truth layer preserved");

const commerceSrc = readFileSync(join(process.cwd(), "lib/ui/commerceCoverageActivation.ts"), "utf8");
assert.ok(commerceSrc.includes("buildCommerceCoverageTray"), "commerce coverage layer preserved");

// ── Metrics + verdicts ─────────────────────────────────────────────────────────
const buyNowTruth = activateDiscountTruth({ product: buyNowLead, list: [buyNowLead, buyNowPeer] });
const buyNowCoverage = activateCommerceCoverage({
  product: buyNowLead,
  familyMembers: [buyNowLead, buyNowPeer],
  insight: manualInsight,
  list: [buyNowLead, buyNowPeer],
});
const buyNowTiming = activateBuyWait({
  product: buyNowLead,
  list: [buyNowLead, buyNowPeer],
  discountTruth: buyNowTruth,
  commerceCoverage: buyNowCoverage,
  institutionalVerdict: "BUY READY",
});

assert.ok(buyNowTiming.metrics.historicalLowDistance <= 0.05, "historical low distance computed");
assert.ok(buyNowTiming.metrics.historicalAverageDistance >= 0, "historical average distance computed");
assert.equal(buyNowTiming.metrics.recentPriceDirection, "down");
assert.equal(buyNowTiming.metrics.discountTruthConfidence, buyNowTruth.confidence);
assert.ok(buyNowTiming.metrics.merchantCompetitionIntensity > 0, "merchant competition computed");
assert.ok(buyNowTiming.metrics.availabilityPressure > 0, "availability pressure computed");
assert.ok(buyNowTiming.metrics.priceStability >= 0, "price stability computed");
assert.equal(buyNowTiming.verdict, "BUY NOW");
assert.ok(
  buyNowTiming.reason === "Recent downward trend detected." ||
    buyNowTiming.reason === "Current price near historical low.",
  "buy-now reason uses existing pricing signals"
);
assert.ok(buyNowTiming.confidence >= 60, "buy timing confidence exposed");

const waitTruth = activateDiscountTruth({ product: waitLead, list: trayProducts });
const waitTiming = activateBuyWait({
  product: waitLead,
  list: trayProducts,
  discountTruth: waitTruth,
  institutionalVerdict: "BUY READY",
});
assert.equal(waitTiming.verdict, "WAIT");
assert.ok(
  waitTiming.reason.includes("discount") ||
    waitTiming.reason.includes("Verify") ||
    waitTiming.reason.includes("increased"),
  "wait reason reflects inflated or risky discount posture"
);

const compareTruth = activateDiscountTruth({
  product: compareLead,
  list: [compareLead, comparePeer],
});
const compareCoverage = activateCommerceCoverage({
  product: compareLead,
  familyMembers: [compareLead, comparePeer],
  insight: manualInsight,
  list: [compareLead, comparePeer],
});
const compareTiming = activateBuyWait({
  product: compareLead,
  list: [compareLead, comparePeer],
  discountTruth: compareTruth,
  commerceCoverage: compareCoverage,
  institutionalVerdict: "COMPARE",
});
assert.equal(compareTiming.verdict, "COMPARE");
assert.ok(
  compareTiming.reason.includes("stable") || compareTiming.reason.includes("Compare"),
  "compare reason reflects stable or multi-merchant posture"
);

const competitionTiming = activateBuyWait({
  product: compareLead,
  list: [compareLead, comparePeer],
  discountTruth: compareTruth,
  commerceCoverage: compareCoverage,
  institutionalVerdict: "BUY READY",
});
assert.ok(
  competitionTiming.verdict === "WAIT" || competitionTiming.verdict === "COMPARE",
  "merchant competition steers away from immediate buy"
);
if (competitionTiming.verdict === "WAIT") {
  assert.equal(competitionTiming.reason, "Merchant competition may reduce price further.");
}

// ── Presentation merges ────────────────────────────────────────────────────────
const chips = mergeBuyWaitChip([], buyNowTiming, 2);
assert.ok(chips[0]?.label.includes("BUY NOW"), "buy/wait label on chip");
const expanded = mergeBuyWaitExpandedLines(["Existing line"], buyNowTiming, 3);
assert.ok(expanded[0]?.includes("BUY NOW"), "buy/wait card line merged");

const market = activateMarketContext({
  buyWait: buyNowTiming,
  discountTruth: buyNowTruth,
  institutionalVerdict: "BUY READY",
  realDiscount: null,
  valueIntelligence: null,
  retailerTrust: null,
  reviewCredibility: null,
  decisionReadiness: null,
  rankingEngine: null,
  verdictIntelligence: null,
  decisionBrief: null,
});
assert.ok(market?.timingFavorable.includes("low") || market?.timingFavorable.includes("downward"), "timing slot grounded by buy/wait");

// ── Phase 16.0 discount truth preservation ─────────────────────────────────────
const discountMap = buildDiscountTruthTray(trayProducts);
assert.equal(discountMap.size, trayProducts.length, "discount truth tray unchanged");

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
      title: buyNowLead.title,
      store: buyNowLead.store,
      link: buyNowLead.link,
      price: buyNowLead.price,
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
  product: buyNowLead,
  list: [buyNowLead, buyNowPeer],
  rank: 0,
  tray,
  commerceCoverage: buyNowCoverage,
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 institutional verdict authority preserved");
assert.ok(coherence.rankingRationaleLine.length > 0, "phase 14.1 ranking rationale preserved");
assert.ok(coherence.discountTruth.verdict.length > 0, "phase 16.0 discount truth preserved on coherent decision");
assert.equal(coherence.buyWait.verdict, "BUY NOW", "buy/wait bound on coherent decision");
assert.ok(coherence.drawerDecisionLane.includes("BUY NOW"), "drawer decision lane exposes buy/wait");

console.log("phase170-buy-wait-activation: ok");
