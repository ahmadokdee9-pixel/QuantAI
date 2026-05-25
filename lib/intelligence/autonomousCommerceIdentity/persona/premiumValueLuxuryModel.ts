/**
 * Phase 13 — Premium / value / luxury identity modeling.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function modelPremiumValueLuxury(args: {
  query: string;
  sessionMemory: CommerceSessionMemoryV1;
  memory?: CommerceMemoryResult | null;
}): { band: "value" | "balanced" | "premium" | "luxury"; score01: number } {
  const q = args.query.toLowerCase();
  const premium = args.memory?.canonicalTaste?.premiumIntent.premiumPreference01 ?? 0.35;
  const deal = args.memory?.canonicalTaste?.pricingBehavior.dealSeeking01 ?? 0.4;
  let score01 = round4(clamp01(premium - deal * 0.35));
  if (/\b(luxury|designer|haute|premium|flagship)\b/.test(q)) score01 = round4(clamp01(score01 + 0.3));
  if (/\b(budget|cheap|deal|value)\b/.test(q)) score01 = round4(clamp01(score01 - 0.25));

  const band: "value" | "balanced" | "premium" | "luxury" =
    score01 > 0.62 ? "luxury" : score01 > 0.42 ? "premium" : score01 < 0.22 ? "value" : "balanced";
  return { band, score01 };
}
