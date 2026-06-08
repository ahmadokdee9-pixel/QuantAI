#!/usr/bin/env node
/**
 * Phase 32 — Category reasoning authority validation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activateProductDecisionCoherence,
  buildTrayCoherenceContext,
} from "../lib/ui/decisionCoherenceActivation.ts";
import {
  explanationMatchesCategoryProfile,
  getCategoryProfileVocabulary,
  resolveCategoryReasoningProfile,
} from "../lib/ui/categoryReasoningAuthorityEngine.ts";
import { isScoreFreeBriefLanguage } from "../lib/ui/decisionBriefAuthorityEngine.ts";
import { buildCategoryReasoningDecisionMap } from "../lib/ui/phase32CategoryReasoningActivation.ts";

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

  return { name, expectedProfile: name.toLowerCase(), query, coherenceMap, metaByLink, productsByLink };
}

assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/categoryReasoningAuthorityEngine.ts"), "utf8").includes(
    "resolveCategoryDecisionBriefAuthority"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "lib/ui/phase32CategoryReasoningActivation.ts"), "utf8").includes(
    "buildCategoryReasoningDecisionMap"
  )
);
assert.ok(
  readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8").includes(
    "buildCommerceIntelligenceCoreDecisionMap"
  )
);

const PROFILE_EXPECTATIONS = {
  iphone: ["iphone", "ecosystem", "camera"],
  macbook: ["macbook", "cpu", "portability"],
  laptop: ["laptop", "ram", "portability"],
  sofa: ["sofa", "comfort", "build quality"],
};

function validateScenario(data) {
  const map = buildCategoryReasoningDecisionMap(data.coherenceMap, data.metaByLink, data.productsByLink);
  const rows = [...map.values()];
  const sampleProduct = data.coherenceMap.keys().next().value;
  const sampleTitle = data.productsByLink.get(sampleProduct)?.product.title ?? "";
  const profile = resolveCategoryReasoningProfile(
    rows[0]?.productIntelligence?.segment ?? null,
    sampleTitle,
    data.query
  );

  if (data.name === "iPhone") assert.equal(profile, "iphone");
  if (data.name === "MacBook") assert.equal(profile, "macbook");
  if (data.name === "Laptop") assert.equal(profile, "laptop");
  if (data.name === "Sofa") assert.equal(profile, "sofa");

  for (const row of rows) {
    const intel = row.productIntelligence;
    assert.ok(
      intel?.alignmentFlags?.includes("phase32_category_reasoning_authority"),
      `${data.name}: phase32 flag`
    );
    assert.ok(row.decisionThesis, `${data.name}: thesis present`);
    assert.ok(isScoreFreeBriefLanguage(row.decisionThesis), `${data.name}: thesis score-free`);
    assert.ok(isScoreFreeBriefLanguage(row.reasonLine), `${data.name}: reason score-free`);

    const blob = `${row.decisionThesis} ${row.reasonLine} ${row.secondaryReason ?? ""}`.toLowerCase();
    assert.ok(
      explanationMatchesCategoryProfile(profile, blob),
      `${data.name}: category-native language (${profile})`
    );

    for (const marker of PROFILE_EXPECTATIONS[data.name.toLowerCase()] ?? []) {
      assert.ok(blob.includes(marker), `${data.name}: expected marker "${marker}"`);
    }

    if (row.verdict === "BUY READY") {
      assert.ok(
        blob.includes("purchase opportunity") || blob.includes("purchase this"),
        `${data.name}: BUY explains category purchase opportunity`
      );
    }
    if (row.verdict === "COMPARE") {
      assert.ok(
        blob.includes("block buy ready") || blob.includes("compare"),
        `${data.name}: COMPARE explains competitor category edge`
      );
    }
    if (row.verdict === "WAIT") {
      assert.ok(
        blob.includes("wait") && (blob.includes("improve") || blob.includes("until")),
        `${data.name}: WAIT explains category weakness blocker`
      );
    }
  }

  return {
    name: data.name,
    profile,
    vocabulary: getCategoryProfileVocabulary(profile),
    verdicts: Object.fromEntries(
      ["BUY READY", "WAIT", "COMPARE", "AVOID"].map((verdict) => [
        verdict,
        rows.filter((row) => row.verdict === verdict).length,
      ])
    ),
    samples: rows.slice(0, 2).map((row) => ({
      verdict: row.verdict,
      thesis: row.decisionThesis,
      reason: row.reasonLine,
    })),
  };
}

const iphone = scenario(
  "iPhone",
  "iphone 15 pro max 256gb best deal",
  [
    listing(1, "Apple iPhone 15 Pro Max 256GB Titanium", "Coolblue", 1199, 1299, 4.8, 3200, "iphone"),
    listing(2, "iPhone 15 Pro Max 256GB Natural Titanium", "MediaMarkt", 1229, 1299, 4.7, 2100, "iphone"),
    listing(3, "Apple iPhone 15 Pro Max 256 GB", "Amazon", 1179, 1279, 4.7, 4100, "iphone"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: 80 - index,
    fakeDiscountRisk: "low",
    priceAnomaly: "normal",
    suspiciousSeller: false,
  })
);

const macbook = scenario(
  "MacBook",
  "macbook pro m3 14 inch best price",
  [
    listing(1, "Apple MacBook Pro 14 M3 Pro 512GB 32GB RAM Retina", "Coolblue", 2199, 2499, 4.8, 1240, "mac"),
    listing(2, "MacBook Pro 14 M3 512GB Space Black 16GB RAM", "MediaMarkt", 2249, 2499, 4.7, 980, "mac"),
    listing(3, "Apple MacBook Pro 14-inch M3 512GB SSD", "Amazon", 2149, 2399, 4.6, 2100, "mac"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: 78 - index,
    fakeDiscountRisk: "low",
    priceAnomaly: "normal",
    suspiciousSeller: false,
  })
);

const laptop = scenario(
  "Laptop",
  "dell xps 15 laptop 32gb ram best price",
  [
    listing(1, "Dell XPS 15 9530 Intel i7 32GB RAM 1TB SSD OLED", "Coolblue", 1899, 2199, 4.7, 820, "laptop"),
    listing(2, "Dell XPS 15 Laptop 32GB RAM 1TB", "MediaMarkt", 1949, 2199, 4.6, 540, "laptop"),
    listing(3, "Dell XPS 15 9530 32GB RAM Ultrabook", "Amazon", 1849, 2099, 4.5, 1100, "laptop"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: 76 - index,
    fakeDiscountRisk: "low",
    priceAnomaly: "normal",
    suspiciousSeller: false,
  })
);

const sofa = scenario(
  "Sofa",
  "modular corner sofa grey fabric",
  [
    listing(1, "Modular Corner Sofa Grey Fabric 5-seat L-shape deep seat", "IKEA", 899, 1099, 4.5, 620, "sofa"),
    listing(2, "Corner Sofa Modular Grey L-shape velvet", "Leen Bakker", 949, 1149, 4.3, 210, "sofa"),
    listing(3, "Grey Fabric Modular Sofa Corner", "Bol.com", 879, 999, 4.4, 480, "sofa"),
  ],
  (product, index) => ({
    link: product.link,
    trustScore: 72 - index,
    fakeDiscountRisk: "low",
    priceAnomaly: "normal",
    suspiciousSeller: false,
  })
);

const reports = [iphone, macbook, laptop, sofa].map(validateScenario);

console.log("phase32-category-reasoning-authority: ok");
console.log(JSON.stringify({ reports }));
