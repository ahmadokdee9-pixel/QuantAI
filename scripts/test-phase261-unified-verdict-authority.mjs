#!/usr/bin/env node
/**
 * Phase 26.1 — Unified Verdict Authority tests (offline).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  resolveUnifiedTrayVerdict,
  trayVerdictMatchesCardMajority,
} from "../lib/ui/unifiedVerdictAuthority.ts";
import { buildMarketSummary } from "../lib/ui/marketSummary.ts";

const base = {
  extensions: [],
  image: "",
  rating: 4.6,
  reviewsCount: 400,
  availability: "In stock",
  shipping: "Free delivery",
};

function product(id, store, price, oldPrice = price + 80) {
  return {
    ...base,
    id,
    link: `https://shop.example/${id}`,
    title: "Samsung Galaxy S24 Ultra 512GB flagship smartphone",
    store,
    price,
    oldPrice,
    priceTrend: "down",
  };
}

const lead = product(1, "Coolblue", 899, 1099);
const peer = product(2, "MediaMarkt", 929, 1049);
const risky = product(3, "RandomMarket", 799, 999);
const tray = [lead, peer, risky];

const brief = {
  headline: "Tray brief",
  recommendation: { label: "Top pick", title: lead.title, store: lead.store, link: lead.link, price: lead.price },
  why: [],
  alternatives: [],
  discountNote: null,
  confidence: 0.82,
  sparseTrayWarning: null,
  explanation: "Institutional engine says buy-ready on lead.",
  buyReasoning: "Lead trust is strong.",
  riskSignals: [],
};

const trayCtx = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.82,
      rationale: "Lead clears institutional checks.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    phase93TrustDiscount: {
      version: "phase93-v1",
      trayAssessments: [
        {
          link: lead.link,
          trustScore: 78,
          fakeDiscountRisk: "low",
          priceAnomaly: "normal",
          suspiciousSeller: false,
        },
        {
          link: peer.link,
          trustScore: 74,
          fakeDiscountRisk: "low",
          priceAnomaly: "normal",
          suspiciousSeller: false,
        },
        {
          link: risky.link,
          trustScore: 44,
          fakeDiscountRisk: "high",
          priceAnomaly: "suspicious_low",
          suspiciousSeller: true,
        },
      ],
    },
  },
  decisionBrief: brief,
});

function coherentMap(authority = null) {
  const map = new Map();
  for (let rank = 0; rank < tray.length; rank++) {
    const p = tray[rank];
    map.set(
      p.link,
      activateProductDecisionCoherence({
        product: p,
        list: tray,
        rank,
        tray: trayCtx,
        searchQuery: "samsung galaxy s24 ultra",
        trayVerdictAuthority: authority,
      })
    );
  }
  return map;
}

// ── Source guards ─────────────────────────────────────────────────────────────
const authoritySrc = readFileSync(join(process.cwd(), "lib/ui/unifiedVerdictAuthority.ts"), "utf8");
assert.ok(authoritySrc.includes("compareExcluded"), "compare listings excluded from voting");
assert.ok(!authoritySrc.includes("searchIntelligence"), "no parallel search-intel final verdict");

const summarySrc = readFileSync(join(process.cwd(), "lib/ui/marketSummary.ts"), "utf8");
assert.ok(summarySrc.includes("trayVerdict"), "market summary consumes tray authority");

const surfaceSrc = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(surfaceSrc.includes("resolveUnifiedTrayVerdict"), "results surface wires unified authority");
assert.ok(surfaceSrc.includes("trayVerdictAuthority"), "two-pass coherence binding");

// ── Cluster: institutional BUY but risky row escalates AVOID ─────────────────
const pass1 = coherentMap(null);
const unified1 = resolveUnifiedTrayVerdict(pass1.values());
assert.ok(pass1.get(risky.link).verdict === "AVOID", "risky card escalates to avoid");
assert.ok(
  unified1.verdict === "WAIT" || unified1.verdict === "AVOID" || unified1.verdict === "COMPARE",
  "final tray authority cannot stay buy-ready when avoid/wait dominate actionable cards"
);
assert.ok(!unified1.verdict.includes("Buy now"), "tray verdict uses primary labels only");

const pass2 = coherentMap(unified1.verdict);
const unified2 = resolveUnifiedTrayVerdict(pass2.values());
assert.equal(unified2.verdict, unified1.verdict, "pass-2 tray authority is stable");
assert.ok(
  trayVerdictMatchesCardMajority(pass2.values(), unified2.verdict),
  "majority actionable cards match final tray verdict"
);

// ── Final verdict block uses same authority ───────────────────────────────────
const market = buildMarketSummary(tray, { finalRecommendation: "buy_now", buyerUncertaintyScore: 20, finalBody: "Legacy body." }, null, unified2);
assert.equal(market.recommendedAction, unified2.verdict, "market summary final label equals tray authority");
assert.equal(market.confidence, unified2.confidence, "market summary confidence equals tray authority");
assert.ok(market.marketObservation.length > 20, "market observation carries tray narrative");

assert.ok(unified2.winningReason.length > 10, "winning reason populated");
assert.ok(unified2.losingReasons.length >= 0, "losing reasons array present");

// ── BUY READY requires confident buy cluster ──────────────────────────────────
const allBuyTrayCtx = buildTrayCoherenceContext({
  searchMeta: {
    verdictIntelligence: {
      version: "phase10-v1",
      verdict: "BUY READY",
      confidence: 0.9,
      rationale: "All clear.",
      strengths: [],
      warnings: [],
      factorTrace: {},
    },
    phase93TrustDiscount: {
      version: "phase93-v1",
      trayAssessments: tray.map((p) => ({
        link: p.link,
        trustScore: 80,
        fakeDiscountRisk: "low",
        priceAnomaly: "normal",
        suspiciousSeller: false,
      })),
    },
  },
  decisionBrief: brief,
});
const buyMap = new Map();
for (let rank = 0; rank < tray.length; rank++) {
  const p = tray[rank];
  buyMap.set(
    p.link,
    activateProductDecisionCoherence({
      product: p,
      list: tray,
      rank,
      tray: allBuyTrayCtx,
      searchQuery: "samsung galaxy s24 ultra",
    })
  );
}
const unifiedBuy = resolveUnifiedTrayVerdict(buyMap.values());
assert.equal(unifiedBuy.verdict, "BUY READY", "confident buy cluster can win tray");
assert.ok(trayVerdictMatchesCardMajority(buyMap.values(), unifiedBuy.verdict), "buy tray passes majority guard");

console.log("phase261-unified-verdict-authority: ok");
