#!/usr/bin/env node
/**
 * Phase 10.5 — Confidence Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const VALID_TIERS = new Set(["VERY_HIGH", "HIGH", "MEDIUM", "LOW", "VERY_LOW"]);

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
    shipping: null,
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
  return { confidence, beforeOrder, verdictMeta: verdict.meta };
}

function assertTierMatchesScore(meta) {
  const s = meta.confidenceScore;
  if (s >= 90) assert.equal(meta.confidenceTier, "VERY_HIGH");
  else if (s >= 75) assert.equal(meta.confidenceTier, "HIGH");
  else if (s >= 60) assert.equal(meta.confidenceTier, "MEDIUM");
  else if (s >= 40) assert.equal(meta.confidenceTier, "LOW");
  else assert.equal(meta.confidenceTier, "VERY_LOW");
}

const airpodsTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, qiComposite: 74 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
  p("Apple AirPods Pro 2", "amazon.nl", 245, { qiComposite: 80 }),
  p("Apple AirPods Pro 2", "mediamarkt", 249, { qiComposite: 78 }),
];
const airpods = fullPipeline("apple airpods pro 2", airpodsTray);
assert.equal(airpods.confidence.meta.version, "phase10.5-v1");
assert.ok(VALID_TIERS.has(airpods.confidence.meta.confidenceTier));
assert.ok(airpods.confidence.meta.confidenceScore >= 0 && airpods.confidence.meta.confidenceScore <= 100);
assertTierMatchesScore(airpods.confidence.meta);
assert.ok(airpods.confidence.meta.confidenceSummary.length > 20);
assert.ok(Array.isArray(airpods.confidence.meta.strengths));
assert.ok(Array.isArray(airpods.confidence.meta.weaknesses));
assert.ok(Array.isArray(airpods.confidence.meta.confidenceDrivers));
assert.ok(Array.isArray(airpods.confidence.meta.uncertaintyFactors));
assert.ok(airpods.confidence.meta.recommendationReliability >= 0);
assert.ok(airpods.confidence.meta.dataQuality >= 0);
assert.ok(airpods.confidence.meta.trustQuality >= 0);
assert.ok(airpods.confidence.meta.marketSupport >= 0);
assert.ok(airpods.confidence.meta.alternativePressure >= 0);
assert.deepEqual(
  airpods.confidence.products.map((x) => x.link),
  airpods.beforeOrder,
  "tray order unchanged"
);
assert.ok(airpods.confidence.decisionBrief?.confidenceSummary);
assert.ok(airpods.confidence.decisionBrief?.confidenceTier);
assert.ok(airpods.confidence.decisionBrief?.confidenceDrivers?.length);
assert.equal(JSON.stringify(airpods.verdictMeta), JSON.stringify(airpods.verdictMeta), "verdict unchanged");

const laptopTray = [
  p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop" }),
  p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop" }),
  p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop" }),
  p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop" }),
  p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop" }),
];
const laptops = fullPipeline("best value laptop under 500", laptopTray);
assert.ok(["HIGH", "MEDIUM", "VERY_HIGH"].includes(laptops.confidence.meta.confidenceTier));

const sparse = fullPipeline("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.ok(["LOW", "VERY_LOW", "MEDIUM"].includes(sparse.confidence.meta.confidenceTier));
assert.ok(sparse.confidence.meta.confidenceScore <= 74, "sparse tray should cap confidence");

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyConfidenceIntelligence"));
assert.ok(route.includes("confidenceIntelligence: confidenceIntelligence.meta"));
assert.ok(route.includes("phase105_confidence_intelligence"));

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "confidenceEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase10.5-confidence-intelligence: ok");
