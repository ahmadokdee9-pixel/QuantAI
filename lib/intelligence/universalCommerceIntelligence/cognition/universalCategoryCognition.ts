/**
 * Phase 16 — Universal category cognition (query + tray).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { ProductCategorySlug } from "@/lib/intelligence/types";
import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const QUERY_VERTICAL: [RegExp, UniversalVerticalId][] = [
  [/\b(dress|shirt|sneaker|fashion|outfit|nike|adidas)\b/i, "fashion"],
  [/\b(luxury|designer|haute|gucci|prada|louis vuitton)\b/i, "luxury"],
  [/\b(skincare|makeup|perfume|beauty|serum|fragrance)\b/i, "beauty"],
  [/\b(sofa|chair|table|furniture|mattress|ikea|home decor)\b/i, "furniture_home"],
  [/\b(car|tire|automotive|vehicle|bmw|tesla)\b/i, "automotive"],
  [/\b(hiking|gym|sports|outdoor|camping|fitness)\b/i, "sports_outdoor"],
  [/\b(watch|rolex|omega|jewelry|ring|necklace)\b/i, "watches_jewelry"],
  [/\b(ps5|xbox|gaming|nintendo|steam deck)\b/i, "gaming"],
  [/\b(laptop|phone|iphone|macbook|gpu|electronics)\b/i, "electronics"],
];

function slugToVertical(slug: ProductCategorySlug): UniversalVerticalId {
  if (slug === "fashion") return "fashion";
  if (slug === "beauty") return "beauty";
  if (slug === "home") return "furniture_home";
  if (slug === "sports") return "sports_outdoor";
  if (slug === "electronics") return "electronics";
  if (slug === "toys") return "gaming";
  return "general";
}

export function resolveUniversalCategoryCognition(args: {
  query: string;
  products: QuantProduct[];
}): {
  dominantVertical: UniversalVerticalId;
  spread01: number;
  verticalScores: Map<UniversalVerticalId, number>;
} {
  const q = args.query.toLowerCase();
  const scores = new Map<UniversalVerticalId, number>();

  for (const [re, vid] of QUERY_VERTICAL) {
    if (re.test(q)) scores.set(vid, (scores.get(vid) ?? 0) + 0.45);
  }

  for (const p of args.products.slice(0, 24)) {
    const vid = slugToVertical((p.qiCategory ?? "general") as ProductCategorySlug);
    scores.set(vid, (scores.get(vid) ?? 0) + 0.12);
  }

  if (scores.size === 0) scores.set("general", 0.25);

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const dominantVertical = sorted[0]?.[0] ?? "general";
  const spread01 = round4(clamp01(sorted.length / 8));

  return { dominantVertical, spread01, verticalScores: scores };
}
