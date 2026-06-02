#!/usr/bin/env node
/**
 * Phase 8 — 100-query ranking validation suite (offline pipeline + optional live API).
 *
 * Offline: specialty score ordering + full upgrade pass on good/bad pair per query.
 * Live:    QUANTAI_VALIDATION_BASE_URL=https://quant-ai-app.vercel.app node scripts/phase8-ranking-validation-suite.mjs --live
 */
import assert from "node:assert/strict";
import { PHASE8_VALIDATION_CASES } from "./phase8-ranking-validation-queries.mjs";
import { extractSearchIntent } from "../lib/search/intentExtractionEngine.ts";
import { applySearchIntelligenceUpgrade } from "../lib/search/searchIntelligenceUpgrade.ts";
import {
  isSpecialtyPurchaseIntent,
  scoreSpecialtyListing,
} from "../lib/search/specialtyRankingIntelligence.ts";

assert.equal(PHASE8_VALIDATION_CASES.length, 109, "corpus must be 109 queries (100 Phase 8 + 9 Phase 8.5)");

function mockProduct(title, store, price, extra = {}) {
  return {
    title,
    store,
    price,
    link: `https://example.com/${encodeURIComponent(title.slice(0, 24))}`,
    image: "",
    rating: 4.3,
    reviewsCount: 80,
    extensions: [],
    qiComposite: 68,
    qiBuyingDecision: { confidence: 70, action: "STRONG_VALUE" },
    ...extra,
  };
}

function specialtyLeaderScore(title, store, query) {
  const intent = extractSearchIntent(query);
  const sig = scoreSpecialtyListing(title, store, intent, query);
  return sig.specialtyScore + sig.totalAdjustment;
}

function runOfflineCase(c) {
  const goodStore = "Coolblue";
  const badStore = "eBay - generic-seller";
  const goodScore = specialtyLeaderScore(c.goodTitle, goodStore, c.query);
  const badScore = specialtyLeaderScore(c.badTitle, badStore, c.query);
  const scoreOrderingPass = goodScore > badScore;

  const tray = applySearchIntelligenceUpgrade(
    [
      mockProduct(c.badTitle, badStore, 49, { qiBuyingDecision: { confidence: c.specialty ? 82 : 72 } }),
      mockProduct(c.goodTitle, goodStore, 129, { qiBuyingDecision: { confidence: c.specialty ? 65 : 88 } }),
      mockProduct(`${c.badTitle} alternate`, badStore, 39, { qiBuyingDecision: { confidence: 75 } }),
    ],
    c.query
  );
  const upgradePass = tray.products[0].title === c.goodTitle;
  const intent = extractSearchIntent(c.query);
  const specialtyFlag = isSpecialtyPurchaseIntent(intent, c.query);

  const pass = c.specialty
    ? scoreOrderingPass && upgradePass && specialtyFlag
    : upgradePass && (scoreOrderingPass || goodScore >= badScore);

  return {
    id: c.id,
    query: c.query,
    specialty: c.specialty,
    scoreOrderingPass,
    upgradePass,
    specialtyFlag,
    pass,
    goodScore: Math.round(goodScore),
    badScore: Math.round(badScore),
    top1: tray.products[0].title.slice(0, 72),
  };
}

async function runLiveCase(c, base) {
  const res = await fetch(`${base}/api/search?q=${encodeURIComponent(c.query)}`);
  const json = await res.json();
  const products = json?.data?.products ?? [];
  const meta = json?.data?.meta ?? {};
  const top1 = products[0]?.title ?? "";
  const goodRx = new RegExp(
    c.goodTitle
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join("|"),
    "i"
  );
  const badRx = new RegExp(
    c.badTitle
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 2)
      .join("|"),
    "i"
  );
  const intentMatch = c.specialty ? goodRx.test(top1) || specialtyLeaderScore(top1, products[0]?.store ?? "", c.query) > 20 : products.length > 0;
  const notBadLeader = !badRx.test(top1) || goodRx.test(top1);
  return {
    id: c.id,
    query: c.query,
    count: products.length,
    top1: top1.slice(0, 72),
    hasConstraints: meta.constraints != null,
    hasTrustRanking: meta.trustRanking != null,
    upgradeVersion: meta.searchIntelligenceUpgrade?.version ?? null,
    pass: products.length > 0 && intentMatch && notBadLeader && meta.constraints != null,
  };
}

const live = process.argv.includes("--live");
const base = process.env.QUANTAI_VALIDATION_BASE_URL?.replace(/\/$/, "") ?? "https://quant-ai-app.vercel.app";

if (!live) {
  const results = PHASE8_VALIDATION_CASES.map(runOfflineCase);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log(`Phase 8 offline ranking validation: ${passed}/100 passed`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed.slice(0, 15)) {
      console.log(
        `  ${f.id} | ${f.query.slice(0, 50)} | score=${f.scoreOrderingPass} upgrade=${f.upgradePass} specialty=${f.specialtyFlag}`
      );
    }
    if (failed.length > 15) console.log(`  ... and ${failed.length - 15} more`);
    process.exit(1);
  }
  console.log("All 100 offline specialty ranking cases passed.");
} else {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const results = [];
  for (const c of PHASE8_VALIDATION_CASES) {
    results.push(await runLiveCase(c, base));
    await sleep(1600);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(JSON.stringify({ base, mode: "live", passed, total: 100, results }, null, 2));
  if (passed < 100) process.exit(1);
}
