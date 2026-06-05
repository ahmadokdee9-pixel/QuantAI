#!/usr/bin/env node
/**
 * Phase 22.0 — Trust & Risk Intelligence Activation Layer tests (offline, no network).
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
import {
  activateTrustRisk,
  mergeTrustRiskExpandedLines,
  mergeTrustRiskExpandedSignals,
} from "../lib/ui/trustRiskActivation.ts";
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

const riskyListing = {
  ...base,
  id: 2,
  link: "https://shop.example/risky",
  title: "Galaxy S24",
  store: "Unknown Marketplace",
  price: 499,
  oldPrice: 1099,
  priceTrend: "up",
  rating: 3.2,
  reviewsCount: 0,
  availability: "",
  shipping: "",
};

const tray = [trustedLead, riskyListing];

function buildStack(product, list, searchQuery, isLead, phase93Assessment = null) {
  const discountTruth = activateDiscountTruth({ product, list, phase93Assessment });
  const buyWait = activateBuyWait({
    product,
    list,
    discountTruth,
    institutionalVerdict: "COMPARE",
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
  });
  return {
    discountTruth,
    buyWait,
    priceTarget,
    categoryIntelligence,
    alternativeAdvantage,
    intentIntelligence,
  };
}

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateTrustRisk"), "coherence activates trust/risk intelligence");
assert.ok(coherenceSrc.includes("trustRisk"), "coherent decision exposes trust/risk");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__trust-risk-panel"), "no new UI panels");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("trustRiskActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const trustRiskSrc = readFileSync(join(process.cwd(), "lib/ui/trustRiskActivation.ts"), "utf8");
assert.ok(!trustRiskSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!trustRiskSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!trustRiskSrc.includes("openai"), "no new AI generation");

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/intentIntelligenceActivation.ts"), "utf8").includes(
    "activateIntentIntelligence"
  ),
  "phase 21 intent intelligence preserved"
);

// ── Trust/risk evaluation ────────────────────────────────────────────────────────
const trustedStack = buildStack(trustedLead, tray, "samsung galaxy s24 ultra", true);
const trustedRisk = activateTrustRisk({
  product: trustedLead,
  list: tray,
  ...trustedStack,
  rankingRationaleLine: "Ranked first — trust and seller signals lead this tray.",
});

assert.ok(trustedRisk.trustScore >= 60, "trusted listing gets healthy trust score");
assert.ok(trustedRisk.riskScore < trustedRisk.trustScore || trustedRisk.riskScore < 55, "trusted listing stays lower risk");
assert.ok(trustedRisk.trustReason.length > 0, "trust reason generated");
assert.ok(trustedRisk.riskReason.length > 0, "risk reason generated");
assert.ok(trustedRisk.factors.sellerTrust > 0, "seller trust factor computed");
assert.ok(trustedRisk.factors.marketplaceTrust > 0, "marketplace trust factor computed");
assert.ok(trustedRisk.factors.listingQuality > 0, "listing quality factor computed");

const inflatedAssessment = {
  link: riskyListing.link,
  store: riskyListing.store,
  trustScore: 38,
  retailerConfidence: 32,
  fakeDiscountRisk: "high",
  fakeDiscountProbability: 0.86,
  discountAuthenticity: 24,
  suspiciousSeller: true,
  suspiciousSellerReasons: ["marketplace_risk"],
  priceAnomaly: "suspicious_low",
  priceAnomalyFlags: ["deep_undercut"],
};

const riskyStack = buildStack(riskyListing, tray, "cheap galaxy s24", false, inflatedAssessment);
const riskyEval = activateTrustRisk({
  product: riskyListing,
  list: tray,
  phase93Assessment: inflatedAssessment,
  ...riskyStack,
});

assert.ok(riskyEval.trustScore < trustedRisk.trustScore, "risky listing scores lower trust");
assert.ok(riskyEval.riskScore > trustedRisk.riskScore, "risky listing scores higher risk");
assert.ok(
  riskyEval.riskReason.includes("Discount") ||
    riskyEval.riskReason.includes("Seller") ||
    riskyEval.riskReason.includes("Pricing") ||
    riskyEval.riskReason.includes("Suspicious") ||
    riskyEval.riskReason.includes("Insufficient"),
  "risk reason reflects elevated signals"
);
assert.ok(riskyEval.factors.discountManipulationRisk >= 65, "discount manipulation risk elevated");
assert.ok(riskyEval.factors.pricingAnomalyRisk >= 55, "pricing anomaly risk elevated");

const expanded = mergeTrustRiskExpandedSignals(["Existing signal"], riskyEval, 3);
assert.ok(
  expanded[0]?.includes("risk") ||
    expanded[0]?.includes("Discount") ||
    expanded[0]?.includes("Seller") ||
    expanded[0]?.includes("Pricing"),
  "trust/risk merged into expanded signals"
);
const smart = mergeTrustRiskExpandedLines(["Existing decision"], riskyEval, 3);
assert.ok(smart.length > 0, "trust/risk merged into drawer/smart lines");

// ── Phase 14–21 preservation ───────────────────────────────────────────────────
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
  list: tray,
  rank: 0,
  tray: trayCtx,
  searchQuery: "samsung galaxy s24 ultra",
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(coherence.summaryLines[0]?.length > 0, "phase 26 hero summary on card");
assert.ok(
  !coherence.summaryLines[0]?.toLowerCase().includes("buy now ·") &&
    !/\btrust\s+\d+\s*%/i.test(coherence.summaryLines[0] ?? ""),
  "card summary does not compete with recommendation band"
);
assert.ok(
  coherence.summaryLines.some((line) => line.includes("Ranked first")) ||
    coherence.rankingRationaleLine.includes("Ranked first"),
  "phase 14.1 ranking rationale preserved"
);
assert.ok(coherence.intentIntelligence.intentMatchScore >= 0, "phase 21 intent intelligence preserved");
assert.ok(coherence.trustRisk.trustScore > 0, "trust/risk bound on coherent decision");
assert.ok(
  coherence.expandedSignals.some(
    (line) => line.includes("Trust") || line.includes("risk") || line.includes("Seller")
  ),
  "trust/risk exposed in expanded intelligence"
);
assert.ok(
  coherence.smartDecisionLines.some(
    (line) => line.includes("Trust") || line.includes("risk") || line.includes("Seller")
  ),
  "trust/risk exposed in decision lines"
);

console.log("phase220-trust-risk-activation: ok");
