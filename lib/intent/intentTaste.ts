/**
 * P6.1 — Aesthetic/taste intent (category + query lexical; no user taste memory).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

export type IntentTaste = {
  aestheticIntent: number;
  tasteLane: "functional" | "aesthetic" | "luxury-aesthetic";
};

const AESTHETIC = /\b(style|design|aesthetic|look|beautiful|elegant|minimal|luxury|premium feel|fragrance|scent|perfume)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentTaste(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
}): IntentTaste {
  const { query, canonicalQuery } = args;

  let aestheticIntent = canonicalQuery.intent.premium01 * 0.35;
  if (AESTHETIC.test(query)) aestheticIntent += 0.45;
  if (canonicalQuery.category === "beauty" || canonicalQuery.category === "fashion") aestheticIntent += 0.2;
  if (canonicalQuery.intent.primary === "premium") aestheticIntent += 0.15;
  aestheticIntent = clamp(aestheticIntent, 0, 1);

  let tasteLane: IntentTaste["tasteLane"] = "functional";
  if (aestheticIntent >= 0.6 && canonicalQuery.intent.premium01 >= 0.5) tasteLane = "luxury-aesthetic";
  else if (aestheticIntent >= 0.4) tasteLane = "aesthetic";

  return {
    aestheticIntent: Math.round(aestheticIntent * 1000) / 1000,
    tasteLane,
  };
}
