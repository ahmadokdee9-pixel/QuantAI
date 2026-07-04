#!/usr/bin/env node
/**
 * Before/after probe: false hard-mismatch fix on MacBook, iPhone, Sofa trays.
 */
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { buildProductionReadinessDecisionMap } from "../lib/ui/phase45ProductionReadinessActivation.ts";
import {
  applyCanonicalDecisionCalibration,
  detectHardConstraintMismatch,
} from "../lib/ui/canonicalDecisionCalibration.ts";
import { resolveCanonicalSearchRank } from "../lib/truth/canonicalSearchRank.ts";

function detectHardConstraintMismatchOLD(decision) {
  const intel = decision.productIntelligence;
  const foundation = intel?.truthFoundation;
  const record = intel?.rankingDecisionRecord;
  if (!foundation && !record) return false;

  const relevance =
    record?.compositeBreakdown.relevance ?? foundation?.productMatch.overallMatchScore ?? 100;
  const match = foundation?.productMatch;
  const constraints = foundation?.purchaseConstraints;
  const recommendation = foundation?.recommendationIntelligence;
  const reasoning = foundation?.productReasoning;

  if (recommendation?.recommendationTier === "NOT_RECOMMENDED") return true;
  if (constraints && constraints.hardRequirements.length > 0 && relevance < 55) return true;
  if (match?.strongestMismatchReason && relevance < 60) return true;
  if (reasoning?.recommendationStrength === "WEAK" && relevance < 55) return true;

  const constraintLayer = record?.layers.find((layer) => layer.layer === "2K_purchaseConstraints");
  if (constraintLayer && constraintLayer.scoreContribution <= -2.5) return true;

  const evidence = record?.evidenceChain ?? [];
  if (evidence.some((line) => /over budget|hard requirement|not recommended|mismatch/i.test(line))) {
    return true;
  }

  return relevance < 42;
}

const base = {
  extensions: [],
  availability: "In stock",
  shipping: "Free delivery",
  image: "https://images.example.com/product.jpg",
  rating: 4.6,
  reviewsCount: 400,
  priceTrend: "stable",
};

function listing(id, title, store, price, tag) {
  return {
    ...base,
    id,
    link: `https://shop.example/${tag}/${id}`,
    title,
    store,
    price,
    displayPrice: `€${price}`,
    oldPrice: price + 100,
  };
}

const scenarios = {
  macbook: {
    query: "macbook pro",
    tray: [
      listing(1, "MacBook Pro 14 M3 Pro 512GB", "Apple", 1999, "mbp"),
      listing(2, "MacBook Air M2 16GB 512GB", "Apple", 1199, "mba"),
      listing(3, "MacBook Pro 16 M3 Max 1TB", "Apple", 2999, "mbp16"),
      listing(4, "Dell XPS 13 Ultrabook", "Dell", 999, "xps"),
    ],
  },
  iphone: {
    query: "iphone 15 pro",
    tray: [
      listing(1, "iPhone 15 Pro 256GB", "Apple", 1099, "ip15p"),
      listing(2, "iPhone 15 128GB", "Apple", 799, "ip15"),
      listing(3, "iPhone 14 Pro 256GB", "Apple", 899, "ip14p"),
      listing(4, "iPhone 15 Pro Max 512GB", "Apple", 1299, "ip15pm"),
    ],
  },
  sofa: {
    query: "corner sofa",
    tray: [
      listing(1, "Premium Corner Sofa Grey", "IKEA", 800, "sofa1"),
      listing(2, "Family Sectional Sofa", "Wayfair", 970, "sofa2"),
      listing(3, "Luxury Leather Corner Sofa", "Made.com", 1299, "sofa3"),
      listing(4, "Budget Fabric Sofa", "Bol.com", 449, "sofa4"),
      listing(5, "Scandinavian Corner Sofa", "Amazon", 999, "sofa5"),
    ],
  },
};

