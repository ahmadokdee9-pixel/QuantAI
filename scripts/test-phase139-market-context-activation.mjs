#!/usr/bin/env node
/**
 * Phase 13.9 — Market Context Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateMarketContext,
  mergeMarketContextExpandedLines,
  mergeMarketContextSummary,
} from "../lib/ui/marketContextActivation.ts";

const valueIntelligence = {
  version: "phase12.19-v1",
  valueLevel: "HIGH",
  valueScore: 0.78,
  priceToQualitySignal: 0.74,
  priceToPerformanceSignal: 0.7,
  longTermValueSignal: 0.62,
  ownershipCostSignal: 0.58,
  replacementValueSignal: 0.6,
  riskFlags: [],
  confidenceTier: "HIGH",
  confidence: 0.71,
};

const realDiscount = {
  version: "phase12.18-v1",
  discountLevel: "HIGH",
  discountScore: 0.72,
  priceDropSignal: 0.58,
  historicalPriceSignal: 0.44,
  valueGainSignal: 0.5,
  fakeDiscountRisk: 0.12,
  urgencyDiscountSignal: 0.1,
  riskFlags: [],
  confidenceTier: "MEDIUM",
  confidence: 0.6,
};

const retailerTrust = {
  version: "phase12.16-v1",
  trustLevel: "MEDIUM",
  trustScore: 0.58,
  retailerAgeSignal: 0.7,
  reviewSignal: 0.72,
  reputationSignal: 0.75,
  fulfillmentSignal: 0.68,
  returnPolicySignal: 0.66,
  riskFlags: [],
  confidenceTier: "MEDIUM",
  confidence: 0.7,
};

const reviewCredibility = {
  version: "phase12.17-v1",
  credibilityLevel: "HIGH",
  credibilityScore: 0.76,
  ratingConsistencySignal: 0.7,
  reviewVolumeSignal: 0.68,
  sentimentConsistencySignal: 0.72,
  suspiciousPatternSignal: 0.12,
  verificationSignal: 0.65,
  riskFlags: [],
  confidenceTier: "HIGH",
  confidence: 0.69,
};

const decisionReadinessBuy = {
  version: "phase12.10-v1",
  readinessStatus: "READY_TO_BUY",
  readinessScore: 0.82,
  blockers: [],
  supportingSignals: [],
  confidenceTier: "HIGH",
  confidence: 0.74,
};

const rankingEngine = {
  version: "phase13.1-v1",
  rankingScore: 0.82,
  rankingTier: "HIGH",
  trustWeight: 0.28,
  valueWeight: 0.26,
  buyerFitWeight: 0.24,
  confidenceWeight: 0.22,
  rankingReasons: ["Trust signals are strong across retailer and review posture."],
  rankingWarnings: [],
};

const verdictIntelligence = {
  version: "phase10-v1",
  verdict: "BUY READY",
  confidence: 0.78,
  rationale: "Product clears all major quality and trust checks.",
  strengths: [],
  warnings: [],
  factorTrace: {},
};

// ── UI wiring guards ───────────────────────────────────────────────────────────
const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("activateMarketContext"), "card activates market context");
assert.ok(cardBody.includes("mergeMarketContextSummary"), "card summary uses market context");
assert.ok(!cardBody.includes("phase13.9"), "no new card sections");

const drawer = readFileSync(join(process.cwd(), "components", "search", "ProductIntelligenceDrawer.tsx"), "utf8");
assert.ok(drawer.includes("activateMarketContext"), "drawer activates market context");
assert.ok(drawer.includes("drawerListingRead"), "drawer listing read uses market context");

const surface = readFileSync(join(process.cwd(), "components", "search", "ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("marketContext"), "results surface passes market context meta");

const stabilization = readFileSync(
  join(process.cwd(), "scripts", "test-production-stabilization.mjs"),
  "utf8"
);
assert.ok(stabilization.includes("activateMarketContext"), "stabilization checks market context activation");

const activationSrc = readFileSync(join(process.cwd(), "lib/ui/marketContextActivation.ts"), "utf8");
assert.ok(!activationSrc.includes("buildDeterministicRanking"), "no ranking changes");
assert.ok(!activationSrc.includes("openai"), "no new AI generation");

// ── Market questions answered ────────────────────────────────────────────────────
const buyMarket = activateMarketContext({
  decisionBrief: {
    marketStatus: "Pricing sits near tray median with stable demand.",
  },
  valueIntelligence,
  realDiscount,
  retailerTrust,
  reviewCredibility,
  decisionReadiness: decisionReadinessBuy,
  rankingEngine,
  verdictIntelligence,
});

assert.ok(buyMarket, "market context activates");
assert.ok(buyMarket.priceAttractive.includes("attractive"), "price attractiveness exposed");
assert.ok(buyMarket.discountReal.includes("genuine"), "discount authenticity exposed");
assert.ok(buyMarket.sellerTrustworthy.includes("Seller reputation"), "seller trust exposed");
assert.ok(buyMarket.timingFavorable.length > 0, "timing context exposed");
assert.ok(buyMarket.drawerListingRead.length > 0, "drawer listing read populated");

const waitMarket = activateMarketContext({
  valueIntelligence: { ...valueIntelligence, valueLevel: "LOW", valueScore: 0.28, longTermValueSignal: 0.2 },
  realDiscount: { ...realDiscount, fakeDiscountRisk: 0.62, discountLevel: "LOW", discountScore: 0.22 },
  retailerTrust,
  reviewCredibility,
  decisionReadiness: { ...decisionReadinessBuy, readinessStatus: "WAIT_FOR_BETTER_DEAL" },
  rankingEngine,
  verdictIntelligence: { ...verdictIntelligence, verdict: "WAIT" },
  decisionBrief: { marketStatus: "Market timing favors patience." },
});
assert.ok(waitMarket?.waitRecommended.includes("Waiting"), "wait recommendation exposed");
assert.ok(
  waitMarket?.timingFavorable.toLowerCase().includes("waiting") ||
    waitMarket?.timingFavorable.toLowerCase().includes("patience"),
  "wait timing exposed"
);

// ── Existing slot merge helpers ──────────────────────────────────────────────────
const mergedSummary = mergeMarketContextSummary(["Verdict support line", ""], buyMarket, 2);
assert.equal(mergedSummary[1], buyMarket.cardLines[0], "second summary slot gets market glance");

const mergedExpanded = mergeMarketContextExpandedLines(["Existing expanded line"], buyMarket, 3);
assert.ok(mergedExpanded.length >= 2, "expanded slot merges market lines");
assert.ok(mergedExpanded.some((line) => line.includes("Discount")), "expanded lines include market context");

assert.equal(activateMarketContext({}), null, "empty input returns null");

console.log("phase139-market-context-activation: ok");
