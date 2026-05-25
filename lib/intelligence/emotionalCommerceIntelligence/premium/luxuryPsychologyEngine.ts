/**
 * Phase 17 — Luxury psychology engine.
 */

import type { UniversalCommerceIntelligenceResult } from "@/lib/intelligence/universalCommerceIntelligence/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function modelLuxuryPsychology(args: {
  query: string;
  universalCommerce?: UniversalCommerceIntelligenceResult | null;
}): { aspiration01: number; status01: number } {
  const q = args.query.toLowerCase();
  let aspiration01 = 0.3;
  let status01 = 0.25;
  if (/\b(luxury|designer|rolex|gucci|status)\b/.test(q)) {
    aspiration01 += 0.4;
    status01 += 0.35;
  }
  if (
    args.universalCommerce?.meta.dominantVertical === "luxury" ||
    args.universalCommerce?.meta.dominantVertical === "watches_jewelry"
  ) {
    aspiration01 += 0.15;
    status01 += 0.1;
  }
  return { aspiration01: round4(Math.min(1, aspiration01)), status01: round4(Math.min(1, status01)) };
}