function runScenario(query, tray) {
  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: "Probe.",
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
    decisionBrief: null,
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
        rating: product.rating,
        reviewsCount: product.reviewsCount ?? 0,
        store: product.store,
      },
    ])
  );

  const productsByLink = new Map(tray.map((product) => [product.link, { product, searchQuery: query }]));
  const canonical = resolveCanonicalSearchRank(tray, query);
  const orderLinks = canonical.orderLinks;

  const { decisions } = buildProductionReadinessDecisionMap(
    coherenceMap,
    metaByLink,
    productsByLink,
    null,
    null,
    orderLinks
  );

  return { decisions, orderLinks, tray };
}

function summarize(decisions, orderLinks, useOldDetect) {
  const counts = { AVOID: 0, COMPARE: 0, BUY: 0, "STRONG BUY": 0, "BEST VALUE": 0 };
  const confidences = [];
  const topScore =
    decisions.get(orderLinks[0] ?? "")?.productIntelligence?.rankingDecisionRecord?.finalRankScore ?? 0;
  const secondScore =
    decisions.get(orderLinks[1] ?? "")?.productIntelligence?.rankingDecisionRecord?.finalRankScore ??
    topScore;

  for (let rankIndex = 0; rankIndex < orderLinks.length; rankIndex += 1) {
    const link = orderLinks[rankIndex];
    const decision = decisions.get(link);
    if (!decision) continue;

    const rowScore = decision.productIntelligence?.rankingDecisionRecord?.finalRankScore ?? 0;
    const context = {
      rankIndex,
      traySize: orderLinks.length,
      topFinalScore: topScore,
      gapToLeader: topScore - rowScore,
      leaderGapToSecond: topScore - secondScore,
    };

    let label;
    let confidence;
    if (useOldDetect && detectHardConstraintMismatchOLD(decision)) {
      const rel = decision.productIntelligence?.rankingDecisionRecord?.compositeBreakdown.relevance ?? 50;
      label = "AVOID";
      confidence = Math.min(35, Math.max(25, Math.round(26 + rel * 0.12)));
    } else if (!useOldDetect) {
      const calibrated = decision;
      label = calibrated.recommendationLabel ?? "COMPARE";
      confidence = calibrated.confidence;
    } else {
      const calibrated = applyCanonicalDecisionCalibration(decision, context);
      label = calibrated.recommendationLabel ?? "COMPARE";
      confidence = calibrated.confidence;
    }

    counts[label] = (counts[label] ?? 0) + 1;
    confidences.push(confidence);
  }

  const dist = Object.fromEntries(
    Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => [k, n])
  );

  return {
    verdictDistribution: dist,
    confidence: {
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      avg: Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length),
      values: confidences,
    },
    counts: {
      AVOID: counts.AVOID,
      COMPARE: counts.COMPARE,
      BUY: counts.BUY,
      STRONG_BUY: counts["STRONG BUY"],
      BEST_VALUE: counts["BEST VALUE"],
    },
    falseHardMismatchOLD: orderLinks.filter((link) => {
      const d = decisions.get(link);
      return d && detectHardConstraintMismatchOLD(d) && !detectHardConstraintMismatch(d);
    }).length,
  };
}

console.log("=== Hard mismatch fix probe (MacBook / iPhone / Sofa) ===\n");

for (const [name, config] of Object.entries(scenarios)) {
  const { decisions, orderLinks } = runScenario(config.query, config.tray);
  const before = summarize(decisions, orderLinks, true);
  const after = summarize(decisions, orderLinks, false);

  console.log(`--- ${name.toUpperCase()} ("${config.query}") ---`);
  console.log("BEFORE (old detectHardConstraintMismatch):");
  console.log("  verdict:", before.verdictDistribution);
  console.log("  counts:", before.counts);
  console.log("  confidence:", `${before.confidence.min}–${before.confidence.max}% (avg ${before.confidence.avg}%)`);
  console.log("  false hard-mismatch flags:", before.falseHardMismatchOLD, "/", orderLinks.length);
  console.log("AFTER (fixed detectHardConstraintMismatch):");
  console.log("  verdict:", after.verdictDistribution);
  console.log("  counts:", after.counts);
  console.log("  confidence:", `${after.confidence.min}–${after.confidence.max}% (avg ${after.confidence.avg}%)`);
  console.log("");
}
