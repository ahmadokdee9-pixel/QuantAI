#!/usr/bin/env node
/**
 * Phase 30 — Decision alignment & signal consistency validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  buildDisplayCoherenceByLink,
  resolveUnifiedTrayVerdictFromUniversal,
} from "../lib/ui/phase274PresentationActivation.ts";
import { buildAlignedDecisionMap } from "../lib/ui/phase30DecisionAlignmentActivation.ts";
import {
  assignTrayVerdictAuthority,
  chipsSupportVerdict,
  getStandardDimensionLabels,
} from "../lib/ui/decisionAlignmentEngine.ts";
import { overlayCoherentWithUniversal } from "../lib/ui/universalProductDecision.ts";
import { trayVerdictMatchesCardMajority } from "../lib/ui/unifiedVerdictAuthority.ts";

const base = {
  extensions: [],
  image: "",
  availability: "In stock",
  shipping: "Free delivery",
};

function listing(id, title, store, price, oldPrice, rating, reviewsCount, tag) {
  return {
    ...base,
    id,
    link: `https://shop.example/${tag}/${id}`,
    title,
    store,
    price,
    oldPrice,
    rating,
    reviewsCount,
    priceTrend: price < oldPrice ? "down" : "stable",
  };
}

function scenario(name, query, tray, trustFactory) {
  const brief = {
    headline: `${name} tray`,
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
    explanation: `${name} institutional brief.`,
    buyReasoning: "Lead listing clears analyst checks.",
    riskSignals: [],
  };

  const trayCtx = buildTrayCoherenceContext({
    searchMeta: {
      verdictIntelligence: {
        version: "phase10-v1",
        verdict: "BUY READY",
        confidence: 0.86,
        rationale: `${name} lead rationale.`,
        strengths: [],
        warnings: [],
        factorTrace: {},
      },
      phase93TrustDiscount: {
        version: "phase93-v1",
        trayAssessments: tray.map((product, index) => trustFactory(product, index)),
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
        searchQuery: query,
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

  const productsByLink = new Map(
    tray.map((product) => [product.link, { product, searchQuery: query }])
  );

  return { name, segment: name, coherenceMap, metaByLink, productsByLink };
}

const STANDARD = {
  iPhone: ["Performance", "Camera", "Battery", "Storage", "Ecosystem", "Value"],
  MacBook: ["CPU", "RAM", "Display", "Portability", "Longevity", "Value"],
  Sofa: ["Comfort", "Material", "Construction", "Durability", "Dimensions", "Value"],
  Headphones: ["Sound", "ANC", "Comfort", "Battery", "Codec Support", "Value"],
};

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/decisionAlignmentEngine.ts"), "utf8").includes(
    "resolveDecisionAlignment"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase30DecisionAlignmentActivation.ts"), "utf8").includes(
    "buildAlignedDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

const BANNED_GENERIC_PHRASES = [
  "product leadership",
  "strong profile",
  "confidence reflects leadership",
  "lead the profile",
  "limited competitive pressure",
  "no clear single winner",
  "good product profile with moderate confidence",
];

function validateScenario(data, standardLabels, segmentKey) {
  const map = buildAlignedDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const display = buildDisplayCoherenceByLink(data.coherenceMap, map);
  const trayVerdict = resolveUnifiedTrayVerdictFromUniversal(display);
  const rows = [...map.values()];
  const trayAuthority = assignTrayVerdictAuthority(map);

  for (const row of rows) {
    const intel = row.productIntelligence;
    assert.ok(intel?.alignmentFlags?.includes("phase30_verdict_aligned"), `${data.name}: aligned flag`);
    assert.ok(intel?.alignmentFlags?.includes("phase30_verdict_authority"), `${data.name}: authority flag`);
    assert.ok(
      intel?.alignmentFlags?.includes("phase325_market_opportunity_balanced"),
      `${data.name}: phase325 balancing flag`
    );

    for (const phrase of BANNED_GENERIC_PHRASES) {
      assert.ok(
        !row.reasonLine.toLowerCase().includes(phrase) &&
          !(row.secondaryReason ?? "").toLowerCase().includes(phrase),
        `${data.name}: banned phrase "${phrase}"`
      );
    }

    assert.ok(
      /pressure \d+\/100/i.test(row.reasonLine) || /pressure \d+\/100/i.test(row.secondaryReason ?? ""),
      `${data.name}: reason cites alternative pressure`
    );
    assert.ok(
      /value \d+/i.test(row.reasonLine) ||
        /value \d+/i.test(row.secondaryReason ?? "") ||
        /trust \d+/i.test(row.reasonLine),
      `${data.name}: reason cites value or trust position`
    );

    if (row.verdict === "BUY READY") {
      assert.ok(row.confidence >= 74, `${data.name}: BUY confidence >= 74 (got ${row.confidence})`);
      assert.ok(
        !row.displayChips.every((chip) => chip.tone === "slate"),
        `${data.name}: BUY chips not all negative`
      );
    }
    if (row.verdict === "COMPARE") {
      assert.ok(row.confidence >= 52 && row.confidence <= 78, `${data.name}: COMPARE confidence band`);
      assert.ok(
        row.displayChips.filter((chip) => chip.tone === "emerald").length <= 4,
        `${data.name}: COMPARE avoids all-emerald chips`
      );
    }
    if (row.verdict === "WAIT") {
      assert.ok(row.confidence >= 44 && row.confidence <= 66, `${data.name}: WAIT confidence band`);
    }
    if (row.verdict === "AVOID") {
      assert.ok(row.confidence <= 45, `${data.name}: AVOID confidence <= 45 (got ${row.confidence})`);
    }

    const labels = intel.dimensions.map((dim) => dim.label);
    for (const label of standardLabels) {
      assert.ok(labels.includes(label), `${data.name}: standard dimension ${label}`);
    }

    assert.ok(
      chipsSupportVerdict(row.verdict, row.displayChips, intel),
      `${data.name}: chips support verdict`
    );
    assert.ok(row.reasonLine.length > 0, `${data.name}: chip-derived reason exists`);
  }

  if (rows.length >= 4) {
    assert.ok(
      trayVerdictMatchesCardMajority([...display.values()], trayVerdict.verdict),
      `${data.name}: tray matches card majority`
    );
  }

  const distribution = Object.fromEntries(
    ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
      verdict,
      rows.filter((row) => row.verdict === verdict).length,
    ])
  );
  const compareShare = distribution.COMPARE / rows.length;
  assert.ok(distribution["BUY READY"] >= 1, `${data.name}: at least one BUY READY`);
  assert.ok(compareShare <= 0.55, `${data.name}: COMPARE share <= 55% (got ${Math.round(compareShare * 100)}%)`);
  const waitShare = distribution.WAIT / rows.length;
  assert.ok(waitShare <= 0.5, `${data.name}: WAIT share <= 50% (got ${Math.round(waitShare * 100)}%)`);
  assert.ok(
    distribution.WAIT >= 1 || rows.length <= 4,
    `${data.name}: trailing WAIT posture when tray is large enough`
  );

  const buyRow = rows.find((row) => row.verdict === "BUY READY");
  if (buyRow) {
    assert.ok(
      buyRow.reasonLine.toLowerCase().includes("buy now"),
      `${data.name}: BUY reason answers why buy now`
    );
  }
  const compareRow = rows.find((row) => row.verdict === "COMPARE");
  if (compareRow) {
    assert.ok(
      (compareRow.secondaryReason ?? "").toLowerCase().includes("blocks buy ready") ||
        compareRow.reasonLine.toLowerCase().includes("compare"),
      `${data.name}: COMPARE reason explains blocker`
    );
  }
  const canonical = getStandardDimensionLabels(segmentKey);
  assert.deepEqual(canonical, standardLabels);

  return {
    name: data.name,
    verdicts: distribution,
    trayAuthority: [...trayAuthority.values()].map((row) => ({
      rankIndex: row.rankIndex,
      verdict: row.verdict,
      gapFromTop: Math.round(row.gapFromTop * 10) / 10,
    })),
    confidences: rows.map((row) => ({ verdict: row.verdict, confidence: row.confidence })),
    sampleReason: rows[0]?.reasonLine,
    sampleChips: rows[0]?.displayChips.map((chip) => chip.label),
  };
}

const iphone = scenario(
  "iPhone",
  "iphone 15 pro max 256gb best deal",
  [
    listing(1, "Apple iPhone 15 Pro Max 256GB Titanium", "Coolblue", 1199, 1299, 4.8, 3200, "iphone"),
    listing(2, "iPhone 15 Pro Max 256GB Natural Titanium", "MediaMarkt", 1229, 1299, 4.7, 2100, "iphone"),
    listing(3, "Apple iPhone 15 Pro Max 256 GB", "Amazon", 1179, 1279, 4.7, 4100, "iphone"),
    listing(4, "iPhone 15 Pro Max 256GB", "Bol.com", 1249, 1299, 4.6, 980, "iphone"),
    listing(5, "iPhone 15 Pro Max 256GB import", "GreyImport", 999, 1199, 4.0, 88, "iphone"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "GreyImport" ? 41 : 80 - (index % 4),
    fakeDiscountRisk: product.store === "GreyImport" ? "high" : "low",
    priceAnomaly: product.store === "GreyImport" ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "GreyImport",
  })
);

const macbook = scenario(
  "MacBook",
  "macbook pro m3 14 inch best price",
  [
    listing(1, "Apple MacBook Pro 14 M3 Pro 512GB 32GB RAM Retina", "Coolblue", 2199, 2499, 4.8, 1240, "mac"),
    listing(2, "MacBook Pro 14 M3 512GB Space Black 16GB RAM", "MediaMarkt", 2249, 2499, 4.7, 980, "mac"),
    listing(3, "Apple MacBook Pro 14-inch M3 512GB SSD", "Amazon", 2149, 2399, 4.6, 2100, "mac"),
    listing(4, "MacBook Pro 14 M3 512GB", "Bol.com", 2299, 2499, 4.5, 640, "mac"),
    listing(5, "MacBook Pro 14 M3 (refurb)", "BackMarket", 1899, 2199, 4.2, 310, "mac"),
    listing(6, "MacBook Pro 14 M3 512GB", "RandomMarket", 1799, 2299, 3.9, 42, "mac"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "RandomMarket" ? 34 : 78 - index,
    fakeDiscountRisk: product.store === "RandomMarket" ? "high" : "low",
    priceAnomaly: product.store === "RandomMarket" ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "RandomMarket",
  })
);

const sofa = scenario(
  "Sofa",
  "modular corner sofa grey fabric",
  [
    listing(1, "Modular Corner Sofa Grey Fabric 5-seat L-shape deep seat", "IKEA", 899, 1099, 4.5, 620, "sofa"),
    listing(2, "Corner Sofa Modular Grey L-shape velvet", "Leen Bakker", 949, 1149, 4.3, 210, "sofa"),
    listing(3, "Grey Fabric Modular Sofa Corner", "Bol.com", 879, 999, 4.4, 480, "sofa"),
    listing(4, "Premium Modular Corner Sofa Grey solid wood frame", "Made.com", 1299, 1499, 4.6, 140, "sofa"),
    listing(5, "Budget Corner Sofa Grey Fabric particle board", "UnknownOutlet", 499, 899, 3.7, 18, "sofa"),
    listing(6, "Modular Sofa Grey 4-seat stain resistant", "Coolblue", 999, 1199, 4.5, 330, "sofa"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "UnknownOutlet" ? 37 : 72 - (index % 3),
    fakeDiscountRisk: product.store === "UnknownOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 520 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "UnknownOutlet",
  })
);

const headphones = scenario(
  "Headphones",
  "wireless noise cancelling headphones best",
  [
    listing(1, "Sony WH-1000XM5 Wireless NC LDAC hi-res over-ear", "Coolblue", 329, 399, 4.8, 4200, "audio"),
    listing(2, "Bose QuietComfort Ultra Headphones ANC 30 hour", "MediaMarkt", 379, 429, 4.7, 2100, "audio"),
    listing(3, "Apple AirPods Max Space Grey", "Amazon", 549, 579, 4.6, 3100, "audio"),
    listing(4, "Sennheiser Momentum 4 Wireless aptX adaptive", "Bol.com", 299, 349, 4.7, 980, "audio"),
    listing(5, "Budget NC Headphones Pro X", "GreyOutlet", 89, 199, 3.8, 24, "audio"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: product.store === "GreyOutlet" ? 35 : 79 - (index % 4),
    fakeDiscountRisk: product.store === "GreyOutlet" ? "high" : "low",
    priceAnomaly: product.price <= 95 ? "suspicious_low" : "normal",
    suspiciousSeller: product.store === "GreyOutlet",
  })
);

const reports = [
  validateScenario(iphone, STANDARD.iPhone, "phones"),
  validateScenario(macbook, STANDARD.MacBook, "laptops"),
  validateScenario(sofa, STANDARD.Sofa, "sofas"),
  validateScenario(headphones, STANDARD.Headphones, "headphones"),
];

for (const [link, coherent] of iphone.coherenceMap) {
  const universal = buildAlignedDecisionMap(
    iphone.coherenceMap,
    iphone.metaByLink,
    iphone.productsByLink
  ).get(link);
  const overlay = overlayCoherentWithUniversal(coherent, universal);
  assert.equal(overlay.alignmentScore, universal.confidence, "drawer confidence matches aligned card");
  assert.equal(overlay.reasonLine, universal.reasonLine, "drawer reason matches aligned card");
}

console.log("phase30-decision-alignment: ok");
console.log(JSON.stringify({ reports }));
