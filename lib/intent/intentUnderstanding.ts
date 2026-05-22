/**
 * P6.1 — Hidden buying intent + exploration vs purchase mode (query-derived).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";

export type IntentUnderstanding = {
  hiddenBuyingIntent: number;
  explorationIntent: number;
  purchaseMode: "explore" | "evaluate" | "purchase";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentUnderstanding(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  cognition: CognitionEngineMeta;
}): IntentUnderstanding {
  const { query, canonicalQuery, cognition } = args;
  const q = query.toLowerCase();

  let purchaseSignals = 0;
  if (/\b(buy|order|checkout|purchase|now|today)\b/.test(q)) purchaseSignals += 0.35;
  if (canonicalQuery.intent.urgency01 >= 0.5) purchaseSignals += 0.25;
  if (cognition.conversionProbability >= 0.45) purchaseSignals += 0.2;

  let exploreSignals = 0;
  if (/\b(ideas|options|browse|explore|discover|what|best)\b/.test(q)) exploreSignals += 0.3;
  if (canonicalQuery.marketMode === "broad_discovery") exploreSignals += 0.35;
  if (canonicalQuery.intent.primary === "general_search") exploreSignals += 0.2;

  const hiddenBuyingIntent = clamp(
    purchaseSignals * 0.5 + cognition.behavioralReadinessFusion * 0.3 + cognition.conversionProbability * 0.2,
    0,
    1
  );
  const explorationIntent = clamp(exploreSignals * 0.55 + (1 - hiddenBuyingIntent) * 0.25, 0, 1);

  let purchaseMode: IntentUnderstanding["purchaseMode"] = "evaluate";
  if (explorationIntent >= 0.55 && hiddenBuyingIntent < 0.4) purchaseMode = "explore";
  else if (hiddenBuyingIntent >= 0.55) purchaseMode = "purchase";

  return {
    hiddenBuyingIntent: Math.round(hiddenBuyingIntent * 1000) / 1000,
    explorationIntent: Math.round(explorationIntent * 1000) / 1000,
    purchaseMode,
  };
}
