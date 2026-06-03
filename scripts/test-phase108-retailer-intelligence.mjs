#!/usr/bin/env node
/**
 * Phase 10.8 — Retailer Intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const VALID_TIERS = new Set(["ELITE", "TRUSTED", "ACCEPTABLE", "CAUTION", "RISKY"]);

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
  return { retailer, beforeOrder, verdictMeta: verdict.meta, altMeta: alt.meta };
}

function assertTierMatchesScore(meta) {
  const s = meta.retailerScore;
  if (s >= 90) assert.equal(meta.retailerTier, "ELITE");
  else if (s >= 75) assert.equal(meta.retailerTier, "TRUSTED");
  else if (s >= 60) assert.equal(meta.retailerTier, "ACCEPTABLE");
  else if (s >= 40) assert.equal(meta.retailerTier, "CAUTION");
  else assert.equal(meta.retailerTier, "RISKY");
}

const trustedTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
  p("Apple AirPods Pro 2", "amazon.nl", 245, { qiComposite: 80 }),
  p("Apple AirPods Pro 2", "mediamarkt", 249, { qiComposite: 78 }),
  p("Apple AirPods Pro 2", "bcc", 242, { qiComposite: 77 }),
];
const trusted = fullPipeline("apple airpods pro 2", trustedTray);
assert.equal(trusted.retailer.meta.version, "phase10.8-v1");
assert.ok(VALID_TIERS.has(trusted.retailer.meta.retailerTier));
assert.ok(["ELITE", "TRUSTED", "ACCEPTABLE"].includes(trusted.retailer.meta.retailerTier));
assert.ok(trusted.retailer.meta.retailerScore >= 60);
assert.ok(trusted.retailer.meta.marketplaceRisk <= 45);
assert.ok(trusted.retailer.meta.sellerRisk <= 55);
assert.ok(trusted.retailer.meta.retailerAdvantages.length >= 1);
assertTierMatchesScore(trusted.retailer.meta);
assert.ok(trusted.retailer.decisionBrief?.retailerSummary);

const risky = fullPipeline("apple airpods pro 2 mega deal", [
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, reviewsCount: 12, rating: 3.6 }),
]);
assert.ok(["CAUTION", "RISKY", "ACCEPTABLE"].includes(risky.retailer.meta.retailerTier));
assert.ok(risky.retailer.meta.marketplaceRisk >= 70);
assert.ok(risky.retailer.meta.sellerRisk >= 50);
assert.ok(risky.retailer.meta.retailerWarnings.length >= 1);
assert.ok(
  risky.retailer.meta.retailerWarnings.some(
    (w) => /aggregator|marketplace|seller|risk|suspicious|discount/i.test(w)
  )
);

const sparse = fullPipeline("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.ok(sparse.retailer.meta.retailerConfidence <= 68);
assert.ok(
  sparse.retailer.meta.retailerWarnings.some((w) => /sparse tray/i.test(w)) ||
    sparse.retailer.decisionBrief?.retailerSummary?.includes("directional")
);

assert.deepEqual(
  trusted.retailer.products.map((x) => x.link),
  trusted.beforeOrder,
  "tray order unchanged"
);
assert.equal(JSON.stringify(trusted.verdictMeta), JSON.stringify(trusted.verdictMeta), "verdict unchanged");
assert.equal(JSON.stringify(trusted.altMeta), JSON.stringify(trusted.altMeta), "alternatives unchanged");

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyRetailerIntelligence"));
assert.ok(route.includes("retailerIntelligence: retailerIntelligence.meta"));
assert.ok(route.includes("phase108_retailer_intelligence"));

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "retailerIntelligenceEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase10.8-retailer-intelligence: ok");
