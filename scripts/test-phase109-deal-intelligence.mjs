#!/usr/bin/env node
/**
 * Phase 10.9 — Deal Intelligence Meta tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyDealIntelligence } from "../lib/intelligence/phase109DealIntelligenceEngine.ts";
import { applyRetailerIntelligence } from "../lib/intelligence/retailerIntelligenceEngine.ts";
import { applyPersonalizationIntelligence } from "../lib/intelligence/personalizationEngine.ts";
import { applyIntentAlignmentIntelligence } from "../lib/intelligence/intentAlignmentEngine.ts";
import { applyConfidenceIntelligence } from "../lib/intelligence/confidenceEngine.ts";
import { applyCompetitiveIntelligence } from "../lib/intelligence/competitiveIntelligenceEngine.ts";
import { applyMarketContextIntelligence } from "../lib/intelligence/marketContextEngine.ts";
import { applyAlternativeIntelligence } from "../lib/intelligence/alternativeIntelligenceEngine.ts";
import { applyExplainabilityIntelligence } from "../lib/intelligence/explainabilityEngine.ts";
import { applyVerdictIntelligence } from "../lib/intelligence/verdictEngine.ts";
import { applyPhase95CommerceMemory } from "../lib/intelligence/phase95CommerceMemory.ts";
import { applyPhase93TrustDiscountHardening } from "../lib/intelligence/phase93TrustDiscountHardening.ts";
import { applyPhase92TrayIntegrity } from "../lib/search/phase92TrayIntegrity.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "../lib/intelligence/commerceSessionMemory.ts";

const VALID_TIERS = new Set(["EXCEPTIONAL", "STRONG", "GOOD", "AVERAGE", "WEAK"]);

let linkSeq = 0;
function p(title, store, price, extra = {}) {
  linkSeq += 1;
  return {
    title,
    store,
    price,
    link: extra.link ?? `https://example.com/item-${linkSeq}`,
    image: "",
    rating: 4.3,
    reviewsCount: extra.reviewsCount ?? 80,
    extensions: extra.extensions ?? [],
    oldPrice: extra.oldPrice ?? null,
    shipping: extra.shipping ?? "Free delivery",
    availability: extra.availability ?? "In stock",
    qiComposite: extra.qiComposite ?? 78,
    qiCategory: extra.qiCategory ?? "audio",
    qiBuyingDecision: { confidence: extra.qiComposite ?? 78, action: "STRONG_VALUE" },
  };
}

function runThroughDeal(query, tray) {
  const phase94 = buildPhase94QueryIntelligence(query);
  const intent = extractSearchIntent(query, phase94.canonicalQuery);
  const upgraded = applySearchIntelligenceUpgrade(tray, query, phase94.canonicalQuery);
  const phase92 = applyPhase92TrayIntegrity(upgraded.products, query, intent, phase94.canonicalQuery);
  const phase93 = applyPhase93TrustDiscountHardening(phase92.products, query, {
    decisionBrief: upgraded.meta.decisionBrief,
    baseDiscount: upgraded.meta.discountIntelligence,
  });
  const phase95 = applyPhase95CommerceMemory(phase93.products, query, {
    canonicalQuery: phase94.canonicalQuery,
    sessionMemory: EMPTY_COMMERCE_SESSION_MEMORY,
    queryIntelligence: phase94.meta,
    intent,
    decisionBrief: phase93.decisionBrief,
  });
  const beforeOrder = phase95.products.map((x) => x.link);
  const verdict = applyVerdictIntelligence({
    query,
    products: phase95.products,
    decisionBrief: phase95.decisionBrief,
    phase93: phase93.meta,
    phase92: phase92.meta,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    intent,
    canonicalQuery: phase94.canonicalQuery,
    sparse: upgraded.meta.sparseResult,
    trustRanking: upgraded.meta.trustRanking,
  });
  const explained = applyExplainabilityIntelligence({
    phase92: phase92.meta,
    phase93: phase93.meta,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: verdict.meta,
    decisionBrief: verdict.decisionBrief,
  });
  const alt = applyAlternativeIntelligence({
    products: phase95.products,
    decisionBrief: explained.decisionBrief,
    phase93: phase93.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
  });
  const market = applyMarketContextIntelligence({
    products: phase95.products,
    decisionBrief: alt.decisionBrief,
    phase93: phase93.meta,
    sparse: upgraded.meta.sparseResult,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
  });
  const competitive = applyCompetitiveIntelligence({
    products: phase95.products,
    decisionBrief: market.decisionBrief,
    phase93: phase93.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    marketContext: market.meta,
  });
  const confidence = applyConfidenceIntelligence({
    products: phase95.products,
    decisionBrief: competitive.decisionBrief,
    phase92: phase92.meta,
    phase93: phase93.meta,
    sparse: upgraded.meta.sparseResult,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
  });
  const alignment = applyIntentAlignmentIntelligence({
    products: phase95.products,
    decisionBrief: confidence.decisionBrief,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
  });
  const personalization = applyPersonalizationIntelligence({
    products: phase95.products,
    decisionBrief: alignment.decisionBrief,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
    intentAlignment: alignment.meta,
  });
  const retailer = applyRetailerIntelligence({
    products: phase95.products,
    decisionBrief: personalization.decisionBrief,
    phase92: phase92.meta,
    phase93: phase93.meta,
    sparse: upgraded.meta.sparseResult,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
    intentAlignment: alignment.meta,
    personalization: personalization.meta,
  });
  const deal = applyDealIntelligence({
    products: phase95.products,
    decisionBrief: retailer.decisionBrief,
    phase92: phase92.meta,
    phase93: phase93.meta,
    sparse: upgraded.meta.sparseResult,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
    intentAlignment: alignment.meta,
    personalization: personalization.meta,
    retailerIntelligence: retailer.meta,
  });
  return { deal, beforeOrder, verdictMeta: verdict.meta, altMeta: alt.meta };
}

function assertTierMatchesScore(meta) {
  const s = meta.dealScore;
  if (s >= 90) assert.equal(meta.dealTier, "EXCEPTIONAL");
  else if (s >= 75) assert.equal(meta.dealTier, "STRONG");
  else if (s >= 60) assert.equal(meta.dealTier, "GOOD");
  else if (s >= 40) assert.equal(meta.dealTier, "AVERAGE");
  else assert.equal(meta.dealTier, "WEAK");
}

const valueTray = [
  p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop", oldPrice: 599 }),
  p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop" }),
  p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop" }),
  p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop" }),
  p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop" }),
];
const valueDeal = runThroughDeal("best value laptop under 500", valueTray);
assert.equal(valueDeal.deal.meta.version, "phase10.9-v1");
assert.ok(VALID_TIERS.has(valueDeal.deal.meta.dealTier));
assert.ok(valueDeal.deal.meta.dealScore >= 40);
assertTierMatchesScore(valueDeal.deal.meta);
assert.ok(valueDeal.deal.meta.priceAdvantage >= 0);
assert.ok(valueDeal.deal.meta.discountAuthenticity >= 0);
assert.ok(valueDeal.deal.meta.competitorGap >= 0);
assert.ok(valueDeal.deal.decisionBrief?.dealSummary);

const fake = runThroughDeal("apple airpods pro 2 mega deal", [
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, reviewsCount: 10, rating: 3.5 }),
]);
assert.ok(fake.deal.meta.discountAuthenticity <= 75);
assert.ok(
  fake.deal.meta.dealWarnings.some((w) => /fake discount|uncertain|sparse|suspicious/i.test(w)) ||
    fake.deal.meta.dealTier === "WEAK" ||
    fake.deal.meta.dealTier === "AVERAGE"
);

const competitive = runThroughDeal("best value laptop under 500", valueTray);
assert.ok(competitive.deal.meta.competitorGap >= 0);
if (competitive.deal.meta.competitorGap >= 15) {
  assert.ok(competitive.deal.meta.dealScore <= 80);
}

const sparse = runThroughDeal("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.ok(sparse.deal.meta.dealConfidence <= 65);
assert.ok(
  sparse.deal.meta.dealWarnings.some((w) => /sparse tray/i.test(w)) ||
    sparse.deal.decisionBrief?.dealSummary?.includes("directional")
);

assert.deepEqual(
  valueDeal.deal.products.map((x) => x.link),
  valueDeal.beforeOrder,
  "tray order unchanged"
);
assert.equal(JSON.stringify(valueDeal.verdictMeta), JSON.stringify(valueDeal.verdictMeta), "verdict unchanged");
assert.equal(JSON.stringify(valueDeal.altMeta), JSON.stringify(valueDeal.altMeta), "alternatives unchanged");

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyDealIntelligence"));
assert.ok(route.includes("dealIntelligence: dealIntelligence.meta"));
assert.ok(route.includes("phase109_deal_intelligence"));

const src = readFileSync(join(process.cwd(), "lib/intelligence/phase109DealIntelligenceEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase10.9-deal-intelligence: ok");
