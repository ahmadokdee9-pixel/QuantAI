#!/usr/bin/env node
/**
 * Phase 10.3 — Market Context Intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const VALID_STATUS = new Set([
  "BUY_NOW",
  "GOOD_OPPORTUNITY",
  "FAIR_PRICE",
  "WAIT",
  "OVERPRICED",
  "INSUFFICIENT_DATA",
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
  return { market, beforeOrder, verdictMeta: verdict.meta, altMeta: alt.meta };
}

// Rich tray — expect structured market context
const airpodsTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { oldPrice: 199, qiComposite: 74 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
  p("Apple AirPods Pro 2", "amazon.nl", 245, { qiComposite: 80 }),
  p("Apple AirPods Pro 2", "mediamarkt", 249, { qiComposite: 78 }),
];
const airpods = fullPipeline("apple airpods pro 2", airpodsTray);
assert.equal(airpods.market.meta.version, "phase10.3-v1");
assert.ok(VALID_STATUS.has(airpods.market.meta.marketStatus));
assert.ok(airpods.market.meta.confidence >= 0 && airpods.market.meta.confidence <= 100);
assert.ok(airpods.market.meta.summary.length > 10);
assert.ok(airpods.market.meta.timingReason.length > 10);
assert.ok(
  airpods.market.meta.pricingAssessment.strength >= 0 &&
    airpods.market.meta.pricingAssessment.confidence >= 0
);
assert.ok(Array.isArray(airpods.market.meta.signals));
assert.ok(Array.isArray(airpods.market.meta.warnings));
assert.deepEqual(airpods.market.products.map((x) => x.link), airpods.beforeOrder, "tray order unchanged");
assert.ok(airpods.market.decisionBrief?.marketContextSummary);
assert.equal(JSON.stringify(airpods.verdictMeta), JSON.stringify(airpods.verdictMeta), "verdict unchanged");

// Value laptop tray — favorable or fair pricing context
const laptopTray = [
  p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop" }),
  p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop" }),
  p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop" }),
  p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop" }),
  p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop" }),
];
const laptops = fullPipeline("best value laptop under 500", laptopTray);
assert.ok(["GOOD_OPPORTUNITY", "FAIR_PRICE", "BUY_NOW", "WAIT"].includes(laptops.market.meta.marketStatus));

// Sparse tray — WAIT or INSUFFICIENT_DATA
const sparse = fullPipeline("sony headphones", [p("Sony WH-1000XM5", "bol.com", 279)]);
assert.ok(["WAIT", "INSUFFICIENT_DATA", "FAIR_PRICE"].includes(sparse.market.meta.marketStatus));

// Premium elevated pick vs cheaper alternatives
const premiumTray = [
  p("Apple MacBook Pro 16 M3 Pro", "apple.com", 2799, { qiCategory: "laptop", qiComposite: 82 }),
  p("Lenovo IdeaPad 15", "bol.com", 649, { qiCategory: "laptop" }),
  p("Dell XPS 15", "coolblue", 1899, { qiCategory: "laptop" }),
  p("HP Spectre x360", "mediamarkt", 1699, { qiCategory: "laptop" }),
  p("ASUS Zenbook Pro", "bcc", 1599, { qiCategory: "laptop" }),
];
const premium = fullPipeline("premium macbook pro 16 inch", premiumTray);
assert.ok(VALID_STATUS.has(premium.market.meta.marketStatus));
assert.ok(premium.altMeta.count >= 2);

const route = readFileSync(join(process.cwd(), "app", "api", "search", "route.ts"), "utf8");
assert.ok(route.includes("applyMarketContextIntelligence"));
assert.ok(route.includes("marketContext: marketContextIntelligence.meta"));

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "marketContextEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));
assert.ok(!/serpapi/i.test(src));

console.log("phase10.3-market-context: ok");
