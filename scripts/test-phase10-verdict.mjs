#!/usr/bin/env node
/**
 * Phase 10.0 — Verdict Intelligence Engine tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildVerdictIntelligence, applyVerdictIntelligence } from "../lib/intelligence/verdictEngine.ts";
import { applyPhase93TrustDiscountHardening } from "../lib/intelligence/phase93TrustDiscountHardening.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";

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

function verdictInput(query, tray, extra = {}) {
  const phase94 = buildPhase94QueryIntelligence(query);
  const intent = extractSearchIntent(query, phase94.canonicalQuery);
  const upgraded = applySearchIntelligenceUpgrade(tray, query, phase94.canonicalQuery);
  const phase93 = applyPhase93TrustDiscountHardening(tray, query, {
    decisionBrief: upgraded.meta.decisionBrief,
    baseDiscount: upgraded.meta.discountIntelligence,
  });
  return {
    query,
    products: phase93.products,
    decisionBrief: phase93.decisionBrief,
    phase93: phase93.meta,
    intent,
    canonicalQuery: phase94.canonicalQuery,
    queryIntelligence: phase94.meta,
    comparison: upgraded.meta.comparisonIntelligence,
    sparse: upgraded.meta.sparseResult,
    trustRanking: upgraded.meta.trustRanking,
    ...extra,
  };
}

function v(query, tray, extra) {
  return buildVerdictIntelligence(verdictInput(query, tray, extra));
}

// 1. STRONG BUY
const strongTray = [
  p("Sony WH-1000XM5 Wireless", "coolblue", 279, { oldPrice: 349, qiComposite: 86, reviewsCount: 200 }),
  p("Sony WH-1000XM5", "bol.com", 289, { qiComposite: 82 }),
  p("Sony WH-1000XM5", "amazon.nl", 299, { qiComposite: 80 }),
  p("Sony WH-1000XM5 Black", "mediamarkt", 285, { qiComposite: 79 }),
  p("Sony WH-1000XM5 Silver", "bcc", 292, { qiComposite: 77 }),
];
const strong = v("sony wh-1000xm5 trusted retailer", strongTray);
assert.equal(strong.verdict, "STRONG BUY", `expected STRONG BUY, got ${strong.verdict}`);
assert.ok(strong.confidence >= 70);
assert.ok(strong.strengths.length >= 1);

// 2. BUY READY
const readyTray = [
  p("SteelSeries Arctis Nova 7P Wireless PS5", "bol.com", 149, { qiComposite: 74 }),
  p("Sony INZONE H9 Wireless PS5", "coolblue", 199, { qiComposite: 72 }),
  p("Razer BlackShark V2 Pro", "amazon.nl", 179, { qiComposite: 70 }),
  p("Logitech G Pro X Wireless", "mediamarkt", 169, { qiComposite: 68 }),
  p("Corsair HS80 RGB Wireless", "bcc", 159, { qiComposite: 66 }),
  p("Generic Gaming Headset", "unknown-shop", 25, { qiComposite: 70 }),
];
const ready = v("wireless gaming headset ps5", readyTray);
assert.ok(["BUY READY", "STRONG BUY", "BEST VALUE", "CONSIDER"].includes(ready.verdict));
assert.ok(ready.confidence >= 55);
assert.notEqual(ready.verdict, "AVOID");

// 3. BEST VALUE
const valueTray = [
  p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop", qiComposite: 70 }),
  p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop", qiComposite: 76 }),
  p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop", qiComposite: 72 }),
  p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop", qiComposite: 71 }),
  p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop", qiComposite: 69 }),
  p("MacBook Air M2", "apple.com", 1099, { qiCategory: "laptop", qiComposite: 68 }),
];
const valueInput = verdictInput("best value laptop under 500", valueTray);
if (valueInput.decisionBrief && valueInput.comparison?.bestValue) {
  const bv = valueInput.comparison.bestValue;
  valueInput.decisionBrief = {
    ...valueInput.decisionBrief,
    recommendation: {
      label: bv.label,
      title: bv.title,
      store: bv.store,
      link: bv.link,
      price: bv.price,
    },
  };
}
const value = buildVerdictIntelligence(valueInput);
assert.equal(value.verdict, "BEST VALUE");
assert.ok(value.factorTrace.intentValue === true);

// 4. PREMIUM PICK
const premiumTray = [
  p("Apple MacBook Pro 16 M3 Pro", "apple.com", 2799, { qiCategory: "laptop", qiComposite: 82 }),
  p("Lenovo IdeaPad 15", "bol.com", 649, { qiCategory: "laptop", qiComposite: 70 }),
  p("Dell XPS 15", "coolblue", 1899, { qiCategory: "laptop", qiComposite: 74 }),
  p("HP Spectre x360", "mediamarkt", 1699, { qiCategory: "laptop", qiComposite: 72 }),
  p("ASUS Zenbook Pro", "bcc", 1599, { qiCategory: "laptop", qiComposite: 71 }),
];
const premium = v("premium macbook pro 16 inch", premiumTray);
assert.equal(premium.verdict, "PREMIUM PICK");
assert.ok(premium.rationale.includes("Premium"));

// 5. CONSIDER
const considerTray = [
  p("Wireless Headphones Model X", "mid-tier-shop", 89, { qiComposite: 58, reviewsCount: 5 }),
  p("Wireless Headphones Model Y", "another-shop", 95, { qiComposite: 56, reviewsCount: 3 }),
  p("Wireless Headphones Model Z", "third-shop", 79, { qiComposite: 54, reviewsCount: 2 }),
  p("Wireless Headphones Model W", "fourth-shop", 99, { qiComposite: 52, reviewsCount: 1 }),
  p("Wireless Headphones Model V", "fifth-shop", 109, { qiComposite: 50, reviewsCount: 0 }),
];
const consider = v("wireless headphones", considerTray);
assert.ok(["CONSIDER", "WAIT", "BUY READY"].includes(consider.verdict));

// 6. WAIT — sparse tray
const sparseTray = [
  p("Rare Niche Gadget Alpha", "bol.com", 199, { qiComposite: 60 }),
  p("Rare Niche Gadget Beta", "coolblue", 210, { qiComposite: 58 }),
];
const wait = v("obscure specialty gadget xyz123", sparseTray);
assert.equal(wait.verdict, "WAIT");
assert.ok(wait.warnings.some((w) => /Limited listings|market conditions/i.test(w)));

// 7. AVOID — suspicious aggregator
const avoidTray = [
  p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
  p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, {
    oldPrice: 199,
    extensions: ["70% off"],
    qiComposite: 74,
  }),
  p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
];
const avoidInput = verdictInput("apple airpods pro 2", avoidTray);
const avoidFruugo = avoidTray[1];
avoidInput.decisionBrief = {
  headline: "QuantAI Recommendation",
  recommendation: {
    label: "Deal",
    title: avoidFruugo.title,
    store: avoidFruugo.store,
    link: avoidFruugo.link,
    price: avoidFruugo.price,
  },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 72,
  sparseTrayWarning: null,
};
const avoid = buildVerdictIntelligence(avoidInput);
assert.equal(avoid.verdict, "AVOID");
assert.ok(avoid.warnings.length >= 1);

// 8. Fake discount protection
assert.ok(avoid.factorTrace.fakeDiscountRisk === "high" || avoid.factorTrace.suspiciousSeller === true);

// 9. Suspicious seller protection — verdict must not be STRONG BUY for risky pick
const riskyInput = verdictInput("airpods pro deal", avoidTray);
const riskyPick = riskyInput.phase93.trayAssessments.find((a) => a.store === "fruugo");
if (riskyPick?.suspiciousSeller) {
  const riskyVerdict = buildVerdictIntelligence({
    ...riskyInput,
    decisionBrief: {
      headline: "QuantAI Recommendation",
      recommendation: {
        label: "Best",
        title: "Apple AirPods Pro 2 Mega Deal",
        store: "fruugo",
        link: avoidTray[1].link,
        price: 39,
      },
      why: [],
      alternatives: [],
      discountNote: null,
      confidence: 80,
      sparseTrayWarning: null,
    },
  });
  assert.equal(riskyVerdict.verdict, "AVOID");
}

// 10. Exact SKU protection — trusted listing must not be AVOID
const exactTray = [
  p("Samsung Galaxy S24 Ultra 256GB", "bol.com", 1199, { qiCategory: "phone", qiComposite: 84 }),
  p("Samsung Galaxy S24 Ultra 256GB", "fruugo", 399, { qiCategory: "phone", qiComposite: 70, oldPrice: 1199 }),
  p("Samsung Galaxy S24 Ultra 256GB Graphite", "coolblue", 1249, { qiCategory: "phone", qiComposite: 80 }),
  p("Samsung Galaxy S24 Ultra 256GB Titanium", "mediamarkt", 1219, { qiCategory: "phone", qiComposite: 78 }),
  p("Samsung Galaxy S24 Ultra 256GB", "amazon.nl", 1189, { qiCategory: "phone", qiComposite: 77 }),
];
const exact = v("samsung galaxy s24 ultra 256gb", exactTray);
assert.notEqual(exact.verdict, "AVOID", `exact SKU must not be AVOID, got ${exact.verdict}`);
assert.ok(exact.factorTrace.exactSkuMode === true, `exactSkuMode=${exact.factorTrace.exactSkuMode}`);

// applyVerdictIntelligence must not reorder tray
const beforeLinks = exactTray.map((x) => x.link);
const applied = applyVerdictIntelligence(verdictInput("samsung galaxy s24 ultra 256gb", exactTray));
assert.deepEqual(
  applied.products.map((x) => x.link),
  beforeLinks,
  "verdict engine must not mutate product order"
);

// Meta shape
assert.equal(applied.meta.version, "phase10-v1");
assert.ok(applied.meta.rationale.length > 20);
assert.ok(Array.isArray(applied.meta.strengths));
assert.ok(Array.isArray(applied.meta.warnings));
assert.ok(typeof applied.meta.factorTrace === "object");

// No external fetch in module
const src = readFileSync(join(process.cwd(), "lib", "intelligence", "verdictEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src));

console.log("phase10-verdict: ok");
