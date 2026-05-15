/**
 * Emotional / impulse trap heuristics from listing copy + query (tray-local).
 */

import type { QuantProduct } from "@/lib/shoppingScore";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export type EmotionalBuyingSignals = {
  emotionalTrapScore: number;
  luxuryImpulseInflation: boolean;
  fakeScarcity: boolean;
  urgencyPressure: boolean;
  overhypedDiscountFraming: boolean;
};

export function detectEmotionalBuyingSignals(p: QuantProduct, searchQuery: string): EmotionalBuyingSignals {
  const q = searchQuery.toLowerCase();
  const t = `${p.title} ${p.availability ?? ""} ${p.extensions.join(" ")}`.toLowerCase();

  const luxuryImpulseInflation =
    /\b(limited edition|collector|must have|treat yourself|investment piece|iconic|heritage)\b/i.test(t) &&
    /\b(luxury|designer|premium|gold|diamond)\b/i.test(q + t);

  const fakeScarcity =
    /\b(only \d+ left|just \d+ remaining|almost gone|selling fast|limited time|while stocks last|hurry|don't miss)\b/i.test(
      t
    );

  const urgencyPressure =
    /\b(ends tonight|ends today|last day|final hours|buy now|order in the next|countdown|flash sale)\b/i.test(t);

  const overhypedDiscountFraming =
    /\b(unbelievable|insane deal|never again|crazy price|lowest ever|too good|once in a lifetime)\b/i.test(t);

  let score = 0.12;
  if (luxuryImpulseInflation) score += 0.22;
  if (fakeScarcity) score += 0.28;
  if (urgencyPressure) score += 0.24;
  if (overhypedDiscountFraming) score += 0.2;
  if (/\b(impulse|gift rush|panic buy)\b/i.test(q)) score += 0.1;

  return {
    emotionalTrapScore: clamp01(score),
    luxuryImpulseInflation,
    fakeScarcity,
    urgencyPressure,
    overhypedDiscountFraming,
  };
}
