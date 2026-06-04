#!/usr/bin/env node
/**
 * Phase 14.1 — Ranking Rationale Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  activateRankingRationale,
  mergeRankingRationaleSummary,
} from "../lib/ui/rankingRationaleActivation.ts";

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
  candidateCount: 2,
  rerankedCount: 1,
  executionConfidence: 0.72,
  executionMode: "ready",
  rankingChanges: [
    {
      productId: 2,
      link: "https://example.com/alt",
      fromRank: 1,
      toRank: 2,
      delta: 1,
      candidateScore: 0.58,
      direction: "down",
    },
  ],
  rankingSummary: "Ranked first after controlled execution.",
  rankingWarnings: [],
};

const rankingSignals = {
  version: "phase13.0-v1",
  rankingSignalScore: 0.74,
  signalWeights: {
    buyerFit: 0.2,
    trust: 0.28,
    value: 0.24,
    quality: 0.1,
    confidence: 0.18,
    brandAffinity: 0.1,
    productAttributeAffinity: 0.1,
    reviewCredibility: 0.12,
    retailerTrust: 0.12,
    realDiscount: 0.08,
    valueIntelligence: 0.1,
  },
  signalConflicts: [],
  signalStrengths: ["strong_trust_signal"],
  signalWeaknesses: [],
};

const productRanking = {
  version: "phase13.2-v1",
  rankingScore: 0.82,
  rankingTier: "HIGH",
  rankingReasons: rankingEngine.rankingReasons,
  rankingWarnings: [],
  rankingConfidence: 0.72,
  rankingProfile: [
    {
      productId: 1,
      link: "https://example.com/lead",
      currentRank: 0,
      preparedRankingScore: 0.82,
      preparedRankingTier: "HIGH",
      trustAdjustment: 0.12,
      valueAdjustment: 0.08,
      buyerFitAdjustment: 0.07,
      confidenceAdjustment: 0.05,
      rankingReady: true,
    },
    {
      productId: 2,
      link: "https://example.com/alt",
      currentRank: 1,
      preparedRankingScore: 0.58,
      preparedRankingTier: "MEDIUM",
      trustAdjustment: 0.05,
      valueAdjustment: 0.11,
      buyerFitAdjustment: 0.04,
      confidenceAdjustment: 0.03,
      rankingReady: true,
    },
  ],
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
    rankingSignals,
    productRanking,
  },
  decisionBrief,
});

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateRankingRationale"), "coherence uses ranking rationale activation");

const rationaleSrc = readFileSync(join(process.cwd(), "lib/ui/rankingRationaleActivation.ts"), "utf8");
assert.ok(!rationaleSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!rationaleSrc.includes("executeControlledRanking"), "no sorting logic changes");
assert.ok(!rationaleSrc.includes("openai"), "no new AI generation");

const drawer = readFileSync(join(process.cwd(), "components/search/ProductIntelligenceDrawer.tsx"), "utf8");
assert.ok(drawer.includes("drawerRankingLine"), "drawer exposes ranking rationale in existing slot");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__ranking-panel"), "no new UI sections");

// ── Lead rationale ───────────────────────────────────────────────────────────────
const leadRanking = activateRankingRationale({
  product: leadProduct,
  rank: 0,
  isLeadProduct: true,
  rankingEngine,
  executedRanking,
  rankingSignals,
  productRanking,
});
assert.ok(leadRanking?.cardLine.includes("Ranked first"), "lead card gets ranked-first rationale");

const leadCoherence = activateProductDecisionCoherence({
  product: leadProduct,
  list,
  rank: 0,
  tray,
});
assert.ok(
  leadCoherence.summaryLines.some((line) => line.includes("Ranked first")) ||
    leadCoherence.rankingRationaleLine.includes("Ranked first"),
  "lead summary exposes ranking rationale"
);

// ── Secondary rationale isolation ──────────────────────────────────────────────
const altRanking = activateRankingRationale({
  product: altProduct,
  rank: 1,
  isLeadProduct: false,
  rankingEngine,
  executedRanking,
  rankingSignals,
  productRanking,
});
assert.ok(altRanking?.cardLine.includes("Ranked here"), "secondary gets product-scoped rationale");
assert.ok(!altRanking?.cardLine.includes("Ranked first after controlled execution"), "secondary does not inherit lead summary");

const altCoherence = activateProductDecisionCoherence({
  product: altProduct,
  list,
  rank: 1,
  tray,
});
assert.ok(!altCoherence.summaryLines[0]?.includes("Ranked first after controlled execution"), "secondary summary avoids lead tray rationale");
assert.ok(
  altCoherence.summaryLines.some(
    (line) =>
      line.includes("Ranked here") ||
      line.includes("below the lead") ||
      line.includes("Alternative slot")
  ) || altCoherence.rankingRationaleLine.includes("Ranked here"),
  "secondary summary uses scoped rationale"
);

// ── Card / drawer verdict coherence preserved ──────────────────────────────────
assert.equal(leadCoherence.verdict, "BUY READY");
assert.equal(leadCoherence.drawerStanceLabel, "Buy lane");
assert.equal(leadCoherence.verdict === "BUY READY" ? "Buy lane" : "", leadCoherence.drawerStanceLabel);
assert.ok(leadCoherence.drawerRankingLine.includes("Ranked first"), "drawer listing read gets lead ranking rationale");

const merged = mergeRankingRationaleSummary(["Existing", ""], leadRanking, 2);
assert.equal(merged[0], leadRanking.cardLine, "summary merge uses card line only");

console.log("phase141-ranking-rationale-activation: ok");
