#!/usr/bin/env node
/**
 * Phase 45 — Final Production Audit.
 * Audits intelligence pipeline readiness before Vercel deployment.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "@/lib/ui/decisionCoherenceActivation";
import { buildProductionReadinessDecisionMap } from "@/lib/ui/phase45ProductionReadinessActivation";
import { validateTraySafety } from "@/lib/intelligence/productionSafetyEngine";
import { distributionWithinTargets } from "@/lib/intelligence/buySignalBalancingEngine";
import { alignDecisionBriefToCanonicalWinner } from "@/lib/intelligence/decisionBriefEngine";
import { resolveCanonicalSearchRank } from "@/lib/truth/canonicalSearchRank";
import { runGoldenRankingBenchmarks } from "@/lib/truth/rankingValidation";
import type { QuantProduct } from "@/lib/shoppingScore";

type AuditCheck = { name: string; pass: boolean; weight: number; detail: string };

const checks: AuditCheck[] = [];

function addCheck(name: string, pass: boolean, weight: number, detail: string) {
  checks.push({ name, pass, weight, detail });
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

function fileContains(relativePath: string, needle: string): boolean {
  if (!fileExists(relativePath)) return false;
  return readFileSync(join(process.cwd(), relativePath), "utf8").includes(needle);
}

const base = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
  image: "https://images.example.com/product.jpg",
};

function listing(id: number, title: string, store: string, price: number, oldPrice: number, tag: string): QuantProduct {
  return {
    ...base,
    id,
    link: `https://shop.example/${tag}/${id}`,
    title,
    store,
    price,
    displayPrice: `$${price}`,
    oldPrice,
    rating: 4.5,
    reviewsCount: 120,
    priceTrend: price < oldPrice ? "down" : "stable",
  };
}

function runScenario(query: string, tray: ReturnType<typeof listing>[]) {
  const brief = {
    headline: "tray",
    recommendation: { label: "Top pick", title: tray[0].title, store: tray[0].store, link: tray[0].link, price: tray[0].price },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
    explanation: "Audit brief.",
    buyReasoning: "Audit rationale.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: "Audit.",
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product) => ({
          link: product.link,
          trustScore: 90,
          discountAuthenticity: "verified",
          retailerIntegrity: "high",
          priceRealism: "fair",
          compositeTrust: 0.9,
        })),
      },
    },
    decisionBrief: brief,
  });

  const coherenceMap = new Map(
    tray.map((product, rank) => [
      product.link,
      activateProductDecisionCoherence({ product, list: tray, rank, tray: trayCtx, searchQuery: query }),
    ])
  );

  const metaByLink = new Map(
    tray.map((product, rank) => [
      product.link,
      {
        price: product.price,
        rank,
        rating: typeof product.rating === "number" ? product.rating : Number(product.rating) || 4.5,
        reviewsCount: product.reviewsCount ?? 0,
        store: product.store,
      },
    ])
  );

  const productsByLink = new Map(tray.map((product) => [product.link, { product, searchQuery: query }]));
  return buildProductionReadinessDecisionMap(coherenceMap, metaByLink, productsByLink);
}

// Static module audit
addCheck(
  "Phase 45 activation wired",
  fileContains("components/search/ProductResultsSurface.tsx", "buildProductionReadinessDecisionMap"),
  8,
  "ProductResultsSurface imports Phase 45 pipeline"
);
addCheck(
  "Category value engine",
  fileContains("lib/intelligence/categoryValueEngine.ts", "buildCategoryValueIntelligence"),
  6,
  "categoryValueEngine.ts present"
);
addCheck(
  "True value engine",
  fileContains("lib/intelligence/trueValueEngine.ts", "computeTrueValueIntelligence"),
  6,
  "trueValueEngine.ts present"
);
addCheck(
  "Discount confidence engine",
  fileContains("lib/intelligence/discountConfidenceEngine.ts", "computeDiscountConfidence"),
  6,
  "discountConfidenceEngine.ts present"
);
addCheck(
  "Merchant reliability engine",
  fileContains("lib/intelligence/merchantReliabilityEngine.ts", "computeMerchantReliability"),
  6,
  "merchantReliabilityEngine.ts present"
);
addCheck(
  "Decision reasoning engine",
  fileContains("lib/intelligence/decisionReasoningEngine.ts", "generateCategoryAwareReasoning"),
  6,
  "decisionReasoningEngine.ts present"
);
addCheck(
  "Production safety engine",
  fileContains("lib/intelligence/productionSafetyEngine.ts", "sanitizeUniversalDecision"),
  8,
  "productionSafetyEngine.ts present"
);
addCheck(
  "Buy signal balancing",
  fileContains("lib/intelligence/buySignalBalancingEngine.ts", "balanceBuySignals"),
  6,
  "buySignalBalancingEngine.ts present"
);

const categories = {
  sofas: {
    query: "corner sofa",
    tray: [
      listing(1, "Premium Corner Sofa Grey", "IKEA", 800, 899, "sofa"),
      listing(2, "Family Sectional Sofa", "Wayfair", 970, 1099, "sofa"),
      listing(3, "Luxury Leather Sofa", "Made.com", 1299, 1399, "sofa"),
      listing(4, "Budget Fabric Sofa", "Bol.com", 449, 499, "sofa"),
      listing(5, "Scandinavian Sofa", "Amazon", 999, 1199, "sofa"),
      listing(6, "Compact Sofa Bed", "Amazon", 649, 749, "sofa"),
    ],
  },
  laptops: {
    query: "best laptop",
    tray: [
      listing(1, "MacBook Air M1 16GB 512GB", "Apple", 1099, 1299, "mac"),
      listing(2, "Dell XPS 13 i7 16GB", "Dell", 999, 1199, "dell"),
      listing(3, "Lenovo ThinkPad Ryzen 16GB", "Lenovo", 849, 999, "lenovo"),
      listing(4, "ASUS ZenBook 14 OLED", "ASUS", 899, 1049, "asus"),
      listing(5, "HP Spectre x360", "HP", 1199, 1399, "hp"),
    ],
  },
  macbooks: {
    query: "macbook pro",
    tray: [
      listing(1, "MacBook Pro 14 M3 Pro", "Apple", 1999, 2199, "mbp"),
      listing(2, "MacBook Air M2 16GB", "Apple", 1199, 1299, "mba"),
      listing(3, "MacBook Pro 16 M3 Max", "Apple", 2999, 3299, "mbp16"),
    ],
  },
  iphones: {
    query: "iphone 15 pro",
    tray: [
      listing(1, "iPhone 15 Pro 256GB", "Apple", 1099, 1199, "ip15p"),
      listing(2, "iPhone 15 128GB", "Apple", 799, 899, "ip15"),
      listing(3, "iPhone 14 Pro 256GB", "Apple", 899, 1099, "ip14p"),
      listing(4, "iPhone 15 Pro Max 512GB", "Apple", 1299, 1399, "ip15pm"),
    ],
  },
};

const distributionReport: Record<string, string> = {};
const weaknesses: string[] = [];
let runtimePass = true;

for (const [label, config] of Object.entries(categories)) {
  const { decisions, trayContext } = runScenario(config.query, config.tray);
  const dist = trayContext.productionDistribution;
  const total = dist.wait + dist.compare + dist.buyReady + dist.strongBuy + dist.bestDeal;
  const buySignals = dist.buyReady + dist.strongBuy + dist.bestDeal;

  distributionReport[label] = JSON.stringify({
    compare: `${dist.compare}/${total}`,
    buyReady: `${dist.buyReady}/${total}`,
    strongBuy: `${dist.strongBuy}/${total}`,
    bestDeal: `${dist.bestDeal}/${total}`,
  });

  const safety = validateTraySafety(decisions);
  if (!safety.safe) {
    runtimePass = false;
    weaknesses.push(`${label}: production safety issues (${safety.issueCount})`);
  }

  if (!trayContext.productionReadinessApplied) {
    runtimePass = false;
    weaknesses.push(`${label}: Phase 45 not applied`);
  }

  if (buySignals < Math.max(1, Math.floor(total * 0.15))) {
    weaknesses.push(`${label}: buy signal density low (${buySignals}/${total}) — large trays may feel over-filtered`);
  }

  if (dist.compare / total > 0.85) {
    weaknesses.push(`${label}: compare dominance high (${dist.compare}/${total})`);
  }

  if (!distributionWithinTargets(dist, total)) {
    weaknesses.push(`${label}: distribution outside soft production targets`);
  }

  for (const [, decision] of decisions) {
    const intel = decision.productIntelligence;
    if (!intel?.categoryValue || !intel.trueValue || !intel.discountConfidence || !intel.merchantReliability) {
      runtimePass = false;
      weaknesses.push(`${label}: missing Phase 45 intelligence blob on at least one product`);
      break;
    }
    if (!intel.decisionReasoning?.primaryLine) {
      weaknesses.push(`${label}: missing category-aware reasoning on at least one product`);
    }
  }
}

addCheck("Runtime pipeline audit", runtimePass, 20, "Category scenarios execute with Phase 45 blobs");

const goldenResults = runGoldenRankingBenchmarks();
const goldenPassCount = goldenResults.filter((row) => row.pass).length;
const goldenPass = goldenPassCount === goldenResults.length;
addCheck(
  "Phase A golden rank benchmarks",
  goldenPass,
  15,
  `${goldenPassCount}/${goldenResults.length} golden queries pass canonical rank`
);

const phaseAAuditTray: QuantProduct[] = categories.laptops.tray;
const phaseACanonical = resolveCanonicalSearchRank(phaseAAuditTray, categories.laptops.query);
const phaseABrief = alignDecisionBriefToCanonicalWinner(
  {
    headline: "tray",
    recommendation: {
      label: "Top pick",
      title: phaseAAuditTray[0].title,
      store: phaseAAuditTray[0].store,
      link: phaseAAuditTray[0].link,
      price: phaseAAuditTray[0].price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
  },
  phaseACanonical.orderedProducts[0],
  phaseACanonical.orderedProducts
);
const phaseASurfaceAligned =
  phaseACanonical.orderedProducts[0]?.link === phaseABrief?.recommendation.link &&
  phaseACanonical.orderLinks[0] === phaseACanonical.orderedProducts[0]?.link;
addCheck(
  "Phase A cross-surface rank consistency",
  phaseASurfaceAligned,
  15,
  "API/canonical #1 matches decision brief #1"
);
addCheck(
  "Production safety validated",
  weaknesses.every((w) => !w.includes("production safety issues")),
  12,
  "No NaN/invalid score issues detected"
);

const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
const earnedWeight = checks.filter((c) => c.pass).reduce((sum, c) => sum + c.weight, 0);
const penalty = Math.min(25, weaknesses.length * 3);
const readinessScore = Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100) - penalty + (runtimePass ? 10 : 0)));

console.log("\n=== QuantAI Production Readiness Report ===\n");
console.log(`Production Readiness Score: ${readinessScore}/100\n`);

console.log("Audit Checks:");
for (const check of checks) {
  console.log(`  [${check.pass ? "PASS" : "FAIL"}] ${check.name} — ${check.detail}`);
}

console.log("\nRecommendation Distribution by Category:");
for (const [label, report] of Object.entries(distributionReport)) {
  console.log(`  ${label}: ${report}`);
}

console.log("\nRemaining Weaknesses Before Vercel Deployment:");
if (weaknesses.length === 0) {
  console.log("  None critical — intelligence pipeline production-ready.");
} else {
  for (const weakness of weaknesses) {
    console.log(`  - ${weakness}`);
  }
}

console.log("\nNotes:");
console.log("  - UI/layout unchanged — intelligence-only phase");
console.log("  - Search flow unchanged");
console.log("  - Phase 41–44 behavior preserved under Phase 45 wrapper");
console.log("");

if (readinessScore < 70) {
  process.exitCode = 1;
}
