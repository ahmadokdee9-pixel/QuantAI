#!/usr/bin/env node
/**
 * Phase 14.0 — Decision Coherence Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  bindProductDecisionBrief,
  buildRankingRationaleLine,
  buildTrayCoherenceContext,
  mergeRankingRationaleSummary,
  resolveCoherentProductVerdict,
  resolveInstitutionalVerdict,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { activateMarketContext } from "../lib/ui/marketContextActivation.ts";

const verdictIntelligence = {
  version: "phase10-v1",
  verdict: "BUY READY",
  confidence: 0.78,
  rationale: "Product clears all major quality and trust checks.",
  strengths: ["Trust posture is strong."],
  warnings: [],
  factorTrace: {},
};

const decisionBrief = {
  headline: "Buy the lead listing",
  recommendation: {
    label: "Top pick",
    title: "Lead Product",
    store: "Trusted Store",
    link: "https://example.com/lead",
    price: 99,
  },
  why: ["Strong trust"],
  alternatives: [],
  discountNote: null,
  confidence: 0.8,
  sparseTrayWarning: null,
  explanation: "Institutional brief for the lead pick.",
  buyReasoning: "Trust and pricing support a confident checkout.",
  compareReasoning: "Compare alternatives before committing.",
  waitReasoning: "Wait for cleaner pricing.",
  topSignals: ["Trust signals are strong.", "Price fits the tray median."],
  riskSignals: ["Confirm warranty terms."],
  marketStatus: "Market timing looks favorable.",
  confidenceExplanation: "Confidence is high across trust and value.",
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

const executedRanking = {
  version: "phase13.4-v1",
  executed: true,
  candidateCount: 3,
  rerankedCount: 2,
  executionConfidence: 0.72,
  executionMode: "ready",
  rankingChanges: [],
  rankingSummary: "Ranked first after controlled execution.",
  rankingWarnings: [],
};

const phase93 = {
  version: "phase9.3-v1",
  trayAssessments: [
    {
      link: "https://example.com/lead",
      store: "Trusted Store",
      trustScore: 82,
      retailerConfidence: 0.8,
      fakeDiscountRisk: "low",
      fakeDiscountProbability: 0.1,
      discountAuthenticity: 0.86,
      suspiciousSeller: false,
      suspiciousSellerReasons: [],
      priceAnomaly: "none",
      priceAnomalyFlags: [],
    },
    {
      link: "https://example.com/alt",
      store: "Alt Store",
      trustScore: 74,
      retailerConfidence: 0.7,
      fakeDiscountRisk: "high",
      fakeDiscountProbability: 0.82,
      discountAuthenticity: 0.2,
      suspiciousSeller: true,
      suspiciousSellerReasons: ["aggregator_low_trust"],
      priceAnomaly: "suspicious_low",
      priceAnomalyFlags: ["price_outlier_thin_proof"],
    },
  ],
  suspiciousSellerCount: 1,
  fakeDiscountHighCount: 1,
  priceAnomalyCount: 1,
  averageRetailerConfidence: 0.75,
  averageTrustScore: 78,
  discountIntelligence: { verifiedDiscounts: [], trayDiscountSummary: "", fakeDiscountRisk: "low" },
  verdictConfidence: {
    score: 0.8,
    factors: [],
    discountAuthentic: true,
    trustFloorOk: true,
    suspiciousSellerBlocked: false,
  },
};

const leadProduct = {
  id: 1,
  link: "https://example.com/lead",
  title: "Lead Product",
  store: "Trusted Store",
  price: 99,
  rating: 4.6,
  reviewsCount: 120,
};

const altProduct = {
  id: 2,
  link: "https://example.com/alt",
  title: "Alt Product",
  store: "Alt Store",
  price: 79,
  rating: 4.2,
  reviewsCount: 12,
};

const list = [leadProduct, altProduct];

const tray = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence,
    rankingEngine,
    executedRanking,
    phase93TrustDiscount: phase93,
    valueIntelligence: {
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
    },
    realDiscount: {
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
    },
  },
  decisionBrief,
});

// ── UI wiring guards ───────────────────────────────────────────────────────────
const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("coherentDecision"), "card consumes coherent decision");
assert.ok(!cardBody.includes("deriveCardDecision"), "card does not derive independent verdict");

const drawer = readFileSync(join(process.cwd(), "components", "search", "ProductIntelligenceDrawer.tsx"), "utf8");
assert.ok(drawer.includes("coherentDecision"), "drawer consumes coherent decision");
assert.ok(drawer.includes("coherentVerdict"), "drawer uses coherent verdict");

const surface = readFileSync(join(process.cwd(), "components", "search", "ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("activateProductDecisionCoherence"), "surface activates coherence per product");
assert.ok(surface.includes("coherenceByLink"), "surface binds coherence by product link");

const card = readFileSync(join(process.cwd(), "components", "search", "ProductResultCard.tsx"), "utf8");
assert.ok(card.includes("coherentDecision"), "result card forwards coherent decision");

const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(!coherenceSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!coherenceSrc.includes("openai"), "no new AI generation");

// ── Single verdict authority ───────────────────────────────────────────────────
assert.equal(resolveInstitutionalVerdict(verdictIntelligence), "BUY READY");
assert.equal(
  resolveCoherentProductVerdict({
    institutionalVerdict: "BUY READY",
    isLeadProduct: true,
    phase93Assessment: phase93.trayAssessments[0],
  }),
  "BUY READY"
);
assert.equal(
  resolveCoherentProductVerdict({
    institutionalVerdict: "BUY READY",
    isLeadProduct: false,
    phase93Assessment: phase93.trayAssessments[1],
  }),
  "AVOID"
);

const leadCoherence = activateProductDecisionCoherence({
  product: leadProduct,
  list,
  rank: 0,
  tray,
});
const altCoherence = activateProductDecisionCoherence({
  product: altProduct,
  list,
  rank: 1,
  tray,
});

assert.equal(leadCoherence.verdict, "BUY READY", "lead inherits institutional buy verdict");
assert.equal(altCoherence.verdict, "AVOID", "secondary escalates from phase 93 truth");
assert.ok(leadCoherence.decisionBrief?.explanation, "lead receives full brief");
assert.equal(altCoherence.decisionBrief, null, "secondary does not inherit tray-wide brief");

// ── Card / drawer consistency ──────────────────────────────────────────────────
assert.equal(leadCoherence.drawerStanceLabel, "Buy lane");
assert.equal(altCoherence.drawerStanceLabel, "Wait lane");
assert.ok(leadCoherence.reasonLine.length > 0, "lead reason populated");
assert.equal(leadCoherence.verdict, resolveInstitutionalVerdict(verdictIntelligence), "lead matches institutional verdict");

// ── Market context grounding ───────────────────────────────────────────────────
const groundedMarket = activateMarketContext({
  ...tray.marketContext,
  phase93Assessment: phase93.trayAssessments[1],
  institutionalVerdict: "BUY READY",
});
assert.ok(groundedMarket?.discountReal.includes("inflated"), "phase 93 fake discount overrides query discount copy");
assert.ok(
  groundedMarket?.sellerTrustworthy.includes("verification"),
  "phase 93 seller concern overrides optimistic seller copy"
);

// ── Ranking rationale activation ───────────────────────────────────────────────
const rankingLine = buildRankingRationaleLine({
  isLeadProduct: true,
  rank: 0,
  rankingEngine,
  executedRanking,
});
assert.ok(rankingLine.includes("Ranked first"), "ranking rationale uses executed ranking");
const mergedSummary = mergeRankingRationaleSummary(["Existing line", ""], rankingLine, 2);
assert.equal(mergedSummary[0], rankingLine, "ranking rationale occupies first summary slot");

assert.ok(
  leadCoherence.summaryLines[0].includes("Ranked first") ||
    leadCoherence.rankingRationaleLine.includes("Ranked first"),
  "lead summary exposes ranking rationale"
);

// ── Brief binding ──────────────────────────────────────────────────────────────
assert.equal(bindProductDecisionBrief(decisionBrief, altProduct, false), null);
assert.equal(bindProductDecisionBrief(decisionBrief, leadProduct, true)?.explanation, decisionBrief.explanation);

console.log("phase140-decision-coherence-activation: ok");
