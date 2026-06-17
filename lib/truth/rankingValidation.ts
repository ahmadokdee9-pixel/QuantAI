/**
 * Phase 4 — Ranking validation, golden benchmarks, and anomaly detection.
 * Hardening utilities only — no ranking logic changes.
 */

import { getStoreTrustScore } from "@/lib/shoppingScore";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { RankingDecisionRecord } from "@/lib/truth/rankingDecisionRecord";
import {
  sortProductsByTrustDrivenRank,
  trustDrivenRankOrder,
  type TrustDrivenRankResult,
} from "@/lib/truth/trustDrivenCompositeRank";
import { resolveCanonicalSearchRank } from "@/lib/truth/canonicalSearchRank";
import { buildTruthFoundationSnapshot } from "@/lib/truth/truthEvidenceBuilder";

export type GoldenRankingBenchmark = {
  id: string;
  query: string;
  products: QuantProduct[];
  expectedTopLink: string;
  expectedTopAnyOf?: string[];
  top3MustInclude?: string[];
  top3MustExclude?: string[];
  mustNotRankFirst?: string[];
};

export type RankingAnomalyKind =
  | "low_trust_outranks_trusted"
  | "constraint_violation_top3"
  | "irrelevant_top3"
  | "not_recommended_top3"
  | "excessive_truth_delta";

export type RankingAnomaly = {
  kind: RankingAnomalyKind;
  link: string;
  message: string;
};

