/**
 * Phase 35 — Personal Taste Intelligence Engine.
 * Taste profiles with tasteScore and tasteReasons for ranking + brief enrichment.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ProductIntelligenceSegment } from "@/lib/ui/universalProductIntelligenceEngine";
import {
  computeTasteMatchScore,
  detectTastePreferences,
  type TastePreferenceProfile,
} from "@/lib/intelligence/tasteMatchEngine";

export type PersonalTasteLabel =
  | "Modern"
  | "Minimalist"
  | "Scandinavian"
  | "Luxury"
  | "Premium"
  | "Family"
  | "Cozy"
  | "Executive"
  | "Sporty"
  | "Elegant"
  | "Professional"
  | "Creative";

export type PersonalTasteProfile = {
  version: 1;
  detectedTaste: PersonalTasteLabel | "Balanced";
  tasteConfidence: number;
  activeTastes: PersonalTasteLabel[];
  preference: TastePreferenceProfile;
};

export type PersonalTasteScore = {
  tasteScore: number;
  tasteReasons: string[];
};

const TASTE_DETECT_RULES: Array<{ taste: PersonalTasteLabel; rx: RegExp; confidence: number }> = [
  { taste: "Modern", rx: /\b(modern|contemporary|sleek)\b/i, confidence: 86 },
  { taste: "Minimalist", rx: /\b(minimal|minimalist|clean lines|simple)\b/i, confidence: 85 },
  { taste: "Scandinavian", rx: /\b(scandinavian|nordic|hygge|ikea style)\b/i, confidence: 84 },
  { taste: "Luxury", rx: /\b(luxury|luxurious|designer|bespoke)\b/i, confidence: 88 },
  { taste: "Premium", rx: /\b(premium|high end|flagship|upscale)\b/i, confidence: 86 },
  { taste: "Family", rx: /\b(family|kid friendly|children|pet friendly)\b/i, confidence: 83 },
  { taste: "Cozy", rx: /\b(cozy|cosy|comfortable|soft|warm)\b/i, confidence: 82 },
  { taste: "Executive", rx: /\b(executive|boardroom|corner office)\b/i, confidence: 84 },
  { taste: "Sporty", rx: /\b(sporty|athletic|sport|active)\b/i, confidence: 82 },
  { taste: "Elegant", rx: /\b(elegant|sophisticated|refined|classy)\b/i, confidence: 85 },
  { taste: "Professional", rx: /\b(professional|office|workplace|business)\b/i, confidence: 83 },
  { taste: "Creative", rx: /\b(creative|artistic|creator|studio)\b/i, confidence: 84 },
];

const PRODUCT_TASTE_REASONS: Partial<Record<PersonalTasteLabel, RegExp>> = {
  Modern: /\b(modern|contemporary|sleek|streamlined)\b/i,
  Minimalist: /\b(minimal|minimalist|clean|simple|slim)\b/i,
  Scandinavian: /\b(scandinavian|nordic|oak|light wood)\b/i,
  Luxury: /\b(luxury|designer|leather|velvet|marble)\b/i,
  Premium: /\b(premium|pro|ultra|flagship|oled)\b/i,
  Family: /\b(family|sectional|modular|fabric|washable)\b/i,
  Cozy: /\b(cozy|cosy|soft|plush|comfortable)\b/i,
  Executive: /\b(executive|premium leather|x1 carbon|macbook pro)\b/i,
  Sporty: /\b(sporty|athletic|performance|active)\b/i,
  Elegant: /\b(elegant|sophisticated|designer|refined)\b/i,
  Professional: /\b(business|thinkpad|latitude|enterprise)\b/i,
  Creative: /\b(creator|studio|content|color accurate|video)\b/i,
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Detect personal taste profile from query. */
export function inferPersonalTasteProfile(
  query: string,
  segment: ProductIntelligenceSegment | null
): PersonalTasteProfile {
  const preference = detectTastePreferences(query, segment);
  const activeTastes: PersonalTasteLabel[] = [];

  for (const rule of TASTE_DETECT_RULES) {
    if (rule.rx.test(query)) activeTastes.push(rule.taste);
  }

  const detectedTaste = activeTastes[0] ?? "Balanced";
  const tasteConfidence =
    activeTastes.length > 0
      ? clamp(
          TASTE_DETECT_RULES.find((r) => r.taste === activeTastes[0])?.confidence ?? 72,
          0,
          100
        )
      : 55;

  return {
    version: 1,
    detectedTaste,
    tasteConfidence,
    activeTastes,
    preference,
  };
}

/** Score product taste fit with human-readable reasons. */
export function scorePersonalTaste(
  product: QuantProduct,
  taste: PersonalTasteProfile,
  searchQuery = ""
): PersonalTasteScore {
  const match = computeTasteMatchScore(product, taste.preference, searchQuery);
  const blob = `${searchQuery} ${product.title}`.toLowerCase();
  const tasteReasons: string[] = [];

  for (const label of taste.activeTastes) {
    const rx = PRODUCT_TASTE_REASONS[label];
    if (rx?.test(blob)) tasteReasons.push(`Matches ${label.toLowerCase()} style cues in listing`);
  }

  if (!tasteReasons.length && taste.detectedTaste !== "Balanced") {
    tasteReasons.push(`Neutral ${taste.detectedTaste.toLowerCase()} alignment — limited style signals in title`);
  }
  if (match.matchedDimensions.length > 0) {
    tasteReasons.push(`Style dimensions aligned: ${match.matchedDimensions.map((d) => d.replace(/_/g, " ")).join(", ")}`);
  }

  let tasteScore = match.tasteMatchScore;

  if (taste.detectedTaste === "Modern" && /\b(modern|minimalist|corner|scandinavian)\b/i.test(blob)) tasteScore += 14;
  if (taste.detectedTaste === "Luxury" && /\b(luxury|designer|leather|premium)\b/i.test(blob)) tasteScore += 18;
  if (taste.detectedTaste === "Luxury" && /\b(budget|cheap|fabric 2 seater)\b/i.test(blob)) tasteScore -= 16;
  if (taste.detectedTaste === "Family" && /\b(family|sectional|modular)\b/i.test(blob)) tasteScore += 14;

  return {
    tasteScore: clamp(tasteScore, 0, 100),
    tasteReasons: tasteReasons.slice(0, 3),
  };
}
