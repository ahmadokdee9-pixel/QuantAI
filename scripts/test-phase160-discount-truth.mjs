#!/usr/bin/env node
/**
 * Phase 16.0 — Discount Truth Activation Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateDiscountTruth,
  buildDiscountTruthTray,
  mergeDiscountTruthChip,
  mergeDiscountTruthExpandedLines,
} from "../lib/ui/discountTruthActivation.ts";
import {
  activateCommerceCoverage,
  buildCommerceCoverageTray,
  normalizeMerchantOffer,
  resolveFamilyMembers,
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

const stableDeal = {
  ...productBase,
  id: 1,
  link: "https://shop.example/stable-deal",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Coolblue",
  price: 219,
  oldPrice: 269,
  priceTrend: "stable",
};

const peerListing = {
  ...productBase,
  id: 2,
  link: "https://shop.example/peer-listing",
  title: "Apple AirPods Pro 2 USB-C",
  store: "Bol.com",
  price: 229,
  oldPrice: 279,
  priceTrend: "stable",
};

const inflatedDeal = {
  ...stableDeal,
  id: 3,
  link: "https://shop.example/inflated-deal",
  priceTrend: "up",
};

const noHistoryDeal = {
  ...stableDeal,
  id: 4,
  link: "https://shop.example/no-history",
  oldPrice: undefined,
  price: 219,
};

const trayProducts = [stableDeal, peerListing, inflatedDeal, noHistoryDeal];

// ── UI wiring guards ───────────────────────────────────────────────────────────
const cardBody = readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("mergeDiscountTruthChip"), "card consumes discount truth chip slot");
assert.ok(!cardBody.includes("qa-ref-intel-card__discount-truth-panel"), "no new UI panels");

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("buildCommerceCoverageTray"), "commerce coverage still wired");
assert.ok(!surface.includes("buildDiscountTruthTray"), "discount truth bound via coherence layer");

const coherenceSrc = readFileSync(join(process.cwd(), "lib/ui/decisionCoherenceActivation.ts"), "utf8");
assert.ok(coherenceSrc.includes("activateDiscountTruth"), "coherence activates discount truth per listing");
assert.ok(coherenceSrc.includes("discountTruth"), "coherent decision exposes discount truth");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("discountTruthActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const truthSrc = readFileSync(join(process.cwd(), "lib/ui/discountTruthActivation.ts"), "utf8");
assert.ok(!truthSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!truthSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!truthSrc.includes("openai"), "no new AI generation");

// ── Metrics + verdicts ─────────────────────────────────────────────────────────
const stableTruth = activateDiscountTruth({ product: stableDeal, list: trayProducts });
assert.equal(stableTruth.metrics.currentPrice, 219);
assert.ok(stableTruth.metrics.historicalPriceBaseline != null, "historical baseline computed");
assert.ok(stableTruth.metrics.lowestObservedPrice != null, "lowest observed price computed");
assert.ok(stableTruth.metrics.averageHistoricalPrice != null, "average historical price computed");
assert.ok(stableTruth.metrics.discountConsistency >= 0 && stableTruth.metrics.discountConsistency <= 1);
assert.equal(stableTruth.metrics.priceIncreaseBeforePromotion, false);
assert.ok(stableTruth.metrics.discountConfidence >= 0);
assert.ok(
  stableTruth.verdict === "Genuine" || stableTruth.verdict === "Likely Genuine",
  "stable promotion resolves as genuine family"
);
assert.ok(stableTruth.explanation.length > 0, "discount explanation exposed");
assert.ok(stableTruth.chipLabel.includes("%"), "discount confidence exposed on chip");

const inflatedTruth = activateDiscountTruth({ product: inflatedDeal, list: trayProducts });
assert.equal(inflatedTruth.verdict, "Inflated");
assert.equal(inflatedTruth.reason, "Price increased shortly before discount.");
assert.equal(inflatedTruth.metrics.priceIncreaseBeforePromotion, true);

const uncertainTruth = activateDiscountTruth({ product: noHistoryDeal, list: [noHistoryDeal] });
assert.equal(uncertainTruth.verdict, "Uncertain");
assert.equal(uncertainTruth.reason, "Insufficient history.");

const trayMap = buildDiscountTruthTray(trayProducts);
assert.equal(trayMap.size, trayProducts.length, "tray map covers all listings");
assert.ok(trayMap.get(inflatedDeal.link)?.verdict === "Inflated", "tray map preserves inflated verdict");

// ── Presentation merges ────────────────────────────────────────────────────────
const chips = mergeDiscountTruthChip([], stableTruth, 2);
assert.ok(chips[0]?.label.includes(stableTruth.verdict), "discount truth label on chip");
const expanded = mergeDiscountTruthExpandedLines(["Existing line"], stableTruth, 3);
assert.ok(expanded[0]?.includes(stableTruth.verdict), "discount truth card line merged");

// ── Phase 93 override in market context ────────────────────────────────────────
const phase93Assessment = {
  link: inflatedDeal.link,
  store: inflatedDeal.store,
  trustScore: 70,
  retailerConfidence: 68,
  fakeDiscountRisk: "high",
  fakeDiscountProbability: 0.82,
  discountAuthenticity: 28,
  suspiciousSeller: false,
  suspiciousSellerReasons: [],
  priceAnomaly: "none",
  priceAnomalyFlags: [],
};

const market = activateMarketContext({
  discountTruth: inflatedTruth,
  phase93Assessment,
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
assert.ok(
  market?.discountReal.includes("inflated") || market?.discountReal.includes("verification"),
  "phase 93 still overrides discount truth on high fake discount risk"
);

// ── Phase 15.0 commerce coverage preservation ──────────────────────────────────
const manualGroups = [
  {
    familyId: "fam_airpods",
    memberIndices: [0, 1],
    groupConfidence: 0.91,
    duplicateSpamPenalty: 0,
    identityReasons: ["same_canonical_identity"],
  },
];
const familyMembers = resolveFamilyMembers(stableDeal, trayProducts, manualGroups);
const manualInsight = {
  familyId: "fam_airpods",
  storeCount: 2,
  listingCount: 2,
  bestTrustedPrice: 219,
  bestTrustedStore: "Coolblue",
  bestTrustedLink: stableDeal.link,
  marketSpreadPct: 4,
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
  fairMarketRangeLabel: "€219–€229",
  identityReasons: ["same_canonical_identity"],
};

const coverage = activateCommerceCoverage({
  product: stableDeal,
  familyMembers,
  insight: manualInsight,
  list: trayProducts,
});
assert.equal(coverage.viewAllOffersEnabled, true, "commerce coverage unchanged");
assert.ok(
  coverage.offers.every((offer) => /\d+%/.test(offer.discountLabel) || offer.discountLabel.includes("No listed")),
  "merchant offer discount label uses discount truth confidence"
);

const offerTruth = activateDiscountTruth({ product: stableDeal, list: trayProducts });
const normalized = normalizeMerchantOffer(stableDeal, stableDeal.link, "€", offerTruth);
assert.ok(normalized.discountLabel.includes(String(offerTruth.confidence)), "offer exposes discount confidence");

const coverageMap = buildCommerceCoverageTray(trayProducts, "apple airpods pro");
assert.equal(coverageMap.size, trayProducts.length, "commerce coverage map still covers tray");

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
      title: stableDeal.title,
      store: stableDeal.store,
      link: stableDeal.link,
      price: stableDeal.price,
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
  product: stableDeal,
  list: trayProducts,
  rank: 0,
  tray,
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");
assert.ok(coherence.rankingRationaleLine.length > 0, "phase 14.1 ranking rationale preserved");
assert.ok(coherence.discountTruth.verdict.length > 0, "discount truth bound on coherent decision");
assert.ok(
  coherence.activatedMarket?.discountReal === coherence.discountTruth.explanation ||
    coherence.activatedMarket?.discountReal.includes("discount"),
  "market context exposes discount truth explanation"
);

console.log("phase160-discount-truth-activation: ok");
