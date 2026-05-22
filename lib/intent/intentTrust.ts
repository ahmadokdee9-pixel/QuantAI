/**
 * P6.1 — Trust sensitivity intent (query + upstream trust signals).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type IntentTrust = {
  trustIntent: number;
  trustSensitivity: "low" | "moderate" | "high";
};

const TRUST_LEX = /\b(trusted|reliable|authentic|genuine|official|verified|safe|scam|fake)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentTrust(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  strategy: StrategyIntelligenceMeta;
  cognition: CognitionEngineMeta;
}): IntentTrust {
  const { query, canonicalQuery, strategy, cognition } = args;

  let trustIntent =
    (cognition.trustValueBalance ?? 0) * 0.35 +
    (strategy.strategicTrust ?? 0) * 0.25 +
    (cognition.marketStateFusion ?? 0) * 0.2;
  if (TRUST_LEX.test(query)) trustIntent += 0.25;
  if (canonicalQuery.intent.primary === "cheapest_trusted") trustIntent += 0.2;
  trustIntent = clamp(trustIntent, 0, 1);

  let trustSensitivity: IntentTrust["trustSensitivity"] = "moderate";
  if (trustIntent >= 0.55 || canonicalQuery.intent.primary === "cheapest_trusted") trustSensitivity = "high";
  else if (trustIntent < 0.25) trustSensitivity = "low";

  return {
    trustIntent: Math.round(trustIntent * 1000) / 1000,
    trustSensitivity,
  };
}