export type LatencyReport = {
  samples: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

const TRUTH_DELTA_CLAMP = 25;
const IRRELEVANT_MATCH_THRESHOLD = 40;
const LOW_TRUST_THRESHOLD = 46;
const TRUSTED_THRESHOLD = 72;
const EXCESSIVE_TRUTH_DELTA = 20;

function baseProduct(overrides: Partial<QuantProduct> & Pick<QuantProduct, "id" | "title" | "link" | "price">): QuantProduct {
  return {
    store: "Amazon.com",
    displayPrice: `€${overrides.price}`,
    rating: 4.5,
    image: "",
    reviewsCount: 200,
    shipping: "Free delivery",
    availability: "In stock",
    oldPrice: null,
    priceTrend: "stable",
    extensions: [],
    ...overrides,
  };
}

/** Stable golden-query benchmark tray for regression protection. */
export const GOLDEN_RANKING_BENCHMARKS: GoldenRankingBenchmark[] = [
  {
    id: "gaming_laptop",
    query: "best gaming laptop under 1500 euro",
    expectedTopLink: "https://bench/gaming-laptop",
    expectedTopAnyOf: ["https://bench/gaming-laptop", "https://bench/msi-katana"],
    mustNotRankFirst: ["https://bench/xps13"],
    products: [
      baseProduct({
        id: 1,
        title: "ASUS ROG Strix G16 RTX 4070 165Hz Gaming Laptop",
        link: "https://bench/gaming-laptop",
        price: 1399,
        rating: 4.7,
        reviewsCount: 420,
        extensions: ["Gaming", "RTX 4070"],
      }),
      baseProduct({
        id: 2,
        title: "MSI Katana 15 RTX 4060 Gaming Laptop",
        link: "https://bench/msi-katana",
        price: 1299,
        rating: 4.6,
        reviewsCount: 310,
        extensions: ["Gaming", "RTX 4060"],
      }),
      baseProduct({
        id: 3,
        title: "Dell XPS 13 Ultrabook Intel i7 Business Laptop",
        link: "https://bench/xps13",
        price: 1399,
        extensions: ["Ultrabook"],
      }),
    ],
  },
  {
    id: "cheap_iphone",
    query: "cheap iphone",
    expectedTopLink: "https://bench/iphone15",
    products: [
      baseProduct({
        id: 10,
        title: "Apple iPhone 15 128GB",
        link: "https://bench/iphone15",
        store: "Best Buy",
        price: 699,
        rating: 4.8,
        reviewsCount: 900,
        oldPrice: 799,
      }),
      baseProduct({
        id: 11,
        title: "Samsung Galaxy A15 Budget Android Phone",
        link: "https://bench/galaxy-a15",
        store: "Best Buy",
        price: 199,
        rating: 4.5,
        reviewsCount: 900,
        oldPrice: 799,
      }),
    ],
  },
  {
    id: "premium_headphones",
    query: "premium wireless noise cancelling headphones",
    expectedTopLink: "https://bench/sony-xm5",
    products: [
      baseProduct({
        id: 20,
        title: "Sony WH-1000XM5 Premium Noise Cancelling Headphones",
        link: "https://bench/sony-xm5",
        price: 349,
        rating: 4.8,
        reviewsCount: 2400,
      }),
      baseProduct({
        id: 21,
        title: "Generic Wired Earbuds Basic",
        link: "https://bench/generic-earbuds",
        price: 12,
        store: "Marketplace Seller",
        rating: 3.6,
        reviewsCount: 8,
      }),
    ],
  },
  {
    id: "camera_phone",
    query: "best camera phone for photography",
    expectedTopLink: "https://bench/iphone-pro",
    products: [
      baseProduct({
        id: 30,
        title: "Apple iPhone 15 Pro Max 256GB Photography Phone",
        link: "https://bench/iphone-pro",
        price: 1199,
        rating: 4.9,
        reviewsCount: 1800,
        extensions: ["48MP camera", "ProRAW"],
      }),
      baseProduct({
        id: 32,
        title: "Google Pixel 8 Pro Camera Phone",
        link: "https://bench/pixel-pro",
        price: 999,
        rating: 4.7,
        reviewsCount: 1200,
        extensions: ["Camera", "Night Sight"],
      }),
      baseProduct({
        id: 31,
        title: "Basic Flip Phone Senior Phone",
        link: "https://bench/flip-phone",
        price: 49,
        rating: 3.2,
        reviewsCount: 12,
      }),
    ],
  },
  {
    id: "oled_tv",
    query: "65 inch OLED TV best picture quality",
    expectedTopLink: "https://bench/lg-oled",
    products: [
      baseProduct({
        id: 40,
        title: "LG OLED65C4 65 inch OLED 4K Smart TV",
        link: "https://bench/lg-oled",
        price: 1799,
        rating: 4.8,
        reviewsCount: 650,
        extensions: ["OLED", "4K HDR"],
      }),
      baseProduct({
        id: 41,
        title: "Budget 65 inch LED TV 1080p",
        link: "https://bench/led-tv",
        price: 499,
        rating: 4.0,
        reviewsCount: 90,
      }),
    ],
  },
  {
    id: "student_laptop",
    query: "student laptop for university budget",
    expectedTopLink: "https://bench/student-laptop",
    products: [
      baseProduct({
        id: 50,
        title: "Lenovo IdeaPad Slim 3 Student Laptop 15 inch",
        link: "https://bench/student-laptop",
        price: 449,
        rating: 4.4,
        reviewsCount: 310,
        extensions: ["Student", "Lightweight"],
      }),
      baseProduct({
        id: 51,
        title: "MacBook Pro 16 M3 Max Workstation",
        link: "https://bench/macbook-pro",
        price: 3499,
        rating: 4.9,
        reviewsCount: 800,
      }),
    ],
  },
  {
    id: "travel_backpack",
    query: "lightweight travel backpack carry on",
    expectedTopLink: "https://bench/travel-backpack",
    products: [
      baseProduct({
        id: 60,
        title: "Lightweight Travel Backpack 40L Carry On Cabin Approved",
        link: "https://bench/travel-backpack",
        price: 79,
        rating: 4.6,
        reviewsCount: 540,
        extensions: ["Lightweight", "Travel", "Compact"],
      }),
      baseProduct({
        id: 61,
        title: "Heavy Duty Hiking Backpack 70L Expedition Pack",
        link: "https://bench/hiking-pack",
        price: 189,
        rating: 4.7,
        reviewsCount: 220,
        extensions: ["Heavy", "Expedition"],
      }),
    ],
  },
  {
    id: "gaming_monitor",
    query: "144hz gaming monitor 27 inch",
    expectedTopLink: "https://bench/gaming-monitor",
    products: [
      baseProduct({
        id: 70,
        title: "ASUS ROG 27 inch 144Hz Gaming Monitor IPS",
        link: "https://bench/gaming-monitor",
        price: 329,
        rating: 4.7,
        reviewsCount: 890,
        extensions: ["144Hz", "Gaming"],
      }),
      baseProduct({
        id: 71,
        title: "Office Monitor 27 inch 60Hz Basic Display",
        link: "https://bench/office-monitor",
        price: 179,
        rating: 4.2,
        reviewsCount: 140,
      }),
    ],
  },
  {
    id: "budget_laptop",
    query: "budget laptop under 400",
    expectedTopLink: "https://bench/budget-chromebook",
    mustNotRankFirst: ["https://bench/expensive-gaming"],
    products: [
      baseProduct({
        id: 80,
        title: "Acer Chromebook 14 Budget Laptop",
        link: "https://bench/budget-chromebook",
        price: 299,
        rating: 4.3,
        reviewsCount: 410,
      }),
      baseProduct({
        id: 82,
        title: "Lenovo IdeaPad 1 Budget Laptop 14 inch",
        link: "https://bench/budget-ideapad",
        price: 349,
        rating: 4.2,
        reviewsCount: 280,
      }),
      baseProduct({
        id: 83,
        title: "ASUS VivoBook Go Budget Laptop",
        link: "https://bench/budget-vivobook",
        price: 379,
        rating: 4.1,
        reviewsCount: 190,
      }),
      baseProduct({
        id: 81,
        title: "ASUS ROG Strix RTX 4080 Gaming Laptop",
        link: "https://bench/expensive-gaming",
        price: 2199,
        rating: 4.8,
        reviewsCount: 300,
      }),
    ],
  },
  {
    id: "wireless_earbuds",
    query: "wireless earbuds best value",
    expectedTopLink: "https://bench/airpods-pro",
    products: [
      baseProduct({
        id: 90,
        title: "Apple AirPods Pro 2 USB-C Wireless Earbuds",
        link: "https://bench/airpods-pro",
        price: 229,
        rating: 4.8,
        reviewsCount: 5200,
      }),
      baseProduct({
        id: 91,
        title: "Wired Earphones 3.5mm Basic",
        link: "https://bench/wired-earphones",
        price: 9,
        rating: 3.5,
        reviewsCount: 20,
      }),
    ],
  },
];

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function buildLatencyReport(durationsMs: number[]): LatencyReport {
  return {
    samples: durationsMs.length,
    p50Ms: Math.round(percentile(durationsMs, 50) * 10) / 10,
    p95Ms: Math.round(percentile(durationsMs, 95) * 10) / 10,
    maxMs: Math.round(Math.max(...durationsMs, 0) * 10) / 10,
  };
}

/** Verify required audit fields on a ranking decision record. */
export function validateRankingDecisionRecordAudit(record: RankingDecisionRecord): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(record.baseScore)) errors.push("missing baseScore");
  if (!Number.isFinite(record.truthDelta)) errors.push("missing truthDelta");
  if (!Number.isFinite(record.finalRankScore)) errors.push("missing finalRankScore");
  if (Math.abs(record.truthDelta) > TRUTH_DELTA_CLAMP + 0.01) errors.push("truthDelta out of bounds");
  if (
    Math.round((record.baseScore + record.truthDelta) * 10) / 10 !==
    Math.round(record.finalRankScore * 10) / 10
  ) {
    errors.push("finalRankScore mismatch");
  }
  if (!record.compositeBreakdown) errors.push("missing compositeBreakdown");
  else {
    for (const key of ["relevance", "trust", "recommendation", "taste", "motivation", "constraints", "decision"] as const) {
      if (!Number.isFinite(record.compositeBreakdown[key])) errors.push(`missing compositeBreakdown.${key}`);
    }
  }
  if (!Array.isArray(record.influencedLayers)) errors.push("missing influencedLayers");
  if (!Array.isArray(record.evidenceChain) || record.evidenceChain.length === 0) errors.push("missing evidenceChain");
  if (!record.whyRanked?.trim()) errors.push("missing whyRanked");
  if (!Array.isArray(record.layers) || record.layers.length !== 9) errors.push("missing layer contributions");
  return errors;
}

