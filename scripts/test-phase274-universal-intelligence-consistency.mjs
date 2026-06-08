#!/usr/bin/env node
/**
 * Phase 27.4 — Universal intelligence consistency (category-agnostic).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import { primaryVerdictAlignment } from "../lib/ui/decisionLanguage.ts";
import {
  buildDisplayCoherenceByLink,
  buildUniversalProductDecisionMap,
  resolveUnifiedTrayVerdictFromUniversal,
} from "../lib/ui/phase274PresentationActivation.ts";
import {
  hasStaticConfidenceCluster,
  overlayCoherentWithUniversal,
} from "../lib/ui/universalProductDecision.ts";
import { trayVerdictMatchesCardMajority } from "../lib/ui/unifiedVerdictAuthority.ts";
import { surfaceEvidenceSupportsAuthority } from "../lib/ui/verdictReasonAuthority.ts";

const base = {
  extensions: [],
  image: "",
  availability: "In stock",
  shipping: "Free delivery",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount, queryTag) {
  return {
    ...base,
    id,
    link: `https://shop.example/u274/${queryTag}/${id}`,
    title,
    store,
    price,
    oldPrice,
    rating,
    reviewsCount,
    priceTrend: price < oldPrice ? "down" : "stable",
  };
}

function mixedTray() {
  return [
    listing(1, "Ultrabook 14 Core i7 16GB", "Coolblue", 1099, 1299, 4.6, 820, "electronics"),
    listing(2, "Smartphone 256GB dual sim", "MediaMarkt", 799, 899, 4.5, 2100, "mobile"),
    listing(3, "Modular corner sofa grey", "IKEA", 899, 1099, 4.3, 410, "furniture"),
    listing(4, "Wireless noise cancelling headphones", "Amazon", 249, 299, 4.7, 5400, "audio"),
    listing(5, "Smart watch fitness GPS", "Bol.com", 329, 379, 4.4, 980, "wearable"),
    listing(6, "Electric kettle 1.7L glass", "BCC", 59, 79, 4.2, 320, "appliance"),
    listing(7, "Unknown outlet import listing", "GreyOutlet", 399, 699, 3.6, 12, "risk"),
    listing(8, "Premium monitor 27 4K", "Alternate", 549, 649, 4.8, 760, "electronics"),
  ];
}

function runMixedScenario() {
  const tray = mixedTray();
  const brief = {
    headline: "Mixed category tray",
    recommendation: {
      label: "Top pick",
      title: tray[0].title,
      store: tray[0].store,
      link: tray[0].link,
      price: tray[0].price,
    },
    why: [],
    alternatives: [],
    discountNote: null,
    confidence: 0.84,
    sparseTrayWarning: null,
    explanation: "Universal mixed-category scan.",
    buyReasoning: "Lead listing clears analyst checks.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: "Mixed tray institutional lead.",
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product, index) => ({
          link: product.link,
          trustScore: product.store === "GreyOutlet" ? 36 : 74 - (index % 4),
          fakeDiscountRisk: product.store === "GreyOutlet" ? "high" : "low",
          priceAnomaly: product.store === "GreyOutlet" ? "suspicious_low" : "normal",
          suspiciousSeller: product.store === "GreyOutlet",
        })),
      },
    },
    decisionBrief: brief,
  });

  const coherenceMap = new Map(
    tray.map((product, rank) => [
      product.link,
      activateProductDecisionCoherence({
        product,
        list: tray,
        rank,
        tray: trayCtx,
        searchQuery: "best value trusted seller",
      }),
    ])
  );

  const metaByLink = new Map(
    tray.map((product, rank) => [
      product.link,
      {
        price: product.price,
        rank,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        store: product.store,
      },
    ])
  );

  const universalByLink = buildUniversalProductDecisionMap(coherenceMap, metaByLink);
  const displayCoherenceByLink = buildDisplayCoherenceByLink(coherenceMap, universalByLink);
  const trayVerdict = resolveUnifiedTrayVerdictFromUniversal(displayCoherenceByLink);

  const renderedConfidences = [...universalByLink.values()].map((row) => row.confidence);
  const renderedVerdicts = [...universalByLink.values()].map((row) => row.verdict);
  const legacyBuckets = [...coherenceMap.values()].map((row) => row.alignmentScore);

  assert.ok(
    readFileSync(join(process.cwd(), "lib/ui/universalProductDecision.ts"), "utf8").includes(
      "UniversalProductDecision"
    )
  );
  assert.ok(
    readFileSync(join(process.cwd(), "components/search/IntelligenceCardBody.tsx"), "utf8").includes(
      "resolveCardAuthorityView"
    )
  );

  assert.ok(new Set(renderedConfidences).size >= 4, "mixed tray produces varied confidence");
  assert.ok(!hasStaticConfidenceCluster(renderedConfidences, 62), "no static 62% cluster in rendered output");
  assert.ok(!hasStaticConfidenceCluster(renderedConfidences, 48), "no static 48% cluster in rendered output");
  assert.ok(!hasStaticConfidenceCluster(renderedConfidences, 24), "no static 24% cluster in rendered output");
  assert.ok(
    legacyBuckets.filter((score) => score === primaryVerdictAlignment("COMPARE")).length >= 3,
    "legacy coherence still buckets internally — rendered output must not mirror it"
  );
  assert.ok(
    renderedConfidences.filter((score) => score === primaryVerdictAlignment("COMPARE")).length <
      legacyBuckets.filter((score) => score === primaryVerdictAlignment("COMPARE")).length,
    "universal rendering must not propagate legacy COMPARE 62% buckets"
  );

  const compareShare = renderedVerdicts.filter((verdict) => verdict === "COMPARE").length / renderedVerdicts.length;
  assert.ok(compareShare <= 0.3, "COMPARE limited to close-call cases");

  assert.ok(new Set(renderedVerdicts).size >= 2, "verdict diversity across mixed categories");
  assert.ok(
    trayVerdictMatchesCardMajority([...displayCoherenceByLink.values()], trayVerdict.verdict),
    "final tray verdict agrees with visible card majority"
  );

  for (const [link, coherent] of coherenceMap) {
    const universal = universalByLink.get(link);
    assert.ok(universal, "universal decision exists");
    const overlay = overlayCoherentWithUniversal(coherent, universal);
    assert.equal(overlay.verdict, universal.verdict, "overlay verdict matches universal");
    assert.equal(overlay.alignmentScore, universal.confidence, "overlay confidence matches universal");
    const legacyBucket = primaryVerdictAlignment(coherent.verdict);
    if ([24, 48, 62, 88].includes(legacyBucket)) {
      assert.notEqual(
        overlay.alignmentScore,
        legacyBucket,
        "overlay must not keep legacy bucket confidence on rendered surfaces"
      );
    }
    assert.ok(
      surfaceEvidenceSupportsAuthority(universal.displayChips, universal.reasonAuthority) ||
        universal.displayChips.length === 0,
      "chips support universal verdict"
    );
  }

  return {
    confidences: renderedConfidences.sort((a, b) => b - a),
    verdicts: Object.fromEntries(
      ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
        verdict,
        renderedVerdicts.filter((value) => value === verdict).length,
      ])
    ),
    trayVerdict: trayVerdict.verdict,
    uniqueConfidence: new Set(renderedConfidences).size,
  };
}

const report = runMixedScenario();
console.log("phase274-universal-intelligence-consistency: ok");
console.log(JSON.stringify(report));
