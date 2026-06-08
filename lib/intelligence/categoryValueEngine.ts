/**
 * Phase 45 — Category Value Intelligence Engine.
 * Category-native product quality scoring — not price-only logic.
 */

import { resolveCategoryProfileKey, type CategoryProfileKey } from "@/lib/intelligence/categoryProfileRegistry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CategoryValueKind = "sofas" | "laptops" | "phones" | "macbooks" | "generic";

export type CategoryValueIntelligence = {
  version: 1;
  kind: CategoryValueKind;
  categoryKey: CategoryProfileKey;
  qualityScore: number;
  sofaQualityScore?: number;
  laptopQualityScore?: number;
  phoneQualityScore?: number;
  macbookQualityScore?: number;
  dimensions: Array<{ key: string; score: number; signal: string }>;
  reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function ratingScore(product: QuantProduct): number {
  return clamp(Math.round(((product.rating as number) || 4) * 20), 0, 100);
}

function blob(product: QuantProduct, searchQuery: string): string {
  return `${product.title} ${product.extensions?.join(" ") ?? ""} ${searchQuery} ${product.store}`.toLowerCase();
}

export function detectCategoryValueKind(
  product: QuantProduct,
  searchQuery: string,
  segment?: import("@/lib/ui/universalProductIntelligenceEngine").ProductIntelligenceSegment | null
): CategoryValueKind {
  const text = blob(product, searchQuery);
  if (/macbook|mac book|m1|m2|m3|m4/i.test(text)) return "macbooks";
  const key = resolveCategoryProfileKey(segment ?? null, product.title, searchQuery);
  if (key === "sofas" || /\bsofa|sectional|corner sofa|chesterfield\b/i.test(text)) return "sofas";
  if (key === "phones" || /\biphone|galaxy|pixel|phone\b/i.test(text)) return "phones";
  if (key === "laptops" || /\blaptop|notebook|ultrabook|thinkpad|xps\b/i.test(text)) return "laptops";
  return "generic";
}

function scoreSofaQuality(text: string, rating: number): CategoryValueIntelligence["dimensions"] {
  const material = /leather|full.?grain|top.?grain|bouclé|velvet|premium fabric|linen/i.test(text) ? 82 : /fabric|polyester/i.test(text) ? 62 : 55;
  const fabric = /premium fabric|woven|stain.?resistant|performance fabric/i.test(text) ? 80 : /fabric|textile/i.test(text) ? 68 : 58;
  const leather = /genuine leather|full.?grain|top.?grain leather/i.test(text) ? 88 : /leather/i.test(text) ? 72 : 50;
  const seating = /corner|sectional|3.?seater|4.?seater|5.?seater|l.?shape|modular/i.test(text) ? 78 : /2.?seater|compact/i.test(text) ? 65 : 58;
  const design = /designer|premium|scandinavian|modern|luxury|heritage/i.test(text) ? 80 : /classic|contemporary/i.test(text) ? 68 : 58;
  const modularity = /modular|reversible|chaise|corner|sectional/i.test(text) ? 76 : 52;
  const comfort = /memory foam|deep seat|plush|comfort|ergonomic/i.test(text) ? 82 : /foam|spring/i.test(text) ? 68 : rating;
  const brand = /ikea|made\.com|design within reach|roche bobois|poliform|b&b italia/i.test(text) ? 78 : rating;

  return [
    { key: "material_quality", score: material, signal: "material" },
    { key: "fabric_quality", score: fabric, signal: "fabric" },
    { key: "leather_quality", score: leather, signal: "leather" },
    { key: "seating_capacity", score: seating, signal: "capacity" },
    { key: "design_premium", score: design, signal: "design" },
    { key: "modularity", score: modularity, signal: "modularity" },
    { key: "comfort", score: comfort, signal: "comfort" },
    { key: "premium_brand", score: brand, signal: "brand" },
  ];
}

function scoreLaptopQuality(text: string, rating: number): CategoryValueIntelligence["dimensions"] {
  const cpu = /m4|m3|m2|m1|i9|i7|ryzen 9|ryzen 7|ultra 9|ultra 7|snapdragon x elite/i.test(text) ? 86 : /i5|ryzen 5|ultra 5/i.test(text) ? 68 : 52;
  const ram = /\b(32|64)\s*gb\b/i.test(text) ? 88 : /\b16\s*gb\b/i.test(text) ? 78 : /\b8\s*gb\b/i.test(text) ? 55 : 48;
  const ssd = /\b(1\s*tb|1024|2\s*tb|2048)\b/i.test(text) ? 84 : /\b512\s*gb\b/i.test(text) ? 76 : /\b256\s*gb\b/i.test(text) ? 58 : 50;
  const gpu = /rtx 40|rtx 30|rx 7|arc a770|dedicated gpu|gaming/i.test(text) ? 82 : /integrated|iris/i.test(text) ? 58 : 62;
  const display = /oled|4k|qhd|120hz|retina|mini.?led/i.test(text) ? 84 : /fhd|1080p|ips/i.test(text) ? 68 : 55;
  const battery = /18.?hour|15.?hour|all.?day|long battery|22.?hour/i.test(text) ? 80 : /battery/i.test(text) ? 65 : rating - 5;

  return [
    { key: "cpu_generation", score: cpu, signal: "cpu" },
    { key: "ram", score: ram, signal: "ram" },
    { key: "ssd", score: ssd, signal: "ssd" },
    { key: "gpu", score: gpu, signal: "gpu" },
    { key: "display_quality", score: display, signal: "display" },
    { key: "battery", score: clamp(battery, 0, 100), signal: "battery" },
  ];
}

function scorePhoneQuality(text: string, rating: number): CategoryValueIntelligence["dimensions"] {
  const storage = /\b(512|1024|1\s*tb)\s*gb\b/i.test(text) ? 84 : /\b256\s*gb\b/i.test(text) ? 76 : /\b128\s*gb\b/i.test(text) ? 66 : 52;
  const chipset = /a18|a17|a16|snapdragon 8 gen|tensor g4|dimensity 9/i.test(text) ? 88 : /a15|snapdragon 7|tensor g3/i.test(text) ? 72 : 58;
  const battery = /plus|max|pro max|5000mah|all.?day/i.test(text) ? 78 : /battery/i.test(text) ? 65 : rating;
  const camera = /pro max|ultra|200mp|48mp|telephoto|periscope|pro camera/i.test(text) ? 86 : /dual camera|triple camera|camera/i.test(text) ? 70 : 55;
  const generation = /iphone 16|iphone 15|galaxy s24|pixel 9|2024|2025/i.test(text) ? 84 : /iphone 14|galaxy s23|pixel 8|2023/i.test(text) ? 70 : 58;

  return [
    { key: "storage", score: storage, signal: "storage" },
    { key: "chipset_generation", score: chipset, signal: "chipset" },
    { key: "battery", score: battery, signal: "battery" },
    { key: "camera_class", score: camera, signal: "camera" },
    { key: "model_generation", score: generation, signal: "generation" },
  ];
}

function scoreMacbookQuality(text: string, rating: number): CategoryValueIntelligence["dimensions"] {
  const mSeries = /m4 max|m4 pro|m4\b/i.test(text) ? 94 : /m3 max|m3 pro|m3\b/i.test(text) ? 88 : /m2 max|m2 pro|m2\b/i.test(text) ? 78 : /m1 max|m1 pro|m1\b/i.test(text) ? 68 : 50;
  const ram = /\b(32|36|48|64|96|128)\s*gb\b/i.test(text) ? 90 : /\b(16|18|24)\s*gb\b/i.test(text) ? 78 : /\b8\s*gb\b/i.test(text) ? 52 : 60;
  const storage = /\b(2\s*tb|2048|4\s*tb)\b/i.test(text) ? 88 : /\b(1\s*tb|1024|512\s*gb)\b/i.test(text) ? 78 : 58;
  const condition = /refurb|renewed|open box|used/i.test(text) ? 58 : /new|sealed|official/i.test(text) ? 82 : 72;
  const release = /2024|2025|m4|m3 max/i.test(text) ? 86 : /2023|2022|m2/i.test(text) ? 72 : /2021|2020|m1/i.test(text) ? 62 : 55;

  return [
    { key: "m_series_generation", score: mSeries, signal: "m-series" },
    { key: "ram", score: ram, signal: "ram" },
    { key: "storage", score: storage, signal: "storage" },
    { key: "condition", score: condition, signal: "condition" },
    { key: "release_year", score: release, signal: "release" },
  ];
}

function averageScore(dimensions: CategoryValueIntelligence["dimensions"]): number {
  if (dimensions.length === 0) return 50;
  return clamp(
    Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length),
    0,
    100
  );
}

