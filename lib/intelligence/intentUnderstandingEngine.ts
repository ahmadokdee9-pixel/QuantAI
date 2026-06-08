/**
 * Phase 33 — Intent Understanding Engine.
 * Query → intentProfile → retrieval/ranking strategy hints.
 */

import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { ProductIntelligenceSegment } from "@/lib/ui/universalProductIntelligenceEngine";

export type IntentProfileAxis =
  | "budget"
  | "quality"
  | "premium"
  | "performance"
  | "value"
  | "family"
  | "business"
  | "gaming"
  | "ecosystem"
  | "durability";

export type IntentProfile = Record<IntentProfileAxis, number> & {
  version: 1;
  dominantAxes: IntentProfileAxis[];
  queryExpansion: string[];
  retrievalStrategy: "value_first" | "quality_first" | "premium_first" | "balanced";
  rankingStrategy: "opportunity" | "spec_match" | "trust_safe" | "balanced";
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function axis(value: boolean, strong = 72, mild = 48): number {
  return value ? strong : mild;
}

function listingBlob(product: QuantProduct, query = ""): string {
  return `${query} ${product.title} ${(product.extensions ?? []).join(" ")}`.toLowerCase();
}

/** Detect intent profile from search query before retrieval/ranking. */
export function detectIntentProfile(query: string): IntentProfile {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();
  const intents = parseCommerceSearchIntents(query);

  const budget =
    /\b(cheap|budget|affordable|under\s+\$?\d|lowest\s+price|goedkoop|goedkope)\b/.test(q) ||
    intents.budget
      ? 82
      : intents.premium || intents.luxury
        ? 22
        : 45;

  const premium =
    /\b(luxury|premium|flagship|pro\s+max|ultra|high[- ]end|designer)\b/.test(q) ||
    intents.premium ||
    intents.luxury
      ? 84
      : intents.budget
        ? 18
        : 40;

  const value =
    /\b(best\s+value|value\s+for\s+money|price[- ]?to[- ]?performance|bang\s+for\s+buck)\b/.test(q) ||
    intents.explicitBestValue
      ? 88
      : intents.dealHunter
        ? 72
        : 46;

  const performance =
    /\b(gaming|performance|fast|powerful|fps|workstation|creator)\b/.test(q) ||
    intents.gaming ||
    intents.lifestyleCreator
      ? 80
      : 42;

  const gaming = /\b(gaming|fps|rtx|geforce|playstation|xbox|steam\s+deck)\b/.test(q) || intents.gaming ? 86 : 28;

  const family =
    /\b(family|kids|living\s+room|sectional|durable|pet[- ]friendly|hoekbank|bank)\b/.test(q) ? 78 : 32;

  const business =
    /\b(business|office|work\s+laptop|productivity|professional|enterprise)\b/.test(q) ||
    intents.productivity
      ? 76
      : 34;

  const ecosystem =
    /\b(iphone|macbook|apple|galaxy\s+ecosystem|pixel|airpods|homekit)\b/.test(q) ? 74 : 30;

  const durability =
    /\b(durable|long[- ]lasting|hardwearing|leather|solid\s+wood|warranty|refurbished)\b/.test(q) ||
    intents.qualitySeeking
      ? 76
      : 38;

  const quality =
    /\b(best|top|leading|excellent|high\s+quality|review|rated)\b/.test(q) ||
    intents.qualitySeeking
      ? 72
      : 44;

  const profile: IntentProfile = {
    version: 1,
    budget: clamp(budget, 0, 100),
    quality: clamp(quality, 0, 100),
    premium: clamp(premium, 0, 100),
    performance: clamp(performance, 0, 100),
    value: clamp(value, 0, 100),
    family: clamp(family, 0, 100),
    business: clamp(business, 0, 100),
    gaming: clamp(gaming, 0, 100),
    ecosystem: clamp(ecosystem, 0, 100),
    durability: clamp(durability, 0, 100),
    dominantAxes: [],
    queryExpansion: [],
    retrievalStrategy: "balanced",
    rankingStrategy: "balanced",
  };

  profile.dominantAxes = (
    [
      "budget",
      "quality",
      "premium",
      "performance",
      "value",
      "family",
      "business",
      "gaming",
      "ecosystem",
      "durability",
    ] as IntentProfileAxis[]
  )
    .map((key) => ({ key, score: profile[key] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.key);

  profile.queryExpansion = buildQueryExpansion(query, profile);
  profile.retrievalStrategy = resolveRetrievalStrategy(profile);
  profile.rankingStrategy = resolveRankingStrategy(profile);

  return profile;
}

function buildQueryExpansion(query: string, profile: IntentProfile): string[] {
  const expansions: string[] = [];
  const q = query.trim();
  if (!q) return expansions;

  if (profile.budget >= 70) expansions.push(`${q} affordable`, `${q} best price`);
  if (profile.premium >= 70) expansions.push(`${q} premium`, `${q} flagship`);
  if (profile.value >= 70) expansions.push(`${q} best value`, `${q} deal`);
  if (profile.gaming >= 70) expansions.push(`${q} gaming`, `${q} high performance`);
  if (profile.family >= 70) expansions.push(`${q} family`, `${q} durable`);
  if (profile.business >= 70) expansions.push(`${q} business`, `${q} productivity`);
  if (profile.ecosystem >= 70) expansions.push(`${q} ecosystem`, `${q} compatible`);
  if (profile.durability >= 70) expansions.push(`${q} durable`, `${q} long lasting`);

  return [...new Set(expansions)].slice(0, 6);
}

function resolveRetrievalStrategy(profile: IntentProfile): IntentProfile["retrievalStrategy"] {
  if (profile.value >= 72 || profile.budget >= 72) return "value_first";
  if (profile.premium >= 72) return "premium_first";
  if (profile.quality >= 68 || profile.performance >= 68) return "quality_first";
  return "balanced";
}

function resolveRankingStrategy(profile: IntentProfile): IntentProfile["rankingStrategy"] {
  if (profile.value >= 72 || profile.budget >= 68) return "opportunity";
  if (profile.gaming >= 72 || profile.performance >= 72) return "spec_match";
  if (profile.business >= 68) return "trust_safe";
  return "balanced";
}

/** Intent-aware ranking boost for a product inside a tray (-12..+18). */
export function intentRankingBoost(
  profile: IntentProfile,
  product: QuantProduct,
  segment: ProductIntelligenceSegment | null,
  searchQuery: string
): number {
  const blob = listingBlob(product, searchQuery);
  let boost = 0;

  if (profile.budget >= 70) {
    const med = product.price;
    if (med > 0 && med < 600) boost += 6;
    if (/\b(refurb|renewed|open box)\b/i.test(blob) && profile.budget >= 78) boost += 4;
  }

  if (profile.premium >= 70) {
    if (/\b(pro|ultra|premium|flagship|designer|leather)\b/i.test(blob)) boost += 8;
    if (/\b(base|entry|budget)\b/i.test(blob)) boost -= 6;
  }

  if (profile.value >= 70 && product.oldPrice != null && product.oldPrice > product.price) boost += 5;

  if (profile.gaming >= 70 && /\b(rtx|gaming|144hz|165hz|geforce|amd rx)\b/i.test(blob)) boost += 9;

  if (profile.family >= 70 && segment === "sofas") {
    if (/\b(sectional|corner|modular|fabric|pet)\b/i.test(blob)) boost += 7;
  }

  if (profile.business >= 70 && segment === "laptops") {
    if (/\b(thinkpad|latitude|probook|business|16gb|32gb)\b/i.test(blob)) boost += 6;
  }

  if (profile.ecosystem >= 70 && /\b(iphone|macbook|airpods|apple watch|ios)\b/i.test(blob)) boost += 7;

  if (profile.durability >= 70 && /\b(leather|solid|warranty|5\s*year|10\s*year)\b/i.test(blob)) boost += 5;

  return clamp(boost, -12, 18);
}

/** Score intent detection accuracy against expected dominant axes (validation helper). */
export function intentDetectionMatches(
  profile: IntentProfile,
  expectedAxes: IntentProfileAxis[]
): boolean {
  return expectedAxes.some((axis) => profile.dominantAxes.includes(axis));
}
