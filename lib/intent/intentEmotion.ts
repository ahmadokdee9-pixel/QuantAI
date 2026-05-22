/**
 * P6.1 — Emotional shopping language detection (query lexical; no personalization).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

export type IntentEmotion = {
  emotionalIntent: number;
  emotionLane: "neutral" | "excited" | "anxious";
};

const EXCITED = /\b(love|amazing|must|excited|perfect|dream|obsessed|wow)\b/i;
const ANXIOUS = /\b(worried|scam|fake|risk|afraid|unsure|help|confused|stress)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentEmotion(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
}): IntentEmotion {
  const { query, canonicalQuery } = args;

  let emotionalIntent = 0.15;
  if (EXCITED.test(query)) emotionalIntent += 0.45;
  if (ANXIOUS.test(query)) emotionalIntent += 0.4;
  if (canonicalQuery.intent.urgency01 >= 0.6) emotionalIntent += 0.15;
  emotionalIntent = clamp(emotionalIntent, 0, 1);

  let emotionLane: IntentEmotion["emotionLane"] = "neutral";
  if (ANXIOUS.test(query)) emotionLane = "anxious";
  else if (EXCITED.test(query)) emotionLane = "excited";

  return {
    emotionalIntent: Math.round(emotionalIntent * 1000) / 1000,
    emotionLane,
  };
}
