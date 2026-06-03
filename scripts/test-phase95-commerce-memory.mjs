#!/usr/bin/env node
/**
 * Phase 9.5 — Commerce memory & preference intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "../lib/intelligence/commerceSessionMemory.ts";
import { applyPhase95CommerceMemory } from "../lib/intelligence/phase95CommerceMemory.ts";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { applyPhase92TrayIntegrity } from "../lib/search/phase92TrayIntegrity.ts";
import { applyPhase93TrustDiscountHardening } from "../lib/intelligence/phase93TrustDiscountHardening.ts";

let linkSeq = 0;
function p(title, store, price, extra = {}) {
  linkSeq += 1;
  return {
    title,
    store,
    price,
    link: extra.link ?? `https://example.com/item-${linkSeq}`,
    image: "",
    rating: 4.2,
    reviewsCount: 40,
    extensions: extra.extensions ?? [],
    oldPrice: extra.oldPrice ?? null,
    shipping: null,
    availability: null,
    qiComposite: extra.qiComposite ?? 72,
    qiCategory: extra.qiCategory ?? "general",
    qiBuyingDecision: { confidence: extra.qiComposite ?? 72, action: "STRONG_VALUE" },
  };
}

function runPipeline(query, tray, session = EMPTY_COMMERCE_SESSION_MEMORY) {
  const phase94 = buildPhase94QueryIntelligence(query);
  const intent = extractSearchIntent(query, phase94.canonicalQuery);
  const upgraded = applySearchIntelligenceUpgrade(tray, query, phase94.canonicalQuery);
  const phase92 = applyPhase92TrayIntegrity(upgraded.products, query, intent, phase94.canonicalQuery);
  const phase93 = applyPhase93TrustDiscountHardening(phase92.products, query, {
    decisionBrief: upgraded.meta.decisionBrief,
    baseDiscount: upgraded.meta.discountIntelligence,
  });
  return applyPhase95CommerceMemory(phase93.products, query, {
    canonicalQuery: phase94.canonicalQuery,
    sessionMemory: session,
    queryIntelligence: phase94.meta,
    intent,
    decisionBrief: phase93.decisionBrief,
  });
}

// ── Repeated premium laptop intent ───────────────────────────────────────────
const premiumSession = {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  preferredBrands: ["apple", "macbook"],
  categoryAffinity: { laptop: 4 },
  priceComfortCenter: 1800,
  priceComfortSamples: 5,
  interactionCount: 6,
  styleTags: ["premium", "professional"],
};
const laptopTray = [
  p("Lenovo IdeaPad 15", "bol.com", 649, { qiCategory: "laptop", qiComposite: 74 }),
  p("Apple MacBook Pro 16 M3 Pro", "apple.com", 2799, { qiCategory: "laptop", qiComposite: 68 }),
  p("HP Pavilion 15", "coolblue", 599, { qiCategory: "laptop", qiComposite: 70 }),
];
const premiumRun = runPipeline("premium macbook pro 16 inch", laptopTray, premiumSession);
assert.equal(premiumRun.meta.version, "phase9.5-v1");
assert.equal(premiumRun.meta.inferredPriceTier, "premium");
assert.ok(premiumRun.meta.inferredBrandAffinity === "apple");
assert.ok(premiumRun.meta.confidence >= 0.6);
assert.match(premiumRun.products[0].title, /MacBook Pro/i, "premium Apple laptop should rank first");

// ── Budget headphones intent ──────────────────────────────────────────────────
const budgetRun = runPipeline(
  "cheap wireless headphones under 80",
  [
    p("Sony WH-1000XM5", "bol.com", 279, { qiCategory: "audio", qiComposite: 80 }),
    p("JBL Tune 510BT Wireless", "coolblue", 49, { qiCategory: "audio", qiComposite: 66 }),
    p("Anker Soundcore Q20", "amazon.nl", 59, { qiCategory: "audio", qiComposite: 64 }),
  ],
  { ...EMPTY_COMMERCE_SESSION_MEMORY, priceComfortCenter: 70, priceComfortSamples: 3, interactionCount: 2 }
);
assert.ok(["budget", "value"].includes(budgetRun.meta.inferredPriceTier));
assert.ok(budgetRun.meta.appliedAdjustments.length >= 1 || budgetRun.meta.confidence >= 0.45);

// ── Arabic/English mixed preference query ─────────────────────────────────────
const mixedRun = runPipeline(
  "افضل sony headphones under 150",
  [
    p("Sony WH-CH520 Wireless", "bol.com", 59, { qiCategory: "audio" }),
    p("Generic Bluetooth Headset", "unknown-shop", 22, { qiCategory: "audio", qiComposite: 78 }),
    p("Sony WH-1000XM4", "coolblue", 249, { qiCategory: "audio" }),
  ],
  {
    ...EMPTY_COMMERCE_SESSION_MEMORY,
    preferredBrands: ["sony"],
    categoryAffinity: { audio: 3 },
    interactionCount: 4,
  }
);
assert.ok(mixedRun.meta.inferredBrandAffinity === "sony");
assert.ok(mixedRun.meta.confidence >= 0.55);
assert.match(mixedRun.products[0].title, /Sony/i);

// ── Exact SKU must still win ──────────────────────────────────────────────────
const exactQuery = "samsung galaxy s24 ultra 256gb";
const exactTray = [
  p("Samsung Galaxy S24 Ultra 256GB", "bol.com", 1199, { qiCategory: "phone", qiComposite: 82 }),
  p("Samsung Galaxy S24 Ultra 256GB", "fruugo", 399, { qiCategory: "phone", qiComposite: 76, oldPrice: 1199 }),
  p("Samsung Galaxy S24 Ultra 256GB Graphite", "coolblue", 1249, { qiCategory: "phone", qiComposite: 80 }),
];
const exactRun = runPipeline(exactQuery, exactTray, {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  preferredBrands: ["samsung"],
  categoryAffinity: { phone: 5 },
  interactionCount: 8,
});
assert.equal(exactRun.products[0].store, "bol.com", "trusted exact SKU listing must remain #1");
assert.notEqual(exactRun.products[0].store, "fruugo");

// ── Low-trust marketplace must not win from preference boost ───────────────────
const marketplaceTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiCategory: "audio", qiComposite: 84 }),
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, { qiCategory: "audio", qiComposite: 80, oldPrice: 229 }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiCategory: "audio", qiComposite: 82 }),
];
const marketplaceRun = runPipeline("apple airpods pro 2", marketplaceTray, {
  ...EMPTY_COMMERCE_SESSION_MEMORY,
  preferredBrands: ["apple"],
  categoryAffinity: { audio: 6 },
  interactionCount: 10,
});
assert.notEqual(marketplaceRun.products[0].store, "fruugo", "fruugo must not win via preference boost");
assert.ok(["bol.com", "coolblue"].includes(marketplaceRun.products[0].store));

// ── Decision brief preference note (high confidence) ─────────────────────────
assert.ok(
  marketplaceRun.decisionBrief?.why.some((line) => /preference|Aligned|Lines up/i.test(line)) ||
    marketplaceRun.meta.confidence < 0.72,
  "brief adds preference copy only when confidence is high"
);

// ── No extra SerpAPI / external fetch in phase 9.5 module ────────────────────
const phase95Src = readFileSync(
  join(process.cwd(), "lib", "intelligence", "phase95CommerceMemory.ts"),
  "utf8"
);
assert.ok(!/\bfetch\s*\(/.test(phase95Src), "phase 9.5 must not call fetch()");
assert.ok(!/from\s+["']@?\/?.*serp/i.test(phase95Src), "phase 9.5 must not import SerpAPI clients");

// ── Meta shape ────────────────────────────────────────────────────────────────
assert.ok(premiumRun.meta.preferenceSignals);
assert.ok(typeof premiumRun.meta.confidence === "number");
assert.ok(Array.isArray(premiumRun.meta.appliedAdjustments));
assert.equal(premiumRun.meta.version, "phase9.5-v1");

console.log("phase9.5-commerce-memory: ok");
