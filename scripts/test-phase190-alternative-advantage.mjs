#!/usr/bin/env node
/**
 * Phase 19.0 — Alternative Advantage Intelligence Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateAlternativeAdvantage,
  mergeAlternativeAdvantageExpandedLines,
  mergeAlternativeAdvantageExpandedSignals,
} from "../lib/ui/alternativeAdvantageActivation.ts";
import { activateBuyWait } from "../lib/ui/buyWaitActivation.ts";
import { activateDiscountTruth } from "../lib/ui/discountTruthActivation.ts";
import { activatePriceTarget } from "../lib/ui/priceTargetActivation.ts";
import {
  activateCommerceCoverage,
  buildCommerceCoverageTray,
} from "../lib/ui/commerceCoverageActivation.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";

const productBase = {
  extensions: [],
  image: "",
  rating: 4.6,
  reviewsCount: 420,
  shipping: "Free delivery",
};

const leadProduct = {
  ...productBase,
  id: 1,
  link: "https://shop.example/lead",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Coolblue",
  price: 209,
  oldPrice: 269,
  priceTrend: "down",
  availability: "In stock",
};

const altProduct = {
  ...productBase,
  id: 2,
  link: "https://shop.example/alt",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Unknown Marketplace",
  price: 239,
  oldPrice: 279,
  priceTrend: "stable",
  availability: "Out of stock",
  rating: 4.1,
  reviewsCount: 80,
};

const unrelatedProduct = {
  ...productBase,
  id: 3,
  link: "https://shop.example/unrelated",
  title: "Samsung Galaxy Buds2 Pro",
  store: "Bol.com",
  price: 149,
  availability: "In stock",
};

const trayProducts = [leadProduct, altProduct, unrelatedProduct];

const manualInsight = {
  familyId: "fam_airpods",
  storeCount: 2,
  listingCount: 2,
  bestTrustedPrice: 209,
  bestTrustedStore: "Coolblue",
  bestTrustedLink: leadProduct.link,
  marketSpreadPct: 12,
  offerCount: 2,
  averageMarketPrice: 224,
  highestDiscountPct: 22,
  suspiciousOutlierCount: 0,
  merchantDiversityScore: 36,
  isSameProductFamily: true,
  isBestTrustedInFamily: true,
  isLowestRiskInFamily: true,
  familyConsensusHeadline: "Two trusted routes",
  crossMarketHeadline: "Same product across merchants",
  sameItemCheaper: null,
  betterValueAlternative: null,
  premiumUpgrade: null,
  overpricedVsFair: false,
  fairMarketRangeLabel: "€209–€239",
  identityReasons: ["same_canonical_identity"],
};

// ── UI wiring guards ───────────────────────────────────────────────────────────
const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateAlternativeAdvantage"), "coherence activates alternative advantage");
assert.ok(coherenceSrc.includes("alternativeAdvantage"), "coherent decision exposes alternative advantage");

const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(!cardBody.includes("qa-ref-intel-card__advantage-panel"), "no new UI panels");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("alternativeAdvantageActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const advantageSrc = readFileSync(join(process.cwd(), "lib/ui/alternativeAdvantageActivation.ts"), "utf8");
assert.ok(!advantageSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!advantageSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!advantageSrc.includes("openai"), "no new AI generation");

const priceTargetSrc = readFileSync(join(process.cwd(), "lib/ui/priceTargetActivation.ts"), "utf8");
assert.ok(priceTargetSrc.includes("activatePriceTarget"), "price target layer preserved");

const buyWaitSrc = readFileSync(join(process.cwd(), "lib/ui/buyWaitActivation.ts"), "utf8");
assert.ok(buyWaitSrc.includes("activateBuyWait"), "buy/wait layer preserved");

// ── Alternative advantage intelligence ───────────────────────────────────────────
const leadTruth = activateDiscountTruth({ product: leadProduct, list: trayProducts });
const leadCoverage = activateCommerceCoverage({
  product: leadProduct,
  familyMembers: [leadProduct, altProduct],
  insight: manualInsight,
  list: trayProducts,
});
const leadBuyWait = activateBuyWait({
  product: leadProduct,
  list: trayProducts,
  discountTruth: leadTruth,
  commerceCoverage: leadCoverage,
  institutionalVerdict: "BUY READY",
});
const leadPriceTarget = activatePriceTarget({
  product: leadProduct,
  list: trayProducts,
  discountTruth: leadTruth,
  buyWait: leadBuyWait,
  commerceCoverage: leadCoverage,
});

const leadAdvantage = activateAlternativeAdvantage({
  product: leadProduct,
  list: trayProducts,
  isLeadProduct: true,
  discountTruth: leadTruth,
  buyWait: leadBuyWait,
  commerceCoverage: leadCoverage,
});

assert.ok(leadAdvantage.advantageReasons.length > 0, "lead gets advantage reasons");
assert.ok(leadAdvantage.leadAdvantageScore > 0, "lead advantage score computed");
assert.ok(leadAdvantage.comparisonSummary.length > 0, "comparison summary generated");
assert.ok(
  leadAdvantage.advantageReasons.some(
    (line) =>
      line.includes("trust") ||
      line.includes("Price is") ||
      line.includes("Discount confidence") ||
      line.includes("Availability") ||
      line.includes("timing")
  ),
  "advantage reasons cover expected dimensions"
);

const secondaryAdvantage = activateAlternativeAdvantage({
  product: altProduct,
  list: trayProducts,
  isLeadProduct: false,
  discountTruth: activateDiscountTruth({ product: altProduct, list: trayProducts }),
  buyWait: leadBuyWait,
});
assert.equal(secondaryAdvantage.advantageReasons.length, 0, "secondary listings stay scoped");

const expanded = mergeAlternativeAdvantageExpandedSignals(["Existing signal"], leadAdvantage, 3);
assert.ok(expanded.some((line) => line.includes("alternatives") || line.includes("Price is")), "expanded signals merged");
const smart = mergeAlternativeAdvantageExpandedLines(["Existing decision"], leadAdvantage, 3);
assert.ok(smart.length > 0, "smart decision lines merged");

// ── Prior phase preservation ─────────────────────────────────────────────────────
const coverageMap = buildCommerceCoverageTray(trayProducts, "apple airpods pro");
assert.equal(coverageMap.size, trayProducts.length, "commerce coverage unchanged");

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
      title: leadProduct.title,
      store: leadProduct.store,
      link: leadProduct.link,
      price: leadProduct.price,
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
  product: leadProduct,
  list: trayProducts,
  rank: 0,
  tray,
  commerceCoverage: leadCoverage,
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(
  coherence.summaryLines.some((line) => line.includes("Ranked first")) ||
    coherence.rankingRationaleLine.includes("Ranked first"),
  "phase 14.1 ranking rationale preserved"
);
assert.ok(coherence.discountTruth.verdict.length > 0, "phase 16.0 discount truth preserved");
assert.ok(["BUY NOW", "WAIT", "COMPARE"].includes(coherence.buyWait.verdict), "phase 17.0 buy/wait preserved");
assert.ok(coherence.buyWait.confidence > 0, "buy/wait confidence preserved");
assert.ok(coherence.priceTarget.targetBuyPrice > 0, "phase 18.0 price target preserved");
assert.ok(coherence.alternativeAdvantage.leadAdvantageScore > 0, "alternative advantage bound on coherent decision");
assert.ok(coherence.drawerRankingLine.includes("Ranked first"), "drawer ranking rationale preserved");
assert.ok(
  coherence.expandedSignals.some((line) => line.includes("alternatives") || line.includes("Price is")),
  "card expanded signals expose alternative advantage"
);

console.log("phase190-alternative-advantage-activation: ok");