/** Detect ranking anomalies for audit reporting. */
export function detectRankingAnomalies(args: {
  orderedLinks: string[];
  scoresByLink: Map<string, TrustDrivenRankResult>;
  productsByLink: Map<string, QuantProduct>;
}): RankingAnomaly[] {
  const anomalies: RankingAnomaly[] = [];
  const top3 = args.orderedLinks.slice(0, 3);

  for (let i = 0; i < top3.length; i++) {
    const link = top3[i];
    const result = args.scoresByLink.get(link);
    const product = args.productsByLink.get(link);
    if (!result || !product) continue;

    const foundation = result.record;
    const trustScore = getStoreTrustScore(product.store);
    const matchScore = foundation.compositeBreakdown.relevance;
    const recLayer = result.record.layers.find((layer) => layer.layer === "2E_recommendation");
    const recTierSignal = recLayer?.signals.join(" ") ?? "";

    if (trustScore < LOW_TRUST_THRESHOLD) {
      for (let j = 0; j < i; j++) {
        const higherLink = top3[j];
        const higherProduct = args.productsByLink.get(higherLink);
        if (!higherProduct) continue;
        const higherTrust = getStoreTrustScore(higherProduct.store);
        if (higherTrust >= TRUSTED_THRESHOLD && trustScore + 20 < higherTrust) {
          anomalies.push({
            kind: "low_trust_outranks_trusted",
            link,
            message: `Low-trust listing ${link} ranked #${i + 1} above trusted ${higherLink}`,
          });
          break;
        }
      }
    }

    if (matchScore < IRRELEVANT_MATCH_THRESHOLD) {
      anomalies.push({
        kind: "irrelevant_top3",
        link,
        message: `Low relevance (${matchScore}) in top 3 for ${link}`,
      });
    }

    if (recTierSignal.includes("NOT_RECOMMENDED") || (recLayer?.scoreContribution ?? 0) <= -6) {
      anomalies.push({
        kind: "not_recommended_top3",
        link,
        message: `Not recommended tier influence in top 3 for ${link}`,
      });
    }

    if (Math.abs(result.truthDelta) > EXCESSIVE_TRUTH_DELTA && matchScore < 55) {
      anomalies.push({
        kind: "excessive_truth_delta",
        link,
        message: `Large truth delta (${result.truthDelta}) with weak relevance for ${link}`,
      });
    }

    const constraintLayer = result.record.layers.find((layer) => layer.layer === "2K_purchaseConstraints");
    if (constraintLayer && constraintLayer.scoreContribution <= -3 && i === 0) {
      anomalies.push({
        kind: "constraint_violation_top3",
        link,
        message: `Constraint penalty on #1 ranked product ${link}`,
      });
    }
  }

  return anomalies;
}