/** Build category-specific quality intelligence for one product. */
export function buildCategoryValueIntelligence(args: {
  product: QuantProduct;
  searchQuery: string;
  segment?: import("@/lib/ui/universalProductIntelligenceEngine").ProductIntelligenceSegment | null;
}): CategoryValueIntelligence {
  const { product, searchQuery, segment = null } = args;
  const kind = detectCategoryValueKind(product, searchQuery, segment);
  const text = blob(product, searchQuery);
  const rating = ratingScore(product);
  const categoryKey = resolveCategoryProfileKey(segment, product.title, searchQuery);

  let dimensions: CategoryValueIntelligence["dimensions"] = [{ key: "quality", score: rating, signal: "generic" }];
  let qualityScore = rating;

  const base: CategoryValueIntelligence = {
    version: 1,
    kind,
    categoryKey,
    qualityScore,
    dimensions,
    reasoning: `${kind} quality assessed from listing signals and ratings.`,
  };

  if (kind === "sofas") {
    dimensions = scoreSofaQuality(text, rating);
    qualityScore = averageScore(dimensions);
    return {
      ...base,
      sofaQualityScore: qualityScore,
      qualityScore,
      dimensions,
      reasoning: `Sofa quality ${qualityScore}/100 from material, comfort, design, and brand signals.`,
    };
  }

  if (kind === "laptops") {
    dimensions = scoreLaptopQuality(text, rating);
    qualityScore = averageScore(dimensions);
    return {
      ...base,
      laptopQualityScore: qualityScore,
      qualityScore,
      dimensions,
      reasoning: `Laptop quality ${qualityScore}/100 from CPU, RAM, SSD, GPU, display, and battery signals.`,
    };
  }

  if (kind === "phones") {
    dimensions = scorePhoneQuality(text, rating);
    qualityScore = averageScore(dimensions);
    return {
      ...base,
      phoneQualityScore: qualityScore,
      qualityScore,
      dimensions,
      reasoning: `Phone quality ${qualityScore}/100 from storage, chipset, camera, and generation signals.`,
    };
  }

  if (kind === "macbooks") {
    dimensions = scoreMacbookQuality(text, rating);
    qualityScore = averageScore(dimensions);
    return {
      ...base,
      macbookQualityScore: qualityScore,
      qualityScore,
      dimensions,
      reasoning: `MacBook quality ${qualityScore}/100 from M-series generation, RAM, storage, and condition signals.`,
    };
  }

  return base;
}
