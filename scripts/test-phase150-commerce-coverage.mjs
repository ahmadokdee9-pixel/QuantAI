#!/usr/bin/env node
/**
 * Phase 15.0 — Universal Commerce Coverage Layer tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateCommerceCoverage,
  buildCommerceCoverageTray,
  mergeCommerceCoverageChip,
  normalizeMerchantOffer,
  resolveFamilyMembers,
} from "../lib/ui/commerceCoverageActivation.ts";
import { buildUnifiedMarketGroup } from "../lib/intelligence/unifiedMarketMatching.ts";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";

const airpodsCoolblue = {
  id: 1,
  link: "https://shop.example/coolblue-airpods",
  title: "Apple AirPods Pro 2 USB-C MagSafe Case",
  store: "Coolblue",
  price: 229,
  oldPrice: 279,
  rating: 4.7,
  reviewsCount: 820,
  availability: "In stock",
  shipping: "Free delivery tomorrow",
  extensions: [],
  image: "",
};

const airpodsBol = {
  id: 2,
  link: "https://shop.example/bol-airpods",
  title: "Apple AirPods Pro 2 USB-C MagSafe Case",
  store: "Bol.com",
  price: 219,
  oldPrice: 269,
  rating: 4.6,
  reviewsCount: 640,
  availability: "In stock",
  shipping: "Delivered in 1-2 days",
  extensions: [],
  image: "",
};

const galaxyBuds = {
  id: 3,
  link: "https://shop.example/mediamarkt-buds",
  title: "Samsung Galaxy Buds2 Pro Graphite",
  store: "MediaMarkt",
  price: 149,
  rating: 4.5,
  reviewsCount: 210,
  availability: "Out of stock",
  shipping: "Pickup available",
  extensions: [],
  image: "",
};

const trayProducts = [airpodsCoolblue, airpodsBol, galaxyBuds];

// ── UI wiring guards ───────────────────────────────────────────────────────────
const cardBody = readFileSync(join(process.cwd(), "components", "search", "IntelligenceCardBody.tsx"), "utf8");
assert.ok(cardBody.includes("commerceCoverage"), "card consumes commerce coverage");
assert.ok(cardBody.includes("viewAllOffersLabel"), "view all offers enabled in existing merchant slot");
assert.ok(!cardBody.includes("qa-ref-intel-card__coverage-panel"), "no new UI panels");

const drawer = readFileSync(join(process.cwd(), "components", "search/ProductIntelligenceDrawer.tsx"), "utf8");
assert.ok(drawer.includes("View all offers"), "drawer uses existing fold for matched offers");

const surface = readFileSync(join(process.cwd(), "components", "search/ProductResultsSurface.tsx"), "utf8");
assert.ok(surface.includes("buildCommerceCoverageTray"), "results surface builds commerce coverage");

const route = readFileSync(join(process.cwd(), "app/api/search/route.ts"), "utf8");
assert.ok(!route.includes("commerceCoverageActivation"), "search route unchanged");
assert.ok(route.includes("executeControlledRanking"), "ranking execution preserved");
assert.ok(route.includes("applyVerdictIntelligence"), "verdict system preserved");

const coverageSrc = readFileSync(join(process.cwd(), "lib/ui/commerceCoverageActivation.ts"), "utf8");
assert.ok(!coverageSrc.includes("buildDeterministicRanking"), "no ranking engine changes");
assert.ok(!coverageSrc.includes("semanticRerankSearchResults"), "no search sorting changes");
assert.ok(!coverageSrc.includes("openai"), "no new AI generation");

// ── Normalization ──────────────────────────────────────────────────────────────
const normalized = normalizeMerchantOffer(airpodsCoolblue, airpodsCoolblue.link);
assert.ok(normalized.normalizedTitle.toLowerCase().includes("airpods"), "title normalized");
assert.equal(normalized.availabilityStatus, "In stock");
assert.ok(normalized.discountPct != null && normalized.discountPct > 0, "discount metadata normalized");
assert.ok(normalized.shippingLabel.includes("delivery"), "shipping normalized");

// ── Product matching + aggregation ─────────────────────────────────────────────
const manualGroups = [
  {
    familyId: "fam_airpods",
    memberIndices: [0, 1],
    groupConfidence: 0.91,
    duplicateSpamPenalty: 0,
    identityReasons: ["same_canonical_identity"],
  },
];
const familyMembers = resolveFamilyMembers(airpodsCoolblue, trayProducts, manualGroups);
assert.equal(familyMembers.length, 2, "matching offers resolved for product family");

const manualInsight = {
  familyId: "fam_airpods",
  storeCount: 2,
  listingCount: 2,
  bestTrustedPrice: 219,
  bestTrustedStore: "Bol.com",
  bestTrustedLink: airpodsBol.link,
  marketSpreadPct: 4,
  offerCount: 2,
  averageMarketPrice: 224,
  highestDiscountPct: 22,
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
  fairMarketRangeLabel: "€219–€229",
  identityReasons: ["same_canonical_identity"],
};

const leadCoverage = activateCommerceCoverage({
  product: airpodsCoolblue,
  familyMembers,
  insight: manualInsight,
});
const altCoverage = activateCommerceCoverage({
  product: airpodsBol,
  familyMembers,
  insight: manualInsight,
});

assert.ok(leadCoverage.merchantCount >= 2, "merchant count exposed");
assert.ok(leadCoverage.lowestPrice <= 219, "lowest available price exposed");
assert.ok(leadCoverage.highestDiscountPct != null, "highest discount exposed");
assert.ok(leadCoverage.bestTrustedMerchant.length > 0, "best trusted merchant exposed");
assert.ok(leadCoverage.availabilityStatus.length > 0, "availability status exposed");
assert.equal(leadCoverage.viewAllOffersEnabled, true);
assert.equal(leadCoverage.viewAllOffersLabel, "View all offers");
assert.ok(leadCoverage.offers.length >= 2, "offer list populated");
assert.ok(altCoverage.offers.some((offer) => offer.link === airpodsBol.link), "secondary keeps product-scoped offers");

const coverageMap = buildCommerceCoverageTray(trayProducts, "apple airpods pro");
assert.equal(coverageMap.size, trayProducts.length, "coverage map covers tray listings");
const unrelatedCoverage = coverageMap.get(galaxyBuds.link);
assert.equal(unrelatedCoverage?.merchantCount, 1, "unrelated product stays single-merchant scope");

const liveGroups = buildUnifiedMarketGroup(trayProducts, "apple airpods pro").groups;
assert.ok(Array.isArray(liveGroups), "product matching layer delegates to unified market matcher");

// ── Phase 14.0 / 14.1 preservation ───────────────────────────────────────────────
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
  },
  decisionBrief: {
    headline: "Buy lead",
    recommendation: {
      label: "Top pick",
      title: airpodsCoolblue.title,
      store: airpodsCoolblue.store,
      link: airpodsCoolblue.link,
      price: airpodsCoolblue.price,
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
  product: airpodsCoolblue,
  list: trayProducts,
  rank: 0,
  tray,
});
assert.equal(coherence.verdict, "BUY READY", "phase 14.0 verdict authority preserved");

const chips = mergeCommerceCoverageChip([], leadCoverage, 2);
assert.ok(chips[0]?.label.includes("merchants"), "coverage chip uses existing intel chip slot");

console.log("phase150-commerce-coverage-activation: ok");
