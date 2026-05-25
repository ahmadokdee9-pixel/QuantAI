/**
 * Phase 18 — Category intelligence evolution.
 */

import type { UniversalCommerceIntelligenceResult } from "@/lib/intelligence/universalCommerceIntelligence/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolveCategoryIntelligence(args: {
  query: string;
  universalCommerce?: UniversalCommerceIntelligenceResult | null;
}): { vertical: string; evolution01: number } {
  const vertical = args.universalCommerce?.meta.dominantVertical ?? "general";
  const spread = args.universalCommerce?.categoryCognition.spread01 ?? 0.3;
  let evolution01 = round4(Math.min(0.1, spread * 0.25));
  if (/\b(fashion|beauty|furniture|watch|auto|sport)\b/.test(args.query.toLowerCase())) {
    evolution01 = round4(Math.min(0.1, evolution01 + 0.03));
  }
  return { vertical, evolution01 };
}
