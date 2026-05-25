/**
 * Phase 13 — Commerce intent persistence.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function resolveCommerceIntentPersistence(args: {
  query: string;
  evolution?: CommerceEvolutionResult | null;
}): { intentLabel: string; persistence01: number } {
  const q = args.query.toLowerCase();
  const to = args.evolution?.intentTransition.toIntent ?? "neutral";
  let intentLabel = to;
  if (/\b(compare|vs|versus|which)\b/.test(q)) intentLabel = "comparison";
  if (/\b(buy|checkout|order now)\b/.test(q)) intentLabel = "commitment";
  if (/\b(research|review|best)\b/.test(q)) intentLabel = "research";
  const persistence01 = round4(args.evolution?.intentTransition.transitionStrength01 ?? 0.25);
  return { intentLabel, persistence01 };
}
