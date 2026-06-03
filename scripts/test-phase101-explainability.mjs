#!/usr/bin/env node
/**
 * Phase 10.1 — Explainability Intelligence tests (offline, no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyExplainabilityIntelligence } from "../lib/intelligence/explainabilityEngine.ts";
import { applyVerdictIntelligence } from "../lib/intelligence/verdictEngine.ts";
import { applyPhase93TrustDiscountHardening } from "../lib/intelligence/phase93TrustDiscountHardening.ts";
import { applyPhase92TrayIntegrity } from "../lib/search/phase92TrayIntegrity.ts";
import { applyPhase95CommerceMemory } from "../lib/intelligence/phase95CommerceMemory.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import { buildPhase94QueryIntelligence } from "../lib/search/phase94QueryIntelligence.ts";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "../lib/intelligence/commerceSessionMemory.ts";

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
    qiCategory: extra.qiCategory ?? "general",
    qiBuyingDecision: { confidence: extra.qiComposite ?? 78, action: "STRONG_VALUE" },
  };
}

function pipelineToExplainInput(query, tray, session = EMPTY_COMMERCE_SESSION_MEMORY, briefOverride = null) {
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
    sessionMemory: session,
    queryIntelligence: phase94.meta,
    intent,
    decisionBrief: phase93.decisionBrief,
  });
  const verdict = applyVerdictIntelligence({
    query,
    products: phase95.products,
    decisionBrief: briefOverride ?? phase95.decisionBrief,
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

  const beforeProducts = phase95.products.map((x) => x.link);
  const beforeVerdict = JSON.stringify(verdict.meta);

  const explainInput = {
    phase92: phase92.meta,
    phase93: phase93.meta,
    queryIntelligence: phase94.meta,
    commerceMemory: phase95.meta,
    verdictIntelligence: verdict.meta,
    decisionBrief: verdict.decisionBrief,
  };

  const explained = applyExplainabilityIntelligence(explainInput);

  return {
    explained,
    beforeProducts,
    beforeVerdict,
    verdictMeta: verdict.meta,
    phase95Products: phase95.products,
  };
}

function assertNoMutation(ctx, label) {
  assert.deepEqual(
    ctx.explained.verdictIntelligence,
    ctx.verdictMeta,
    `${label}: verdict must not change`
  );
  assert.deepEqual(
    ctx.phase95Products.map((x) => x.link),
    ctx.beforeProducts,
    `${label}: tray must not change`
  );
}

const scenarios = [
  {
    label: "STRONG BUY",
    query: "sony wh-1000xm5 trusted retailer",
    tray: [
      p("Sony WH-1000XM5 Wireless", "coolblue", 279, { oldPrice: 349, qiComposite: 86 }),
      p("Sony WH-1000XM5", "bol.com", 289, { qiComposite: 82 }),
      p("Sony WH-1000XM5", "amazon.nl", 299, { qiComposite: 80 }),
      p("Sony WH-1000XM5 Black", "mediamarkt", 285, { qiComposite: 79 }),
      p("Sony WH-1000XM5 Silver", "bcc", 292, { qiComposite: 77 }),
    ],
    expectVerdict: "STRONG BUY",
  },
  {
    label: "BUY READY",
    query: "wireless gaming headset ps5",
    tray: [
      p("SteelSeries Arctis Nova 7P Wireless PS5", "bol.com", 149, { qiComposite: 74 }),
      p("Sony INZONE H9 Wireless PS5", "coolblue", 199, { qiComposite: 72 }),
      p("Razer BlackShark V2 Pro", "amazon.nl", 179, { qiComposite: 70 }),
      p("Logitech G Pro X Wireless", "mediamarkt", 169, { qiComposite: 68 }),
      p("Corsair HS80 RGB Wireless", "bcc", 159, { qiComposite: 66 }),
    ],
    expectVerdict: null,
  },
  {
    label: "BEST VALUE",
    query: "best value laptop under 500",
    tray: [
      p("ASUS Vivobook 15", "bol.com", 499, { qiCategory: "laptop" }),
      p("Lenovo IdeaPad Slim 3", "coolblue", 429, { qiCategory: "laptop" }),
      p("HP 15 Laptop", "mediamarkt", 479, { qiCategory: "laptop" }),
      p("Acer Aspire 5", "bcc", 459, { qiCategory: "laptop" }),
      p("Dell Inspiron 15", "amazon.nl", 489, { qiCategory: "laptop" }),
    ],
    expectVerdict: "BEST VALUE",
    alignBestValue: true,
  },
  {
    label: "PREMIUM PICK",
    query: "premium macbook pro 16 inch",
    tray: [
      p("Apple MacBook Pro 16 M3 Pro", "apple.com", 2799, { qiCategory: "laptop", qiComposite: 82 }),
      p("Lenovo IdeaPad 15", "bol.com", 649, { qiCategory: "laptop" }),
      p("Dell XPS 15", "coolblue", 1899, { qiCategory: "laptop" }),
      p("HP Spectre x360", "mediamarkt", 1699, { qiCategory: "laptop" }),
      p("ASUS Zenbook Pro", "bcc", 1599, { qiCategory: "laptop" }),
    ],
    expectVerdict: "PREMIUM PICK",
  },
  {
    label: "CONSIDER",
    query: "wireless headphones",
    tray: [
      p("Wireless Headphones Model X", "mid-tier-shop", 89, { qiComposite: 58, reviewsCount: 5 }),
      p("Wireless Headphones Model Y", "another-shop", 95, { qiComposite: 56, reviewsCount: 3 }),
      p("Wireless Headphones Model Z", "third-shop", 79, { qiComposite: 54, reviewsCount: 2 }),
      p("Wireless Headphones Model W", "fourth-shop", 99, { qiComposite: 52, reviewsCount: 1 }),
      p("Wireless Headphones Model V", "fifth-shop", 109, { qiComposite: 50, reviewsCount: 0 }),
    ],
    expectVerdict: null,
  },
  {
    label: "WAIT",
    query: "obscure specialty gadget xyz123",
    tray: [
      p("Rare Niche Gadget Alpha", "bol.com", 199, { qiComposite: 60 }),
      p("Rare Niche Gadget Beta", "coolblue", 210, { qiComposite: 58 }),
    ],
    expectVerdict: "WAIT",
  },
  {
    label: "AVOID",
    query: "apple airpods pro 2",
    tray: [
      p("Apple AirPods Pro 2 USB-C", "bol.com", 229, { qiComposite: 84 }),
      p("Apple AirPods Pro 2 Mega Deal", "fruugo", 39, {
        oldPrice: 199,
        extensions: ["70% off"],
        qiComposite: 74,
      }),
      p("Apple AirPods Pro 2", "coolblue", 239, { qiComposite: 82 }),
    ],
    expectVerdict: "AVOID",
    fruugoBrief: true,
  },
];

for (const sc of scenarios) {
  let briefOverride = null;
  if (sc.fruugoBrief) {
    const fr = sc.tray[1];
    briefOverride = {
      headline: "QuantAI Recommendation",
      recommendation: {
        label: "Deal",
        title: fr.title,
        store: fr.store,
        link: fr.link,
        price: fr.price,
      },
      why: [],
      alternatives: [],
      discountNote: null,
      confidence: 72,
      sparseTrayWarning: null,
    };
  }

  if (sc.alignBestValue) {
    const phase94 = buildPhase94QueryIntelligence(sc.query);
    const upgraded = applySearchIntelligenceUpgrade(sc.tray, sc.query, phase94.canonicalQuery);
    const bv = upgraded.meta.comparisonIntelligence.bestValue;
    if (bv) {
      briefOverride = {
        headline: "QuantAI Recommendation",
        recommendation: {
          label: bv.label,
          title: bv.title,
          store: bv.store,
          link: bv.link,
          price: bv.price,
        },
        why: [],
        alternatives: [],
        discountNote: null,
        confidence: 78,
        sparseTrayWarning: null,
      };
    }
  }

  const ctx = pipelineToExplainInput(sc.query, sc.tray, EMPTY_COMMERCE_SESSION_MEMORY, briefOverride);

  const { explained, verdictMeta } = ctx;
  const meta = explained.meta;

  if (sc.expectVerdict) {
    assert.equal(
      verdictMeta.verdict,
      sc.expectVerdict,
      `${sc.label}: pipeline verdict`
    );
  }

  assert.equal(meta.version, "phase10.1-v1", sc.label);
  assert.ok(meta.summary.length > 10, `${sc.label}: summary required`);
  assert.ok(meta.keyReasons.length >= 1 && meta.keyReasons.length <= 5, sc.label);
  assert.ok(Array.isArray(meta.positiveSignals), sc.label);
  assert.ok(Array.isArray(meta.riskSignals), sc.label);
  assert.ok(meta.confidenceDrivers.length >= 1, sc.label);
  assert.ok(meta.recommendationBasis.trust >= 0 && meta.recommendationBasis.trust <= 100, sc.label);

  if (explained.decisionBrief) {
    assert.ok(explained.decisionBrief.explanationSummary, `${sc.label}: explanationSummary`);
    assert.ok(explained.decisionBrief.keyReasons?.length, `${sc.label}: keyReasons on brief`);
    assert.ok(explained.decisionBrief.why.length >= 1, `${sc.label}: why preserved`);
    assert.ok(
      explained.decisionBrief.headline,
      `${sc.label}: headline preserved`
    );
  }

  assertNoMutation(ctx, sc.label);
}

const src = readFileSync(join(process.cwd(), "lib", "intelligence", "explainabilityEngine.ts"), "utf8");
assert.ok(!/\bfetch\s*\(/.test(src), "explainability must not call fetch");

console.log("phase10.1-explainability: ok");