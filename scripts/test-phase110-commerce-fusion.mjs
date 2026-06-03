#!/usr/bin/env node
/**
 * Phase 11.0 — Commerce Intelligence Fusion tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyCommerceFusion } from "../lib/intelligence/commerceFusionEngine.ts";
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

const VALID_TIERS = new Set([
  "INSTITUTIONAL_GRADE",
  "PROFESSIONAL_GRADE",
  "CONSUMER_GRADE",
  "SPECULATIVE",
  "WEAK",
]);

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

function fullPipeline(query, tray) {
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
  const fusion = applyCommerceFusion({
    products: phase95.products,
    decisionBrief: deal.decisionBrief,
    verdictIntelligence: explained.verdictIntelligence,
    explainability: explained.meta,
    alternativeIntelligence: alt.meta,
    marketContext: market.meta,
    competitiveIntelligence: competitive.meta,
    confidenceIntelligence: confidence.meta,
    intentAlignment: alignment.meta,
    personalization: personalization.meta,
    retailerIntelligence: retailer.meta,
    dealIntelligence: deal.meta,
  });
  return {
    fusion,
    dealMeta: deal.meta,
    retailerMeta: retailer.meta,
    confidenceMeta: confidence.meta,
    beforeOrder,
    verdictMeta: verdict.meta,
    altMeta: alt.meta,
  };
}

function assertTierMatchesScore(meta) {
  const s = meta.fusionScore;
  if (s >= 90) assert.equal(meta.fusionTier, "INSTITUTIONAL_GRADE");
  else if (s >= 75) assert.equal(meta.fusionTier, "PROFESSIONAL_GRADE");
  else if (s >= 60) assert.equal(meta.fusionTier, "CONSUMER_GRADE");
  else if (s >= 40) assert.equal(meta.fusionTier, "SPECULATIVE");
  else assert.equal(meta.fusionTier, "WEAK");
}

const strongTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84, oldPrice: 279 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
  p("Apple AirPods Pro 2", "amazon.nl", 245, { qiComposite: 80 }),
  p("Apple AirPods Pro 2", "mediamarkt", 249, { qiComposite: 78 }),
  p("Apple AirPods Pro 2", "bcc", 242, { qiComposite: 77 }),
];
const strong = fullPipeline("apple airpods pro 2", strongTray);
assert.equal(strong.fusion.meta.version, "phase11-v1");
assert.ok(VALID_TIERS.has(strong.fusion.meta.fusionTier));
assert.ok(strong.fusion.meta.fusionScore >= 40);
assertTierMatchesScore(strong.fusion.meta);
assert.ok(strong.fusion.meta.institutionalQuality >= 0);
assert.ok(strong.fusion.meta.recommendationIntegrity >= 0);
assert.ok(strong.fusion.meta.confidenceIntegrity >= 0);
assert.ok(Array.isArray(strong.fusion.meta.strengths));
assert.ok(Array.isArray(strong.fusion.meta.weaknesses));
assert.ok(Array.isArray(strong.fusion.meta.warnings));
assert.ok(strong.fusion.decisionBrief?.fusionSummary);
assert.ok(["PROFESSIONAL_GRADE", "CONSUMER_GRADE", "INSTITUTIONAL_GRADE"].includes(strong.fusion.meta.fusionTier));

const risky = fullPipeline("apple airpods pro 2 mega deal", [
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, reviewsCount: 8, rating: 3.4 }),
]);
assert.ok(risky.fusion.meta.fusionScore <= strong.fusion.meta.fusionScore);
assert.ok(
  risky.fusion.meta.weaknesses.length >= 1 ||
    risky.fusion.meta.warnings.length >= 1 ||
    ["SPECULATIVE", "WEAK", "CONSUMER_GRADE"].includes(risky.fusion.meta.fusionTier)
);

const sparse = fullPipeline("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.ok(sparse.fusion.meta.fusionScore <= 72);
assert.ok(
  sparse.fusion.meta.warnings.some((w) => /sparse tray/i.test(w)) ||
    sparse.fusion.decisionBrief?.fusionSummary?.includes("Consumer") ||
    sparse.fusion.meta.fusionTier === "SPECULATIVE" ||
    sparse.fusion.meta.fusionTier === "WEAK"
);

assert.deepEqual(
  strong.fusion.products.map((x) => x.link),
  strong.beforeOrder,
  "tray order unchanged"
);
assert.equal(JSON.stringify(strong.verdictMeta), JSON.stringify(strong.verdictMeta), "verdict unchanged");
assert.equal(JSON.stringify(strong.altMeta), JSON.stringify(strong.altMeta), "alternatives unchanged");

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyCommerceFusion"));
assert.ok(route.includes("commerceFusion: commerceFusion.meta"));
assert.ok(route.includes("phase110_commerce_fusion"));

const src = readFileSync(join(process.cwd(), "lib/intelligence/commerceFusionEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase11.0-commerce-fusion: ok");
