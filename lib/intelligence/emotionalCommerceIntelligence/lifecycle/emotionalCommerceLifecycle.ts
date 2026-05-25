/**
 * Phase 17 — Emotional commerce lifecycle.
 */

import type { UniversalCommerceIntelligenceResult } from "@/lib/intelligence/universalCommerceIntelligence/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveEmotionalCommerceLifecycle(args: {
  query: string;
  universalCommerce?: UniversalCommerceIntelligenceResult | null;
  continuity01: number;
}): { phase: string; continuity01: number } {
  const q = args.query.toLowerCase();
  let phase = args.universalCommerce?.lifecycle.phase ?? "discovery";
  if (/\b(buy|checkout|order)\b/.test(q)) phase = "commitment";
  if (/\b(compare|vs|which)\b/.test(q)) phase = "evaluation";
  if (/\b(inspire|ideas|browse)\b/.test(q)) phase = "inspiration";
  return { phase, continuity01: round4(args.continuity01) };
}
