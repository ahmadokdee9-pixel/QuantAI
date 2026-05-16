/**
 * QuantAI market timing advisor — tray-local buy / wait / monitor / avoid posture.
 */

import type { DealTimingCategory } from "@/lib/intelligence/dealIntelligenceEngine";
import type { HumanSearchIntent } from "@/lib/intelligence/searchIntentBrain";

export type MarketTimingAction = "buy_now" | "wait" | "monitor" | "avoid";

export type MarketTimingAdvice = {
  action: MarketTimingAction;
  /** 0–1 heuristic confidence for this snapshot only. */
  confidence01: number;
  /** One short clause to append to timing copy (no leading space). */
  analystClause: string;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function adviseMarketTiming(args: {
  timingCategory: DealTimingCategory;
  waitForBetterPricing: boolean;
  goodTimeToBuy: boolean;
  suspiciousDiscountRisk: number;
  trust: number;
  human: HumanSearchIntent | null | undefined;
}): MarketTimingAdvice {
  const { timingCategory, waitForBetterPricing, goodTimeToBuy, suspiciousDiscountRisk, trust, human } = args;
  let action: MarketTimingAction = "monitor";
  let confidence01 = 0.52;
  let analystClause = "Tray snapshot only—not a price forecast.";

  if (suspiciousDiscountRisk >= 72 && trust < 62) {
    action = "avoid";
    confidence01 = 0.62;
    analystClause = "Discount story looks fragile versus seller proof—pause beats impulse.";
  } else if (waitForBetterPricing || timingCategory === "wait_favored") {
    action = "wait";
    confidence01 = clamp01(0.55 + (trust >= 70 ? 0.08 : 0));
    analystClause = "Patience is rational here unless specs are perfect and return policy is generous.";
  } else if (goodTimeToBuy && timingCategory === "strong_window" && suspiciousDiscountRisk < 48 && trust >= 60) {
    action = "buy_now";
    confidence01 = clamp01(0.58 + (trust >= 74 ? 0.12 : 0));
    analystClause = "If configuration matches, checkout timing is reasonable on this field read.";
  } else if (timingCategory === "unstable_tray") {
    action = "monitor";
    confidence01 = 0.48;
    analystClause = "Wide spread in this tray—re-scan after listings refresh before you anchor on one price.";
  } else {
    action = "monitor";
    confidence01 = 0.5;
    analystClause = "No clean timing edge—alerts plus a second search beat guessing a drop.";
  }

  if (human) {
    if (human.urgencyIntent >= 0.62 && action === "wait") {
      analystClause = "You sound time-pressed, but the numbers still favor a short pause or a wider compare.";
      confidence01 = Math.max(confidence01, 0.56);
    }
    if (human.budgetIntent >= 0.62 && human.commerce.riskAvoidance && action !== "avoid") {
      analystClause = "Budget + trust language in your search: prioritize verified seller and returns over chasing the absolute floor.";
    }
    if (human.luxuryPreference >= 0.58 && action === "buy_now") {
      analystClause = "Luxury intent: confirm authenticity, warranty, and grey-market risk—not just the headline price.";
    }
  }

  return { action, confidence01, analystClause };
}

/** Append advisor clause to base timing summary (bounded length). */
export function mergeTimingSummaryWithAdvisor(base: string, advice: MarketTimingAdvice): string {
  const merged = `${base.trim()} ${advice.analystClause}`.replace(/\s+/g, " ").trim();
  return merged.length > 360 ? `${merged.slice(0, 357)}…` : merged;
}

/** One human-strategist tail for deal “why” copy (bounded). */
export function appendWhyDealHumanTail(base: string, human: HumanSearchIntent): string {
  let tail = "";
  if (human.usageContext.includes("student")) {
    tail =
      "Student lens: warranty, weight, and classroom noise often matter more than the headline price.";
  } else if (human.luxuryPreference >= 0.58) {
    tail = "Luxury lens: authenticity and seller history should outweigh a dramatic % off claim.";
  } else if (human.hiddenBuyingGoals.includes("timing_vs_discount")) {
    tail = "You signaled timing—treat markdowns as conditional on SKU fit, returns, and who actually ships.";
  } else if (human.budgetIntent >= 0.65 && human.commerce.riskAvoidance) {
    tail = "Budget + safety cues: favor clean seller proof over chasing the absolute floor.";
  }
  if (!tail) return base;
  const merged = `${base.trim()} ${tail}`.replace(/\s+/g, " ").trim();
  return merged.length > 280 ? `${merged.slice(0, 277)}…` : merged;
}
