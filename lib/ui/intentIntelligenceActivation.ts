/**
 * Phase 21.0 — Intent Intelligence Activation Layer.
 * Surfaces buyer intent fit from search query + existing activation signals (presentation only).
 */

import { parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import type { ActivatedAlternativeAdvantage } from "@/lib/ui/alternativeAdvantageActivation";
import type { ActivatedBuyWait } from "@/lib/ui/buyWaitActivation";
import type { ActivatedCategoryIntelligence, CategorySegment } from "@/lib/ui/categoryIntelligenceActivation";
import type { ActivatedDiscountTruth } from "@/lib/ui/discountTruthActivation";
import type { ActivatedPriceTarget } from "@/lib/ui/priceTargetActivation";
import { getStoreTrustScore, type QuantProduct } from "@/lib/shoppingScore";

export type IntentPriority = {
  key: string;
  label: string;
  weight: number;
};

export type ActivatedIntentIntelligence = {
  intentLabel: string;
  intentPriorities: IntentPriority[];
  intentMatchScore: number;
  intentReasons: string[];
  matchExplanation: string;
  cardLine: string;
  expandedLines: string[];
};

export type IntentIntelligenceInput = {
  product: QuantProduct;
  list: QuantProduct[];
  searchQuery: string;
  isLeadProduct: boolean;
  categoryIntelligence: ActivatedCategoryIntelligence;
  discountTruth: ActivatedDiscountTruth;
  buyWait: ActivatedBuyWait;
  priceTarget: ActivatedPriceTarget;
  alternativeAdvantage: ActivatedAlternativeAdvantage;
  rankingRationaleLine?: string;
};

function clipLine(text: string | undefined | null, max = 112): string {
  if (text == null) return "";
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dimensionScore(
  categoryIntelligence: ActivatedCategoryIntelligence,
  key: string
): number | null {
  const match = categoryIntelligence.dimensions.find((dimension) => dimension.key === key);
  return match?.score ?? null;
}

function medianPeerPrice(product: QuantProduct, list: QuantProduct[]): number {
  const prices = list
    .filter((item) => item.link !== product.link && item.price > 0)
    .map((item) => item.price)
    .sort((a, b) => a - b);
  if (!prices.length) return product.price;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
}

function detectIntentPriorities(searchQuery: string, segment: CategorySegment | null): IntentPriority[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return [{ key: "general_fit", label: "Product fit", weight: 0.45 }];
  const intents = parseCommerceSearchIntents(searchQuery);
  const priorities: IntentPriority[] = [];

  if (/best camera|camera phone|photography|photo quality|pro camera/i.test(q)) {
    priorities.push({ key: "camera", label: "Best camera phone", weight: 0.92 });
  }
  if (
    intents.gaming ||
    /gaming laptop|gaming tv|game mode|120hz gaming/i.test(q) ||
    (segment === "laptops" && /\bgaming\b/i.test(q))
  ) {
    priorities.push({ key: "gaming", label: "Gaming performance", weight: 0.88 });
  }
  if (
    intents.explicitBestValue ||
    intents.budget ||
    intents.cheapestTrusted ||
    /best value|cheap|budget|affordable|lowest price/i.test(q)
  ) {
    priorities.push({ key: "value", label: "Best value", weight: 0.9 });
  }
  if (segment === "tvs" && /best value tv|value tv|affordable tv/i.test(q)) {
    priorities.push({ key: "value_tv", label: "Best value TV", weight: 0.86 });
  }
  if (/noise cancelling|noise canceling|\banc\b|quiet headphones/i.test(q)) {
    priorities.push({ key: "anc", label: "Noise cancelling headphones", weight: 0.9 });
  }
  if (intents.premium || intents.luxury || /premium|flagship|pro max|ultra\b/i.test(q)) {
    priorities.push({ key: "premium", label: "Premium pick", weight: 0.84 });
  }
  if (/premium iphone|iphone deal|iphone offer/i.test(q)) {
    priorities.push({ key: "iphone_deal", label: "Premium iPhone deal", weight: 0.9 });
  }
  if (intents.trustedOnly || intents.cheapestTrusted || /trusted seller|reputable|reliable store/i.test(q)) {
    priorities.push({ key: "trusted_seller", label: "Lowest price trusted seller", weight: 0.88 });
  }
  if (intents.dealHunter || intents.realDiscountOnly || /\bdeal\b|discount|sale|offer/i.test(q)) {
    priorities.push({ key: "deal", label: "Strong deal", weight: 0.82 });
  }
  if (intents.buyNowUrgency || /buy now|ready to buy/i.test(q)) {
    priorities.push({ key: "urgency", label: "Ready to buy", weight: 0.7 });
  }

  if (!priorities.length) {
    priorities.push({ key: "general_fit", label: "Search fit", weight: 0.5 });
  }

  const seen = new Set<string>();
  return priorities.filter((priority) => {
    if (seen.has(priority.key)) return false;
    seen.add(priority.key);
    return true;
  });
}

function scorePriority(
  priority: IntentPriority,
  input: IntentIntelligenceInput
): { score: number; reason: string | null } {
  const {
    product,
    list,
    categoryIntelligence,
    discountTruth,
    buyWait,
    priceTarget,
    alternativeAdvantage,
  } = input;
  const trust = getStoreTrustScore(product.store);
  const peerMed = medianPeerPrice(product, list);

  switch (priority.key) {
    case "camera": {
      const camera = dimensionScore(categoryIntelligence, "camera_quality");
      if (camera != null && camera >= 68) {
        return {
          score: camera,
          reason: "Matches your camera-first search — listing metadata signals strong camera specs.",
        };
      }
      return { score: camera ?? 48, reason: null };
    }
    case "gaming": {
      const gaming =
        dimensionScore(categoryIntelligence, "gaming_suitability") ??
        dimensionScore(categoryIntelligence, "gpu_suitability");
      if (gaming != null && gaming >= 65) {
        return {
          score: gaming,
          reason: "Aligns with your gaming intent — performance cues look suitable for play.",
        };
      }
      return { score: gaming ?? 46, reason: null };
    }
    case "value":
    case "value_tv": {
      let score = 52;
      if (product.price > 0 && peerMed > product.price) {
        const pct = Math.round(((peerMed - product.price) / peerMed) * 100);
        if (pct >= 4) score += Math.min(24, pct);
      }
      if (priceTarget.opportunityScore >= 45) score += 8;
      if (buyWait.verdict === "BUY NOW") score += 6;
      score = clampScore(score);
      if (score >= 62) {
        const pct =
          product.price > 0 && peerMed > product.price
            ? Math.round(((peerMed - product.price) / peerMed) * 100)
            : 0;
        return {
          score,
          reason:
            pct >= 4
              ? `Price is ${pct}% lower than comparable offers for your value-focused search.`
              : "Aligns with your value hunt — pricing looks competitive in this tray.",
        };
      }
      return { score, reason: null };
    }
    case "anc": {
      const anc = dimensionScore(categoryIntelligence, "anc_quality");
      if (anc != null && anc >= 65) {
        return {
          score: anc,
          reason: "Matches your noise-cancelling intent — ANC cues look strong on this listing.",
        };
      }
      return { score: anc ?? 50, reason: null };
    }
    case "premium":
    case "iphone_deal": {
      let score = 50;
      if (categoryIntelligence.categoryScore >= 65) score += 10;
      if (discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine") score += 12;
      if (/iphone|pro max|ultra|premium/i.test(product.title.toLowerCase())) score += 10;
      score = clampScore(score);
      if (score >= 62) {
        return {
          score,
          reason: "Fits your premium search — listing tier and discount posture look aligned.",
        };
      }
      return { score, reason: null };
    }
    case "trusted_seller": {
      let score = clampScore(trust);
      if (product.price > 0 && peerMed >= product.price) score += 6;
      if (score >= 68) {
        return {
          score,
          reason: "Better seller trust than nearby alternatives for your trusted-seller search.",
        };
      }
      return { score, reason: null };
    }
    case "deal": {
      let score = discountTruth.confidence;
      if (discountTruth.verdict === "Genuine" || discountTruth.verdict === "Likely Genuine") score += 8;
      score = clampScore(score);
      if (score >= 60) {
        return {
          score,
          reason: "Discount confidence exceeds what competing listings suggest for this search.",
        };
      }
      return { score, reason: null };
    }
    case "urgency": {
      const score = buyWait.verdict === "BUY NOW" ? clampScore(buyWait.confidence) : clampScore(buyWait.confidence - 12);
      if (buyWait.verdict === "BUY NOW") {
        return { score, reason: "Buy timing aligns with your ready-to-buy search posture." };
      }
      return { score, reason: null };
    }
    default: {
      let score = 52;
      if (input.rankingRationaleLine) score += 8;
      if (categoryIntelligence.categoryScore >= 60) score += 6;
      score = clampScore(score);
      return {
        score,
        reason:
          score >= 58
            ? "Listing signals align with the product category implied by your search."
            : null,
      };
    }
  }
}

function buildIntentLabel(priorities: IntentPriority[]): string {
  if (!priorities.length) return "Search fit";
  if (priorities.length === 1) return priorities[0]!.label;
  return clipLine(`${priorities[0]!.label} + ${priorities[1]!.label}`, 48);
}

function emptyIntentIntelligence(): ActivatedIntentIntelligence {
  return {
    intentLabel: "",
    intentPriorities: [],
    intentMatchScore: 0,
    intentReasons: [],
    matchExplanation: "",
    cardLine: "",
    expandedLines: [],
  };
}

/** Activate buyer intent fit for one listing (existing signals only). */
export function activateIntentIntelligence(input: IntentIntelligenceInput): ActivatedIntentIntelligence {
  const query = input.searchQuery.trim();
  if (!query) return emptyIntentIntelligence();

  const priorities = detectIntentPriorities(query, input.categoryIntelligence.segment);
  const scored = priorities.map((priority) => ({
    priority,
    ...scorePriority(priority, input),
  }));
  const weighted =
    scored.reduce((sum, row) => sum + row.score * row.priority.weight, 0) /
    Math.max(0.01, scored.reduce((sum, row) => sum + row.priority.weight, 0));
  const intentMatchScore = clampScore(weighted);

  const intentReasons = scored
    .map((row) => row.reason)
    .filter((reason): reason is string => Boolean(reason))
    .slice(0, 3)
    .map((reason) => clipLine(reason));

  if (
    input.isLeadProduct &&
    input.alternativeAdvantage.advantageReasons.length > 0 &&
    intentReasons.length < 3
  ) {
    intentReasons.push(
      clipLine(
        `Fits your ${buildIntentLabel(priorities).toLowerCase()} intent better than nearby alternatives.`
      )
    );
  }

  if (!intentReasons.length && intentMatchScore >= 55) {
    intentReasons.push(
      clipLine(`Search fit score ${intentMatchScore}/100 based on your query and this listing.`)
    );
  }

  const matchExplanation = clipLine(intentReasons[0] || buildIntentLabel(priorities));
  const cardLine = clipLine(`${buildIntentLabel(priorities)} · ${intentMatchScore}% fit`);

  return {
    intentLabel: buildIntentLabel(priorities),
    intentPriorities: priorities,
    intentMatchScore,
    intentReasons,
    matchExplanation,
    cardLine,
    expandedLines: intentReasons.slice(0, 3),
  };
}

export function mergeIntentIntelligenceExpandedSignals(
  existingLines: string[],
  intentIntel: ActivatedIntentIntelligence | null,
  max = 3
): string[] {
  if (!intentIntel?.expandedLines.length) return existingLines.slice(0, max);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...intentIntel.expandedLines, ...existingLines]) {
    const line = value.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out.slice(0, max);
}

export function mergeIntentIntelligenceExpandedLines(
  existingLines: string[],
  intentIntel: ActivatedIntentIntelligence | null,
  max = 3
): string[] {
  return mergeIntentIntelligenceExpandedSignals(existingLines, intentIntel, max);
}