export type GoldenBenchmarkResult = {
  id: string;
  query: string;
  top3: string[];
  expectedTopLink: string;
  pass: boolean;
  anomalies: RankingAnomaly[];
};

/** Run all golden benchmarks and return structured results. */
export function runGoldenRankingBenchmarks(): GoldenBenchmarkResult[] {
  return GOLDEN_RANKING_BENCHMARKS.map((benchmark) => {
    const { orderedProducts, scoresByLink } = resolveCanonicalSearchRank(
      benchmark.products,
      benchmark.query
    );
    const sorted = orderedProducts;
    const top3 = sorted.slice(0, 3).map((product) => product.link);
    const productsByLink = new Map(benchmark.products.map((product) => [product.link, product]));
    const anomalies = detectRankingAnomalies({
      orderedLinks: sorted.map((product) => product.link),
      scoresByLink,
      productsByLink,
    });

    let pass =
      top3[0] === benchmark.expectedTopLink ||
      (benchmark.expectedTopAnyOf?.includes(top3[0] ?? "") ?? false);
    if (benchmark.top3MustInclude) {
      pass = pass && benchmark.top3MustInclude.every((link) => top3.includes(link));
    }
    if (benchmark.top3MustExclude) {
      pass = pass && benchmark.top3MustExclude.every((link) => !top3.includes(link));
    }
    if (benchmark.mustNotRankFirst) {
      pass = pass && benchmark.mustNotRankFirst.every((link) => top3[0] !== link);
    }

    return {
      id: benchmark.id,
      query: benchmark.query,
      top3,
      expectedTopLink: benchmark.expectedTopLink,
      pass,
      anomalies,
    };
  });
}

export type RankingLatencyMetrics = {
  foundationGeneration: LatencyReport;
  rankingDecisionRecord: LatencyReport;
  trayRanking: LatencyReport;
  simulatedApiRankBatch: LatencyReport;
};

/** Measure ranking-related latencies for hardening reports. */
export function measureRankingLatencyMetrics(args?: {
  tray?: QuantProduct[];
  query?: string;
  samples?: number;
}): RankingLatencyMetrics {
  const tray = args?.tray ?? GOLDEN_RANKING_BENCHMARKS[0].products;
  const query = args?.query ?? GOLDEN_RANKING_BENCHMARKS[0].query;
  const samples = args?.samples ?? 5;
  const product = tray[0];

  const foundationMs: number[] = [];
  const recordMs: number[] = [];
  const trayMs: number[] = [];
  const apiMs: number[] = [];

  for (let i = 0; i < samples; i++) {
    let t0 = performance.now();
    const foundation = buildTruthFoundationSnapshot({
      product: product!,
      listingUrl: product!.link,
      searchQuery: query,
    });
    foundationMs.push(performance.now() - t0);

    t0 = performance.now();
    sortProductsByTrustDrivenRank([product!], query);
    recordMs.push(performance.now() - t0);

    t0 = performance.now();
    sortProductsByTrustDrivenRank(tray, query);
    trayMs.push(performance.now() - t0);

    t0 = performance.now();
    const batch = sortProductsByTrustDrivenRank(tray, query);
    trustDrivenRankOrder(
      tray.map((row) => row.link),
      batch.scoresByLink
    );
    apiMs.push(performance.now() - t0);
  }

  return {
    foundationGeneration: buildLatencyReport(foundationMs),
    rankingDecisionRecord: buildLatencyReport(recordMs),
    trayRanking: buildLatencyReport(trayMs),
    simulatedApiRankBatch: buildLatencyReport(apiMs),
  };
}
