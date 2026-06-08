/**
 * Phase 34 — Buyer Identity Engine.
 * Infers buyer persona and trait confidence from natural-language queries.
 */

import { detectIntentProfile } from "@/lib/intelligence/intentUnderstandingEngine";

export type BuyerIdentityTrait =
  | "power_user"
  | "developer"
  | "performance_focused"
  | "budget_conscious"
  | "space_constrained"
  | "value_focused"
  | "premium_buyer"
  | "design_focused"
  | "aesthetics_focused"
  | "camera_focused"
  | "content_creator"
  | "business_buyer"
  | "student"
  | "family_buyer"
  | "reliability_focused"
  | "balanced";

export type BuyerRankingWeights = {
  marketOpportunity: number;
  categoryQuality: number;
  buyerIdentity: number;
  tasteMatch: number;
  merchantTrust: number;
};

export type BuyerIdentityProfile = {
  version: 1;
  primaryIdentity: BuyerIdentityTrait;
  traits: Partial<Record<BuyerIdentityTrait, number>>;
  dominantTraits: BuyerIdentityTrait[];
  confidence: number;
  rankingWeights: BuyerRankingWeights;
  personalityMode: "balanced" | "premium" | "value" | "productivity" | "performance";
};

type TraitRule = { trait: BuyerIdentityTrait; rx: RegExp; weight: number };

const TRAIT_RULES: TraitRule[] = [
  { trait: "developer", rx: /\b(ai development|machine learning|coding|developer|programming|software dev)\b/i, weight: 1.3 },
  { trait: "power_user", rx: /\b(power user|pro user|heavy use|workstation|professional use)\b/i, weight: 1.2 },
  { trait: "performance_focused", rx: /\b(performance|high performance|fast|powerful|fps|benchmark)\b/i, weight: 1.15 },
  { trait: "budget_conscious", rx: /\b(cheap|budget|affordable|under \$?\d|lowest price|goedkoop)\b/i, weight: 1.25 },
  { trait: "space_constrained", rx: /\b(small apartment|compact|small space|studio flat|tight space|apartment)\b/i, weight: 1.2 },
  { trait: "value_focused", rx: /\b(best value|value for money|bang for buck|price to performance)\b/i, weight: 1.2 },
  { trait: "premium_buyer", rx: /\b(luxury|premium|flagship|high end|designer|upscale)\b/i, weight: 1.25 },
  { trait: "design_focused", rx: /\b(design|designer|aesthetic|styled|interior)\b/i, weight: 1.1 },
  { trait: "aesthetics_focused", rx: /\b(aesthetic|beautiful|stylish|modern look|elegant look)\b/i, weight: 1.1 },
  { trait: "camera_focused", rx: /\b(for photos|photography|camera|vlog|video creator)\b/i, weight: 1.25 },
  { trait: "content_creator", rx: /\b(content creator|creator|youtube|streaming|influencer|filmmaker)\b/i, weight: 1.2 },
  { trait: "business_buyer", rx: /\b(for work|business|office|productivity|enterprise|professional)\b/i, weight: 1.15 },
  { trait: "student", rx: /\b(student|school|college|university|study)\b/i, weight: 1.2 },
  { trait: "family_buyer", rx: /\b(family|kids|children|parent|pet friendly)\b/i, weight: 1.15 },
  { trait: "reliability_focused", rx: /\b(reliable|durability|long lasting|warranty|trustworthy)\b/i, weight: 1.05 },
];

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function resolvePersonalityMode(
  traits: Partial<Record<BuyerIdentityTrait, number>>,
  query: string
): BuyerIdentityProfile["personalityMode"] {
  const q = query.toLowerCase();
  if (/\bbest premium\b|\bluxury\b|\bflagship\b/i.test(q) || (traits.premium_buyer ?? 0) >= 70) return "premium";
  if (/\bbest value\b|\bcheap\b|\bbudget\b/i.test(q) || (traits.value_focused ?? 0) >= 70) return "value";
  if (/\bfor work\b|\bbusiness\b|\bproductivity\b/i.test(q) || (traits.business_buyer ?? 0) >= 68) return "productivity";
  if ((traits.performance_focused ?? 0) >= 68 || (traits.developer ?? 0) >= 68) return "performance";
  return "balanced";
}

function resolveRankingWeights(mode: BuyerIdentityProfile["personalityMode"]): BuyerRankingWeights {
  if (mode === "premium") {
    return { marketOpportunity: 0.16, categoryQuality: 0.22, buyerIdentity: 0.18, tasteMatch: 0.28, merchantTrust: 0.16 };
  }
  if (mode === "value") {
    return { marketOpportunity: 0.32, categoryQuality: 0.14, buyerIdentity: 0.2, tasteMatch: 0.1, merchantTrust: 0.24 };
  }
  if (mode === "productivity") {
    return { marketOpportunity: 0.22, categoryQuality: 0.24, buyerIdentity: 0.22, tasteMatch: 0.1, merchantTrust: 0.22 };
  }
  if (mode === "performance") {
    return { marketOpportunity: 0.2, categoryQuality: 0.28, buyerIdentity: 0.24, tasteMatch: 0.08, merchantTrust: 0.2 };
  }
  return { marketOpportunity: 0.26, categoryQuality: 0.2, buyerIdentity: 0.18, tasteMatch: 0.16, merchantTrust: 0.2 };
}

/** Infer buyer identity profile from query text. */
export function detectBuyerIdentity(query: string): BuyerIdentityProfile {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  const intent = detectIntentProfile(query);
  const traits: Partial<Record<BuyerIdentityTrait, number>> = {};

  for (const rule of TRAIT_RULES) {
    if (rule.rx.test(q)) {
      traits[rule.trait] = clamp(Math.round(58 + rule.weight * 22), 0, 100);
    }
  }

  if (intent.budget >= 72) traits.budget_conscious = Math.max(traits.budget_conscious ?? 0, intent.budget);
  if (intent.premium >= 72) traits.premium_buyer = Math.max(traits.premium_buyer ?? 0, intent.premium);
  if (intent.value >= 72) traits.value_focused = Math.max(traits.value_focused ?? 0, intent.value);
  if (intent.gaming >= 72) traits.performance_focused = Math.max(traits.performance_focused ?? 0, intent.gaming);
  if (intent.business >= 72) traits.business_buyer = Math.max(traits.business_buyer ?? 0, intent.business);
  if (intent.family >= 72) traits.family_buyer = Math.max(traits.family_buyer ?? 0, intent.family);

  if (!Object.keys(traits).length) {
    traits.balanced = 52;
  }

  const ranked = (Object.entries(traits) as Array<[BuyerIdentityTrait, number]>).sort(
    (a, b) => b[1] - a[1]
  );
  const dominantTraits = ranked.slice(0, 3).map(([trait]) => trait);
  const primaryIdentity = dominantTraits[0] ?? "balanced";
  const confidence = clamp(Math.round(ranked[0]?.[1] ?? 52), 0, 100);
  const personalityMode = resolvePersonalityMode(traits, query);
  const rankingWeights = resolveRankingWeights(personalityMode);

  return {
    version: 1,
    primaryIdentity,
    traits,
    dominantTraits,
    confidence,
    rankingWeights,
    personalityMode,
  };
}

export function buyerIdentityMatches(
  profile: BuyerIdentityProfile,
  expectedTraits: BuyerIdentityTrait[]
): boolean {
  return expectedTraits.some(
    (trait) => profile.primaryIdentity === trait || profile.dominantTraits.includes(trait)
  );
}
