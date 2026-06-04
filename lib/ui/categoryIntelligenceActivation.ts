/**
 * Phase 20.0 — Category Intelligence Activation Layer.
 * Category-specific evaluation from existing product metadata only (presentation).
 */

import { inferProductCategory } from "@/lib/intelligence/categoryContext";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CategorySegment = "phones" | "laptops" | "tvs" | "headphones";

export type CategoryDimensionScore = {
  key: string;
  label: string;
  score: number;
};

export type ActivatedCategoryIntelligence = {
  segment: CategorySegment | null;
  segmentLabel: string;
  categoryScore: number;
  categoryReasons: string[];
  categoryStrengths: string[];
  categoryWeaknesses: string[];
  dimensions: CategoryDimensionScore[];
  cardLine: string;
  expandedLines: string[];
};

export type CategoryIntelligenceInput = {
  product: QuantProduct;
  searchQuery?: string;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function listingSafe(product: QuantProduct): QuantProduct {
  return product.extensions ? product : { ...product, extensions: [] };
}

function metadataBlob(product: QuantProduct, searchQuery = ""): string {
  const safe = listingSafe(product);
  return `${searchQuery} ${safe.title} ${safe.extensions.join(" ")}`.toLowerCase();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromSignals(base: number, strongHits: number, weakHits: number): number {
  return clampScore(base + strongHits * 12 - weakHits * 11);
}

function detectSegment(product: QuantProduct, searchQuery = ""): CategorySegment | null {
  const blob = metadataBlob(product, searchQuery);
  const slug: ProductCategorySlug = product.qiCategory ?? inferProductCategory(searchQuery, product.title);

  if (/(iphone|pixel|galaxy s|galaxy a|oneplus|smartphone|android phone|\bphone\b)/i.test(blob)) {
    return "phones";
  }
  if (/(macbook|laptop|chromebook|thinkpad|zenbook|notebook|ultrabook|surface laptop)/i.test(blob)) {
    return "laptops";
  }
  if (/(oled tv|qled tv|smart tv|\btv\b|television)/i.test(blob)) {
    return "tvs";
  }
  if (/(headphone|earbud|airpods|headset|wh-1000|noise cancelling|anc\b)/i.test(blob)) {
    return "headphones";
  }

  if (slug !== "electronics" && slug !== "general") return null;
  return null;
}

function segmentLabel(segment: CategorySegment): string {
  if (segment === "phones") return "Phones";
  if (segment === "laptops") return "Laptops";
  if (segment === "tvs") return "TVs";
  return "Headphones";
}

function evaluatePhones(blob: string): CategoryDimensionScore[] {
  const cameraStrong =
    /(\d{2,3})\s*mp|pro camera|ultrawide|telephoto|night mode|ois|periscope|48mp|50mp|108mp/i.test(blob);
  const cameraWeak = /single camera|2mp|basic camera/i.test(blob) && !cameraStrong;
  const batteryStrong = /5000\s*mah|6000\s*mah|all[- ]day|long battery|battery life/i.test(blob);
  const batteryWeak = /3000\s*mah|3200\s*mah|small battery/i.test(blob);
  const storageStrong = /512\s*gb|1\s*tb|256\s*gb/i.test(blob);
  const storageWeak = /64\s*gb|32\s*gb|128\s*gb/i.test(blob) && !storageStrong;
  const chipsetStrong =
    /snapdragon 8|a17|a16|a18|dimensity 9|gen 3|gen 2|tensor g|exynos 2\d/i.test(blob);
  const chipsetWeak = /snapdragon 4|helio|entry[- ]level|older chip/i.test(blob);
  const softwareStrong =
    /pixel|iphone|galaxy s|7 years|6 years|5 years update|android 1[345]|ios 1[78]/i.test(blob);
  const softwareWeak = /android 1[01]\b|legacy android|no updates/i.test(blob);

  return [
    {
      key: "camera_quality",
      label: "Camera quality",
      score: scoreFromSignals(52, cameraStrong ? 2 : 0, cameraWeak ? 1 : 0),
    },
    {
      key: "battery_value",
      label: "Battery value",
      score: scoreFromSignals(50, batteryStrong ? 2 : 0, batteryWeak ? 1 : 0),
    },
    {
      key: "storage_value",
      label: "Storage value",
      score: scoreFromSignals(48, storageStrong ? 2 : 0, storageWeak ? 1 : 0),
    },
    {
      key: "chipset_generation",
      label: "Chipset generation",
      score: scoreFromSignals(50, chipsetStrong ? 2 : 0, chipsetWeak ? 1 : 0),
    },
    {
      key: "software_longevity",
      label: "Software longevity",
      score: scoreFromSignals(54, softwareStrong ? 2 : 0, softwareWeak ? 1 : 0),
    },
  ];
}

function evaluateLaptops(blob: string): CategoryDimensionScore[] {
  const cpuStrong = /m3|m2|m1|ultra 7|ultra 9|ryzen 7|ryzen 9|i7|i9|core ultra|snapdragon x/i.test(blob);
  const cpuWeak = /celeron|pentium|n4020|n4120|i3\b|ryzen 3/i.test(blob);
  const ramStrong = /32\s*gb ram|64\s*gb ram|32gb|64gb ddr/i.test(blob);
  const ramWeak = /8\s*gb ram|8gb ram|4\s*gb ram|4gb ram/i.test(blob) && !ramStrong;
  const gpuStrong = /rtx 40|rtx 30|rtx 50|arc a770|rx 7|dedicated gpu|gaming laptop/i.test(blob);
  const gpuWeak = /integrated graphics|uhd graphics|iris xe/i.test(blob) && !gpuStrong;
  const batteryStrong = /18\s*hour|20\s*hour|long battery|all[- ]day/i.test(blob);
  const batteryWeak = /short battery|3[- ]cell/i.test(blob);
  const upgradeStrong = /upgradeable|user[- ]serviceable|2x m\.2|extra ram slot/i.test(blob);
  const upgradeWeak = /soldered|non[- ]upgradeable|fixed ram/i.test(blob);

  return [
    {
      key: "cpu_value",
      label: "CPU value",
      score: scoreFromSignals(52, cpuStrong ? 2 : 0, cpuWeak ? 1 : 0),
    },
    {
      key: "ram_value",
      label: "RAM value",
      score: scoreFromSignals(50, ramStrong ? 2 : 0, ramWeak ? 1 : 0),
    },
    {
      key: "gpu_suitability",
      label: "GPU suitability",
      score: scoreFromSignals(48, gpuStrong ? 2 : 0, gpuWeak ? 1 : 0),
    },
    {
      key: "battery_life",
      label: "Battery life",
      score: scoreFromSignals(50, batteryStrong ? 2 : 0, batteryWeak ? 1 : 0),
    },
    {
      key: "upgrade_potential",
      label: "Upgrade potential",
      score: scoreFromSignals(46, upgradeStrong ? 2 : 0, upgradeWeak ? 1 : 0),
    },
  ];
}

function evaluateTvs(blob: string): CategoryDimensionScore[] {
  const displayStrong = /oled|qled|mini[- ]led|neo qled|qd-oled/i.test(blob);
  const displayWeak = /lcd\b|led tv/i.test(blob) && !displayStrong;
  const brightnessStrong = /1000 nits|1500 nits|2000 nits|peak brightness|bright panel/i.test(blob);
  const brightnessWeak = /dim panel|low brightness/i.test(blob);
  const refreshStrong = /120\s*hz|144\s*hz|vrr|variable refresh/i.test(blob);
  const refreshWeak = /60\s*hz/i.test(blob) && !refreshStrong;
  const gamingStrong = /120\s*hz|vrr|game mode|low input lag|hdmi 2\.1/i.test(blob);
  const gamingWeak = /basic tv|hotel tv/i.test(blob);
  const hdrStrong = /dolby vision|hdr10\+|hdr10\b|filmmaker mode/i.test(blob);
  const hdrWeak = /sdr only|no hdr/i.test(blob);

  return [
    {
      key: "display_technology",
      label: "Display technology",
      score: scoreFromSignals(52, displayStrong ? 2 : 0, displayWeak ? 1 : 0),
    },
    {
      key: "brightness",
      label: "Brightness",
      score: scoreFromSignals(48, brightnessStrong ? 2 : 0, brightnessWeak ? 1 : 0),
    },
    {
      key: "refresh_rate",
      label: "Refresh rate",
      score: scoreFromSignals(50, refreshStrong ? 2 : 0, refreshWeak ? 1 : 0),
    },
    {
      key: "gaming_suitability",
      label: "Gaming suitability",
      score: scoreFromSignals(46, gamingStrong ? 2 : 0, gamingWeak ? 1 : 0),
    },
    {
      key: "hdr_quality",
      label: "HDR quality",
      score: scoreFromSignals(50, hdrStrong ? 2 : 0, hdrWeak ? 1 : 0),
    },
  ];
}

function evaluateHeadphones(blob: string): CategoryDimensionScore[] {
  const soundStrong = /hi[- ]res|ldac|aptx adaptive|studio sound|balanced armature/i.test(blob);
  const soundWeak = /basic sound|mono/i.test(blob);
  const ancStrong = /anc\b|noise cancelling|adaptive noise|wh-1000|quietcomfort/i.test(blob);
  const ancWeak = /passive only|no anc/i.test(blob);
  const batteryStrong = /30 hour|40 hour|50 hour|long battery|60 hour/i.test(blob);
  const batteryWeak = /10 hour|12 hour|short battery/i.test(blob);
  const comfortStrong = /over[- ]ear|memory foam|lightweight|comfort/i.test(blob);
  const comfortWeak = /on[- ]ear only|heavy/i.test(blob);
  const micStrong = /beamforming|clear call|microphone array|call quality/i.test(blob);
  const micWeak = /basic mic|poor mic/i.test(blob);

  return [
    {
      key: "sound_quality",
      label: "Sound quality",
      score: scoreFromSignals(52, soundStrong ? 2 : 0, soundWeak ? 1 : 0),
    },
    {
      key: "anc_quality",
      label: "ANC quality",
      score: scoreFromSignals(50, ancStrong ? 2 : 0, ancWeak ? 1 : 0),
    },
    {
      key: "battery_life",
      label: "Battery life",
      score: scoreFromSignals(48, batteryStrong ? 2 : 0, batteryWeak ? 1 : 0),
    },
    {
      key: "comfort",
      label: "Comfort",
      score: scoreFromSignals(50, comfortStrong ? 2 : 0, comfortWeak ? 1 : 0),
    },
    {
      key: "microphone_quality",
      label: "Microphone quality",
      score: scoreFromSignals(46, micStrong ? 2 : 0, micWeak ? 1 : 0),
    },
  ];
}

function evaluateDimensions(segment: CategorySegment, blob: string): CategoryDimensionScore[] {
  switch (segment) {
    case "phones":
      return evaluatePhones(blob);
    case "laptops":
      return evaluateLaptops(blob);
    case "tvs":
      return evaluateTvs(blob);
    case "headphones":
      return evaluateHeadphones(blob);
  }
}

function buildStrengthLine(label: string, score: number): string {
  return clipLine(`${label} looks strong for this category (${score}/100).`);
}

function buildWeaknessLine(label: string, score: number): string {
  return clipLine(`${label} may need verification on the retailer page (${score}/100).`);
}

function emptyCategoryIntelligence(): ActivatedCategoryIntelligence {
  return {
    segment: null,
    segmentLabel: "",
    categoryScore: 0,
    categoryReasons: [],
    categoryStrengths: [],
    categoryWeaknesses: [],
    dimensions: [],
    cardLine: "",
    expandedLines: [],
  };
}

/** Activate category intelligence for one listing (metadata heuristics only). */
export function activateCategoryIntelligence(
  input: CategoryIntelligenceInput
): ActivatedCategoryIntelligence {
  const segment = detectSegment(input.product, input.searchQuery);
  if (!segment) return emptyCategoryIntelligence();

  const blob = metadataBlob(input.product, input.searchQuery);
  const dimensions = evaluateDimensions(segment, blob);
  const categoryScore = clampScore(
    dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / Math.max(1, dimensions.length)
  );
  const categoryStrengths = dimensions
    .filter((dimension) => dimension.score >= 68)
    .map((dimension) => buildStrengthLine(dimension.label, dimension.score));
  const categoryWeaknesses = dimensions
    .filter((dimension) => dimension.score <= 44)
    .map((dimension) => buildWeaknessLine(dimension.label, dimension.score));
  const reasonCandidates = [...categoryStrengths.slice(0, 2), ...categoryWeaknesses.slice(0, 1)];
  const categoryReasons = reasonCandidates.length
    ? reasonCandidates
    : [
        clipLine(
          `${segmentLabel(segment)} category score ${categoryScore}/100 — verify key specs on the listing page.`
        ),
      ];

  const cardLine = clipLine(
    categoryReasons[0] ||
      `${segmentLabel(segment)} category score ${categoryScore}/100 based on listing metadata.`
  );

  return {
    segment,
    segmentLabel: segmentLabel(segment),
    categoryScore,
    categoryReasons,
    categoryStrengths,
    categoryWeaknesses,
    dimensions,
    cardLine,
    expandedLines: categoryReasons.slice(0, 3),
  };
}

export function mergeCategoryIntelligenceExpandedSignals(
  existingLines: string[],
  categoryIntel: ActivatedCategoryIntelligence | null,
  max = 3
): string[] {
  if (!categoryIntel?.expandedLines.length) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...categoryIntel.expandedLines, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}

export function mergeCategoryIntelligenceExpandedLines(
  existingLines: string[],
  categoryIntel: ActivatedCategoryIntelligence | null,
  max = 3
): string[] {
  return mergeCategoryIntelligenceExpandedSignals(existingLines, categoryIntel, max);
}
