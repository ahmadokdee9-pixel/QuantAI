/**
 * Phase 13 — Category affinity evolution.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { QuantProduct } from "@/lib/shoppingScore";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function evolveCategoryAffinity(args: {
  sessionMemory: CommerceSessionMemoryV1;
  products: QuantProduct[];
}): { dominantCategory: string; evolution01: number } {
  const merged = { ...args.sessionMemory.categoryAffinity };
  for (const p of args.products.slice(0, 12)) {
    const c = p.qiCategory ?? "general";
    merged[c] = (merged[c] ?? 0) + 0.08;
  }
  const sorted = Object.entries(merged).sort((a, b) => b[1] - a[1]);
  const dominantCategory = sorted[0]?.[0] ?? "general";
  const evolution01 = round4(clamp01(sorted[0]?.[1] ?? 0.2));
  return { dominantCategory, evolution01 };
}
