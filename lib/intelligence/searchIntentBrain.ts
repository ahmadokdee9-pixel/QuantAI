/**
 * QuantAI adaptive search intent brain — human shopping posture from query text.
 */

import { buildHumanIntentProfile, type HumanIntentProfile } from "@/lib/intelligence/humanIntentEngine";
import {
  buildQueryUnderstanding,
  type QueryUnderstanding,
} from "@/lib/intelligence/queryUnderstanding";
import { detectShoppingPersonas, type ShoppingPersonaProfile } from "@/lib/intelligence/shoppingPersonas";
import {
  intentMatchEnvelope,
  parseCommerceSearchIntents,
  type CommerceSearchIntents,
} from "@/lib/intelligence/searchIntentV2";
import {
  parseSemanticCommerceQuery,
  type SemanticCommerceQueryBrain,
} from "@/lib/intelligence/semanticQueryBrain";

export type AestheticDirection = "minimal" | "premium_look" | "bold" | "neutral";

export type HumanSearchIntent = {
  /** NL / budget / brand / geo structure from the raw ask. */
  semantic: SemanticCommerceQueryBrain;
  queryUnderstanding: QueryUnderstanding;
  commerce: CommerceSearchIntents;
  profile: HumanIntentProfile;
  personas: ShoppingPersonaProfile;
  budgetIntent: number;
  urgencyIntent: number;
  emotionalIntent: number;
  luxuryPreference: number;
  aestheticDirection: AestheticDirection;
  usageContext: string[];
  /** -1 value-first … +1 premium-first */
  premiumVsCheapMindset: number;
  hiddenBuyingGoals: string[];
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function detectBudgetIntent(envelope: string, intents: CommerceSearchIntents): number {
  let v = intents.budget ? 0.52 : 0.12;
  if (intents.cheapestTrusted) v += 0.18;
  if (intents.explicitBestValue) v += 0.12;
  if (/\b(cheap|budget|affordable|lowest|under\s+\$|save money|student\s+deal)\b/i.test(envelope)) v += 0.14;
  return clamp01(v);
}

export function detectUrgencyIntent(envelope: string, intents: CommerceSearchIntents): number {
  let v = intents.buyNowUrgency ? 0.55 : 0.12;
  if (/\b(right now|today|tonight|asap|before|last minute|need it)\b/i.test(envelope)) v += 0.22;
  if (intents.giftUse && /\b(arrives?|ship|delivery)\b/i.test(envelope)) v += 0.1;
  return clamp01(v);
}

export function detectEmotionalIntent(envelope: string, intents: CommerceSearchIntents): number {
  let v = 0.18;
  if (/\b(treat myself|deserve|splurge|feel good|reward)\b/i.test(envelope)) v += 0.42;
  if (intents.giftUse) v += 0.28;
  if (/\b(hype|viral|trending|fomo)\b/i.test(envelope)) v += 0.22;
  if (intents.dealHunter && intents.buyNowUrgency) v += 0.12;
  return clamp01(v);
}

export function detectLuxuryPreference(envelope: string, intents: CommerceSearchIntents): number {
  let v = intents.luxury || intents.quietLuxury ? 0.45 : 0.1;
  if (intents.premium) v += 0.22;
  if (/\b(looks?\s+premium|expensive look|quiet luxury|statement)\b/i.test(envelope)) v += 0.2;
  const luxTags = intents.taste.tagStrength.luxury ?? 0;
  const ql = intents.taste.tagStrength.quiet_luxury ?? 0;
  v += (luxTags + ql) * 0.18;
  return clamp01(v);
}

export function detectAestheticDirection(envelope: string, intents: CommerceSearchIntents): AestheticDirection {
  if (intents.minimalistStyle || /\b(minimal|clean desk|scandi|monochrome|uncluttered)\b/i.test(envelope)) {
    return "minimal";
  }
  if (intents.aestheticPremium || /\b(premium look|looks premium|designer vibe|quiet luxury)\b/i.test(envelope)) {
    return "premium_look";
  }
  if (/\b(bold|colorful|rgb|gamer aesthetic|maximal)\b/i.test(envelope)) return "bold";
  return "neutral";
}

export function detectUsageContext(envelope: string, intents: CommerceSearchIntents): string[] {
  const ctx: string[] = [];
  if (intents.gaming || /\b(gaming|gamer|rtx|esports)\b/i.test(envelope)) ctx.push("gaming");
  if (intents.productivity || /\b(work|office|wfh|business)\b/i.test(envelope)) ctx.push("work");
  if (intents.schoolUse || /\b(student|uni|university|college)\b/i.test(envelope)) ctx.push("student");
  if (intents.portableLight || /\b(travel|commute|flight|carry-on|portable)\b/i.test(envelope)) ctx.push("travel");
  if (intents.lifestyleCreator || /\b(creator|stream|youtube|podcast)\b/i.test(envelope)) ctx.push("creator");
  if (/\b(home|kitchen|living room)\b/i.test(envelope)) ctx.push("home");
  return ctx.slice(0, 6);
}

function hiddenGoalsFromCommerce(intents: CommerceSearchIntents, envelope: string): string[] {
  const g: string[] = [];
  if (intents.trustedOnly || intents.cheapestTrusted) g.push("trust_floor");
  if (intents.realDiscountOnly) g.push("authentic_discount");
  if (intents.comparisonIntent) g.push("compare_skus");
  if (intents.alternativeSeeking || intents.substituteSemanticActive) g.push("substitute_seek");
  if (/\bworth\s+it\b/i.test(envelope)) g.push("value_proof");
  return g;
}

function premiumVsCheap(intents: CommerceSearchIntents, luxury: number, budget: number): number {
  let v = 0;
  if (intents.premium || intents.luxury) v += 0.55;
  if (intents.budget || intents.dealHunter) v -= 0.45;
  v += luxury * 0.35;
  v -= budget * 0.35;
  return Math.min(1, Math.max(-1, v));
}

/** Full human intent snapshot for ranking + analyst voice (pure, tray-agnostic). */
export function extractHumanSearchIntent(rawQuery: string): HumanSearchIntent {
  const qu = buildQueryUnderstanding(rawQuery);
  const base = qu.rewritten.trim() || rawQuery.trim();
  const envelope = intentMatchEnvelope(base);
  const commerce = parseCommerceSearchIntents(base);
  const profile = buildHumanIntentProfile(base, commerce);
  const personas = detectShoppingPersonas(base, commerce);
  const budgetIntent = detectBudgetIntent(envelope, commerce);
  const urgencyIntent = detectUrgencyIntent(envelope, commerce);
  const emotionalIntent = detectEmotionalIntent(envelope, commerce);
  const luxuryPreference = detectLuxuryPreference(envelope, commerce);
  const aestheticDirection = detectAestheticDirection(envelope, commerce);
  const usageContext = detectUsageContext(envelope, commerce);
  const premiumVsCheapMindset = premiumVsCheap(commerce, luxuryPreference, budgetIntent);
  const hiddenBuyingGoals = [
    ...qu.missingContextInferences,
    ...goalsFromInferredCategories(qu.inferredCategories),
    ...hiddenGoalsFromCommerce(commerce, envelope),
  ].filter((x, i, a) => a.indexOf(x) === i);
  const semantic = parseSemanticCommerceQuery(base);

  return {
    semantic,
    queryUnderstanding: qu,
    commerce,
    profile,
    personas,
    budgetIntent,
    urgencyIntent,
    emotionalIntent,
    luxuryPreference,
    aestheticDirection,
    usageContext,
    premiumVsCheapMindset,
    hiddenBuyingGoals,
  };
}

function goalsFromInferredCategories(cats: string[]): string[] {
  const m: string[] = [];
  for (const c of cats) {
    if (c === "desk_workspace" || c === "minimal_workspace") m.push("curated_workspace");
    if (c === "phone_deal_window") m.push("deal_timing");
    if (c === "footwear") m.push("fit_and_returns");
  }
  return m;
}

/** Compact suffix for analyst line (query strategist voice). */
export function analystQueryStrategistSuffix(h: HumanSearchIntent | null | undefined): string {
  if (!h) return "";
  const parts: string[] = [];
  if (h.budgetIntent >= 0.62 && h.commerce.riskAvoidance) parts.push("budget-first but safety-conscious");
  else if (h.budgetIntent >= 0.68) parts.push("value-first");
  if (h.luxuryPreference >= 0.58) parts.push("premium taste");
  if (h.usageContext.includes("student") && h.usageContext.includes("gaming")) parts.push("student + gaming workload");
  if (h.usageContext.includes("travel") && h.commerce.portableLight) parts.push("portability priority");
  if (h.semantic.geoFocus === "nl") parts.push("Netherlands-aware scan");
  else if (h.semantic.geoFocus === "us") parts.push("US shelf bias");
  if (h.semantic.brandsDetected.length && parts.length < 2) {
    parts.push(`${h.semantic.brandsDetected.slice(0, 2).join(" + ")} anchor`);
  }
  if (h.hiddenBuyingGoals.includes("timing_vs_discount")) parts.push("timing question in the query");
  if (parts.length === 0) return "";
  const core = parts.slice(0, 2).join(", ");
  return ` — Reading your ask (${core}).`;
}

export function humanSearchIntentFingerprint(h: HumanSearchIntent | null | undefined): string {
  if (!h) return "";
  return [
    h.semantic.intentSignature,
    h.budgetIntent.toFixed(2),
    h.urgencyIntent.toFixed(2),
    h.luxuryPreference.toFixed(2),
    h.aestheticDirection,
    h.usageContext.join("+"),
    h.premiumVsCheapMindset.toFixed(2),
    h.personas.ranked.slice(0, 3).join(","),
  ].join("|");
}
