/**
 * Phase 17 — Premium attraction reasoning.
 */

import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function reasonPremiumAttraction(args: {
  query: string;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
}): { attraction01: number; label: string } {
  const q = args.query.toLowerCase();
  let attraction01 = args.commerceStrategy?.premiumValue.premiumBias01 ?? 0.35;
  if (/\b(premium|luxury|best quality|flagship)\b/.test(q)) attraction01 += 0.3;
  if (/\b(cheap|budget|deal only)\b/.test(q)) attraction01 -= 0.25;
  attraction01 = round4(Math.min(1, Math.max(0, attraction01)));
  const label = attraction01 > 0.55 ? "premium_draw" : attraction01 < 0.28 ? "value_draw" : "neutral_draw";
  return { attraction01, label };
}
