#!/usr/bin/env node
/**
 * Phase 23.0 — Unified Decision Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activateAlternativeAdvantage } from "../lib/ui/alternativeAdvantageActivation.ts";
import { activateBuyWait } from "../lib/ui/buyWaitActivation.ts";
import { activateCategoryIntelligence } from "../lib/ui/categoryIntelligenceActivation.ts";
import { activateDiscountTruth } from "../lib/ui/discountTruthActivation.ts";
import { activateIntentIntelligence } from "../lib/ui/intentIntelligenceActivation.ts";
import { activatePriceTarget } from "../lib/ui/priceTargetActivation.ts";
import { activateTrustRisk } from "../lib/ui/trustRiskActivation.ts";
import {
  activateUnifiedDecision,
  mergeUnifiedDecisionExpandedLines,
  mergeUnifiedDecisionExpandedSignals,
  mergeUnifiedDecisionSummary,
} from "../lib/ui/unifiedDecisionActivation.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery",
};

const trustedLead = {
  ...base,
  id: 1,
  link: "https://shop.example/trusted",
  title: "Samsung Galaxy S24 Ultra 512GB 200MP Pro Camera 5000mAh Android 14",
  store: "Coolblue",
  price: 899,
  oldPrice: 1099,
  priceTrend: "down",
};

const expensiveLead = {
  ...trustedLead,
  link: "https://shop.example/expensive",
  price: 1199,
  oldPrice: 1299,
  priceTrend: "up",
};

const peerOffer = {
  ...base,
  id: 2,
  link: "https://shop.example/peer",
  title: "Samsung Galaxy S24 Ultra 512GB 200MP Pro Camera 5000mAh Android 14",
  store: "MediaMarkt",
  price: 929,
  oldPrice: 1049,
  priceTrend: "down",
};

const peerOfferLower = {
  ...peerOffer,
  link: "https://shop.example/peer-low",
  price: 849,
};

const riskyListing = {
  ...base,
  id: 3,
  link: "https://shop.example/risky",
  title: "Galaxy S24 Ultra 512GB 200MP Pro Camera",
  store: "Unknown Marketplace",
  price: 499,
  oldPrice: 1099,
  priceTrend: "up",
  rating: 3.1,
  reviewsCount: 0,
  availability: "",
  shipping: "",
};

const tray = [trustedLead, peerOffer, riskyListing];
const buyTray = [trustedLead, peerOffer];

function buildStack(product, list, searchQuery, isLead, phase93Assessment = null, institutionalVerdict = "COMPARE") {
  const discountTruth = activateDiscountTruth({ product, list, phase93Assessment });
  const buyWait = activateBuyWait({
    product,
    list,
    discountTruth,
    institutionalVerdict,
  });
  const priceTarget = activatePriceTarget({ product, list, discountTruth, buyWait });
  const categoryIntelligence = activateCategoryIntelligence({ product, searchQuery });
  const alternativeAdvantage = activateAlternativeAdvantage({
    product,
    list,
    isLeadProduct: isLead,
    discountTruth,
    buyWait,
  });
  const intentIntelligence = activateIntentIntelligence({
    product,
    list,
    searchQuery,
    isLeadProduct: isLead,
    categoryIntelligence,
    discountTruth,
    buyWait,
    priceTarget,
    alternativeAdvantage,
    rankingRationaleLine: isLead ? "Ranked first — trust and seller signals lead this tray." : "",
  });
  const trustRisk = activateTrustRisk({
    product,
    list,
    phase93Assessment,
    ...{ discountTruth, buyWait, priceTarget, categoryIntelligence, alternativeAdvantage, intentIntelligence },
    rankingRationaleLine: isLead ? "Ranked first — trust and seller signals lead this tray." : "",
  });
  return {
    discountTruth,
    buyWait,
    priceTarget,
    categoryIntelligence,
    alternativeAdvantage,
    intentIntelligence,
    trustRisk,
  };
}

function activateUnified(product, list, searchQuery, isLead, options = {}) {
  const {
    phase93Assessment = null,
    institutionalVerdict = "BUY READY",
    rankingRationaleLine = isLead ? "Ranked first — trust and seller signals lead this tray." : "",
    commerceCoverage = null,
  } = options;
  const stack = buildStack(product, list, searchQuery, isLead, phase93Assessment, institutionalVerdict);
  return activateUnifiedDecision({
    institutionalVerdict,
    isLeadProduct: isLead,
    rankingRationaleLine,
    commerceCoverage,
    ...stack,
  });
}

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateUnifiedDecision"), "coherence activates unified decision engine");
assert.ok(coherenceSrc.includes("unifiedDecision"), "coherent decision exposes unified decision");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__unified-decision-panel"), "no new UI panels");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("unifiedDecisionActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const unifiedSrc = readFileSync(join(process.cwd(), "lib/ui/unifiedDecisionActivation.ts"), "utf8");
assert.ok(!unifiedSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!unifiedSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!unifiedSrc.includes("openai"), "no new AI generation");

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/trustRiskActivation.ts"), "utf8").includes("activateTrustRisk"),
  "phase 22 trust/risk preserved"
);

// ── BUY_NOW scenario ───────────────────────────────────────────────────────────
const buyNow = activateUnified(trustedLead, buyTray, "samsung galaxy s24 ultra best camera phone", true, {
  institutionalVerdict: "BUY READY",
});
assert.equal(buyNow.finalDecision, "BUY_NOW", "trusted lead with genuine discount resolves to BUY_NOW");
assert.ok(buyNow.finalConfidence >= 55, "buy scenario carries meaningful confidence");
assert.ok(buyNow.decisionFactors.length >= 5, "buy scenario collects multi-layer factors");
assert.ok(buyNow.finalReasoning.includes("Buy now"), "final reasoning names buy posture");
assert.ok(buyNow.decisionSummary.includes("Buy now"), "decision summary names buy posture");

// ── WAIT scenario ──────────────────────────────────────────────────────────────
const waitDecision = activateUnified(expensiveLead, [expensiveLead, peerOfferLower], "samsung galaxy s24 ultra", true, {
  institutionalVerdict: "BUY READY",
});
assert.equal(waitDecision.finalDecision, "WAIT", "price far above target resolves to WAIT");
assert.ok(waitDecision.decisionFactors.some((f) => f.support === "wait"), "wait scenario includes wait factors");
assert.ok(waitDecision.decisionSummary.includes("Wait"), "decision summary names wait posture");

// ── COMPARE scenario ───────────────────────────────────────────────────────────
const compareDecision = activateUnified(peerOffer, buyTray, "samsung galaxy s24 ultra", false, {
  institutionalVerdict: "BUY READY",
});
assert.equal(compareDecision.finalDecision, "COMPARE", "non-lead listing resolves to COMPARE");
assert.ok(compareDecision.decisionFactors.some((f) => f.support === "compare"), "compare scenario includes compare factors");
assert.ok(compareDecision.decisionSummary.includes("Compare"), "decision summary names compare posture");

// ── AVOID scenario ─────────────────────────────────────────────────────────────
const inflatedAssessment = {
  link: riskyListing.link,
  store: riskyListing.store,
  trustScore: 34,
  retailerConfidence: 28,
  fakeDiscountRisk: "high",
  fakeDiscountProbability: 0.9,
  discountAuthenticity: 18,
  suspiciousSeller: true,
  suspiciousSellerReasons: ["marketplace_risk"],
  priceAnomaly: "suspicious_low",
  priceAnomalyFlags: ["deep_undercut"],
};

const avoidDecision = activateUnified(riskyListing, tray, "cheap galaxy s24 ultra", false, {
  phase93Assessment: inflatedAssessment,
  institutionalVerdict: "AVOID",
});
assert.equal(avoidDecision.finalDecision, "AVOID", "inflated discount + high risk resolves to AVOID");
assert.ok(avoidDecision.decisionFactors.some((f) => f.support === "avoid"), "avoid scenario includes avoid factors");
assert.ok(avoidDecision.decisionSummary.includes("Avoid"), "decision summary names avoid posture");

// ── Conflicting signals scenario ───────────────────────────────────────────────
const conflictDecision = activateUnified(riskyListing, tray, "samsung galaxy s24 ultra best camera phone", false, {
  phase93Assessment: inflatedAssessment,
  institutionalVerdict: "BUY READY",
});
assert.notEqual(
  conflictDecision.finalDecision,
  "BUY_NOW",
  "strong intent with high risk must not resolve to BUY_NOW"
);
assert.ok(
  conflictDecision.finalDecision === "AVOID" || conflictDecision.finalDecision === "WAIT",
  "conflicting signals resolve to AVOID or WAIT"
);

// ── Slot merge helpers ─────────────────────────────────────────────────────────
const summary = mergeUnifiedDecisionSummary(["Ranked first — trust lead.", "Market timing favorable."], buyNow, 2);
assert.ok(summary.some((line) => line.includes("Buy now")), "unified summary merged into decision brief slot");
assert.ok(summary[0]?.includes("Ranked first"), "ranking rationale slot preserved");

const expanded = mergeUnifiedDecisionExpandedSignals(["Existing signal"], buyNow, 3);
assert.ok(expanded[0]?.includes("unified") || expanded[0]?.includes("Buy now"), "unified merged into expanded signals");
const smart = mergeUnifiedDecisionExpandedLines(["Existing decision"], buyNow, 3);
assert.ok(smart[0]?.includes("Unified recommendation"), "unified merged into smart decision lines");

// ── Phase 14–22 preservation ───────────────────────────────────────────────────
const trayCtx = buildTrayCoherenceContext({
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
      candidateCount: 3,
      rerankedCount: 3,
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
      title: trustedLead.title,
      store: trustedLead.store,
      link: trustedLead.link,
      price: trustedLead.price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.8,
    sparseTrayWarning: null,
    explanation: "Institutional brief.",
    buyReasoning: "Trust supports checkout.",
    riskSignals: ["Confirm warranty terms."],
  },
});

const coherence = activateProductDecisionCoherence({
  product: trustedLead,
  list: buyTray,
  rank: 0,
  tray: trayCtx,
  searchQuery: "samsung galaxy s24 ultra best camera phone",
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(
  coherence.summaryLines[0]?.includes("Buy now") || coherence.summaryLines[0]?.includes("Wait"),
  "phase 25 unified summary dominates card summary"
);
assert.ok(
  coherence.summaryLines.some((line) => line.includes("Ranked first")) ||
    coherence.rankingRationaleLine.includes("Ranked first"),
  "phase 14.1 ranking rationale preserved"
);
assert.ok(coherence.trustRisk.trustScore > 0, "phase 22 trust/risk preserved");
assert.ok(coherence.unifiedDecision.finalDecision === "BUY_NOW", "unified decision bound on coherent decision");
assert.ok(
  coherence.drawerSynthesis.includes("Unified recommendation") || coherence.drawerSynthesis.includes("Buy now"),
  "drawer synthesis carries unified reasoning"
);
assert.ok(
  coherence.summaryLines.some((line) => line.includes("Buy now")),
  "unified summary exposed in decision brief"
);

console.log("phase230-unified-decision-activation: ok");
