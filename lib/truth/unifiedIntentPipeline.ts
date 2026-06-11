/**
 * Phase 3B — Unified search intent pipeline.
 * Canonical merge of Phase 2A intent engine + searchIntentV2 commerce flags + purchase intent.
 */

import {
  parseCommerceSearchIntents,
  type CommerceSearchIntents,
} from "@/lib/intelligence/searchIntentV2";
import {
  buildIntentIntelligenceEngine,
  type IntentEngineSnapshot,
} from "@/lib/truth/intentIntelligenceEngine";

export type PurchaseIntent = "neutral" | "budget" | "premium" | "value" | "fast";

export type UnifiedSearchIntent = {
  query: string;
  intentEngine: IntentEngineSnapshot | null;
  commerceIntents: CommerceSearchIntents;
  purchaseIntent: PurchaseIntent;
  mergedFrom: ("2A" | "searchIntentV2")[];
};

function enrichCommerceIntentsFrom2A(
  commerce: CommerceSearchIntents,
  intentEngine: IntentEngineSnapshot
): CommerceSearchIntents {
  const intent = intentEngine.intent;
  const enriched: CommerceSearchIntents = { ...commerce, taste: { ...commerce.taste }, alternativeQuery: { ...commerce.alternativeQuery } };

  if (intent.budget != null) {
    enriched.budget = true;
    enriched.cheapestTrusted = true;
  }
  if (intent.qualityLevel === "budget") {
    enriched.budget = true;
  }
  if (intent.useCase === "gaming") {
    enriched.gaming = true;
  }
  if (
    intent.qualityLevel === "premium" ||
    intent.qualityLevel === "best" ||
    intent.qualityLevel === "professional" ||
    intent.qualityLevel === "powerful"
  ) {
    enriched.premium = enriched.premium || intent.qualityLevel === "premium";
    if (intent.qualityLevel === "best" || intent.qualityLevel === "professional") {
      enriched.qualitySeeking = true;
    }
  }
  if (intent.useCase === "productivity" || intent.useCase === "student") {
    enriched.productivity = true;
  }
  if (intent.useCase === "student") {
    enriched.schoolUse = true;
  }
  if (intent.useCase === "gift") {
    enriched.giftUse = true;
  }
  if (intent.useCase === "travel") {
    enriched.portableLight = true;
  }
  if (intent.urgency === "high") {
    enriched.buyNowUrgency = true;
    enriched.deliveryCare = true;
  }

  return enriched;
}

/** Map merged commerce flags + query text to purchase posture (legacy rank behavior preserved). */
export function derivePurchaseIntent(query: string, intents: CommerceSearchIntents): PurchaseIntent {
  const s = query.toLowerCase();
  if (
    intents.deliveryCare ||
    /\b(fast\s+shipping|overnight|next\s+day|two.day|2.day|quick\s+delivery|arrive\s+fast)\b/.test(s)
  ) {
    return "fast";
  }
  if (
    intents.budget ||
    intents.dealHunter ||
    intents.realDiscountOnly ||
    /\b(cheap|budget|affordable|lowest|under\s+(\$|€|£|eur|gbp|usd)|save\s+money|discount|clearance|bargain)\b/.test(
      s
    )
  ) {
    return "budget";
  }
  if (
    intents.premium ||
    intents.luxury ||
    intents.aestheticPremium ||
    intents.quietLuxury ||
    /\b(premium|luxury|flagship|best\s+quality|pro\s+model|top\s+tier|high.end)\b/.test(s)
  ) {
    return "premium";
  }
  if (
    /\b(best\s+value|bang\s+for|worth\s+it|value\s+pick|price.to.quality)\b/.test(s) ||
    intents.productivity ||
    intents.gaming ||
    intents.explicitBestValue ||
    intents.longTermValue ||
    intents.comfortSeeking ||
    intents.schoolUse ||
    intents.giftUse ||
    intents.alternativeSeeking ||
    intents.comparisonIntent ||
    intents.qualitySeeking
  ) {
    return "value";
  }
  return "neutral";
}

/** Backward-compatible helper — resolves unified intent then returns purchase posture. */
export function purchaseIntentFromQuery(q: string): PurchaseIntent {
  return resolveUnifiedSearchIntent(q).purchaseIntent;
}

/** Single canonical intent resolution for ranking and truth prefetch. */
export function resolveUnifiedSearchIntent(rawQuery: string): UnifiedSearchIntent {
  const query = rawQuery.trim();
  if (!query) {
    return {
      query: "",
      intentEngine: null,
      commerceIntents: parseCommerceSearchIntents(""),
      purchaseIntent: "neutral",
      mergedFrom: [],
    };
  }

  const intentEngine = buildIntentIntelligenceEngine(query);
  const baseCommerce = parseCommerceSearchIntents(query);
  const commerceIntents = enrichCommerceIntentsFrom2A(baseCommerce, intentEngine);
  const purchaseIntent = derivePurchaseIntent(query, commerceIntents);

  return {
    query,
    intentEngine,
    commerceIntents,
    purchaseIntent,
    mergedFrom: ["2A", "searchIntentV2"],
  };
}
