/**
 * P6.2 — Aesthetics objective signal.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";

export type AestheticObjective = {
  aestheticObjective: number;
  tasteAlignment: number;
};

const AESTHETIC_LEX = /\b(stylish|elegant|beautiful|design|aesthetic|minimal|luxury|premium look)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateAestheticObjective(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  intent: IntentCognitionMeta;
}): AestheticObjective {
  const { query, canonicalQuery, intent } = args;
  let aestheticObjective = intent.aestheticIntent ?? 0;
  if (AESTHETIC_LEX.test(query)) aestheticObjective += 0.2;
  if (canonicalQuery.intent.primary === "premium") aestheticObjective += 0.15;
  aestheticObjective = clamp(aestheticObjective, 0, 1);

  const tasteAlignment = clamp((intent.emotionalIntent ?? 0) * 0.3 + aestheticObjective * 0.7, 0, 1);

  return {
    aestheticObjective: Math.round(aestheticObjective * 1000) / 1000,
    tasteAlignment: Math.round(tasteAlignment * 1000) / 1000,
  };
}
