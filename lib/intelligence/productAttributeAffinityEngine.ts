/**
 * Phase 12.15 — Product Attribute Affinity Engine.
 * Identifies which product attributes a buyer is attracted to before search execution.
 * Meta-only, read-only — no persistence, tray, or ranking mutations.
 */

import type { BrandAffinityMeta } from "@/lib/intelligence/brandAffinityEngine";
import type { BuyerIntentVectorMeta } from "@/lib/intelligence/buyerIntentVectorEngine";
import type { ContextIntelligenceMeta } from "@/lib/intelligence/contextIntelligenceEngine";
import type { LifestyleIntelligenceMeta } from "@/lib/intelligence/lifestyleIntelligenceEngine";
import type { ShopperPsychologyMeta } from "@/lib/intelligence/shopperPsychologyEngine";
import type { TasteIntelligenceMeta } from "@/lib/intelligence/tasteIntelligenceEngine";
import type { UniversalBuyerModelMeta } from "@/lib/intelligence/universalBuyerModelEngine";
import type { ShoppingBrainMeta } from "@/lib/intelligence/universalShoppingBrain";

export type ProductAttributeId =
  | "performance"
  | "quality"
  | "design"
  | "simplicity"
  | "premium"
  | "durability"
  | "portability"
  | "innovation";

export type ProductAttributeLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type ProductAttributeAffinityMeta = {
  version: "phase12.15-v1";
  attributeLevel: ProductAttributeLevel;
  performanceAffinity: number;
  qualityAffinity: number;
  designAffinity: number;
  simplicityAffinity: number;
  premiumAffinity: number;
  durabilityAffinity: number;
  portabilityAffinity: number;
  innovationAffinity: number;
  dominantAttribute: ProductAttributeId;
  supportingSignals: string[];
  confidenceTier: string;
  confidence: number;
};

export type ProductAttributeAffinityInput = {
  query: string;
  shoppingBrain: ShoppingBrainMeta;
  buyerModel: UniversalBuyerModelMeta;
  buyerIntentVector: BuyerIntentVectorMeta;
  shopperPsychology: ShopperPsychologyMeta;
  contextIntelligence: ContextIntelligenceMeta;
  tasteIntelligence: TasteIntelligenceMeta;
  lifestyleIntelligence: LifestyleIntelligenceMeta;
  brandAffinity: BrandAffinityMeta;
};

const VERSION = "phase12.15-v1" as const;

const PERFORMANCE_RX =
  /\b(fast|powerful|gaming|benchmark|productivity|creator|workstation|performance|high[\s-]?performance|fps|gpu|cpu)\b/i;
const QUALITY_RX =
  /\b(best\s+quality|reliable|top[\s-]?rated|trusted|professional\s+grade|quality|well[\s-]?built)\b/i;
const DESIGN_RX =
  /\b(beautiful|aesthetic|minimalist|stylish|modern|design|elegant|sleek)\b/i;
const SIMPLICITY_RX =
  /\b(easy|simple|beginner|straightforward|user[\s-]?friendly|basic|starter)\b/i;
const PREMIUM_RX = /\b(flagship|luxury|premium|high[\s-]?end|upscale|designer)\b/i;
const DURABILITY_RX = /\b(durable|rugged|long[\s-]?lasting|reliability|sturdy|heavy[\s-]?duty)\b/i;
const PORTABILITY_RX =
  /\b(lightweight|travel|compact|portable|thin\s+and\s+light|carry[\s-]?on|ultrabook)\b/i;
const INNOVATION_RX =
  /\b(latest|newest|cutting[\s-]?edge|ai[\s-]?powered|innovative|next[\s-]?gen|2025|2026)\b/i;

const ATTRIBUTE_PRIORITY: ProductAttributeId[] = [
  "performance",
  "quality",
  "design",
  "simplicity",
  "premium",
  "durability",
  "portability",
  "innovation",
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type AttributeScores = {
  performanceAffinity: number;
  qualityAffinity: number;
  designAffinity: number;
  simplicityAffinity: number;
  premiumAffinity: number;
  durabilityAffinity: number;
  portabilityAffinity: number;
  innovationAffinity: number;
};

function scorePerformanceAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.16;
  if (PERFORMANCE_RX.test(input.query)) score += 0.48;
  if (input.buyerModel.buyerType === "gamer_buyer" || input.buyerModel.buyerType === "performance_buyer") {
    score += 0.28;
  }
  if (input.buyerIntentVector.performanceIntent >= 0.55) score += input.buyerIntentVector.performanceIntent * 0.22;
  if (input.tasteIntelligence.styleIntent === "gaming" || input.tasteIntelligence.styleIntent === "performance") {
    score += 0.16;
  }
  if (input.lifestyleIntelligence.lifestyleIntent === "gamer") score += 0.12;
  if (input.shopperPsychology.primaryPsychology === "rational") score += 0.06;
  return clamp01(score);
}

function scoreQualityAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.14;
  if (QUALITY_RX.test(input.query)) score += 0.42;
  if (input.buyerModel.buyerType === "professional_buyer" || input.buyerModel.buyerType === "business_buyer") {
    score += 0.24;
  }
  if (input.shoppingBrain.qualityIntent === "high" || input.shoppingBrain.qualityIntent === "luxury") {
    score += 0.16;
  }
  if (input.tasteIntelligence.styleIntent === "professional" || input.tasteIntelligence.styleIntent === "executive") {
    score += 0.12;
  }
  if (input.contextIntelligence.lifecycleContext === "professional") score += 0.1;
  return clamp01(score);
}

function scoreDesignAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.14;
  if (DESIGN_RX.test(input.query)) score += 0.44;
  if (input.tasteIntelligence.styleIntent === "minimal" || input.tasteIntelligence.styleIntent === "modern") {
    score += 0.18;
  }
  if (input.tasteIntelligence.aestheticIntent === "modern" || input.tasteIntelligence.aestheticIntent === "minimal") {
    score += 0.14;
  }
  if (input.tasteIntelligence.styleIntent === "elegant") score += 0.1;
  if (input.shopperPsychology.primaryPsychology === "emotional") score += 0.08;
  return clamp01(score);
}

function scoreSimplicityAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.12;
  if (SIMPLICITY_RX.test(input.query)) score += 0.46;
  if (input.buyerModel.buyerType === "student_buyer") score += 0.14;
  if (input.contextIntelligence.lifecycleContext === "new_user") score += 0.12;
  if (input.lifestyleIntelligence.lifestyleIntent === "student") score += 0.1;
  if (input.tasteIntelligence.styleIntent === "casual") score += 0.08;
  return clamp01(score);
}

function scorePremiumAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.14;
  if (PREMIUM_RX.test(input.query)) score += 0.46;
  if (input.buyerModel.buyerType === "premium_buyer") score += 0.26;
  if (input.shopperPsychology.primaryPsychology === "premium") {
    score += input.shopperPsychology.psychologyScores.premium * 0.22;
  }
  if (input.tasteIntelligence.premiumAffinity >= 0.7) score += 0.16;
  if (input.brandAffinity.premiumBrandBias >= 0.5) score += 0.1;
  if (input.buyerModel.buyerType === "value_buyer") score -= 0.18;
  return clamp01(score);
}

function scoreDurabilityAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.12;
  if (DURABILITY_RX.test(input.query)) score += 0.44;
  if (input.contextIntelligence.purchaseContext === "replacement") score += 0.18;
  if (input.buyerIntentVector.dominantIntent === "urgency") score += 0.12;
  if (input.shopperPsychology.primaryPsychology === "urgency") score += 0.1;
  if (input.lifestyleIntelligence.lifestyleIntent === "parent") score += 0.08;
  return clamp01(score);
}

function scorePortabilityAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.12;
  if (PORTABILITY_RX.test(input.query)) score += 0.48;
  if (
    input.lifestyleIntelligence.lifestyleIntent === "traveler" ||
    input.lifestyleIntelligence.useCaseIntent === "travel"
  ) {
    score += 0.24;
  }
  if (input.buyerIntentVector.convenienceIntent >= 0.35) score += 0.1;
  if (input.shopperPsychology.primaryPsychology === "convenience") score += 0.08;
  return clamp01(score);
}

function scoreInnovationAffinity(input: ProductAttributeAffinityInput): number {
  let score = 0.12;
  if (INNOVATION_RX.test(input.query)) score += 0.42;
  if (input.buyerModel.buyerType === "creator_buyer") score += 0.16;
  if (input.tasteIntelligence.styleIntent === "creative") score += 0.12;
  if (input.lifestyleIntelligence.lifestyleIntent === "creator") score += 0.1;
  if (input.buyerIntentVector.researchIntent >= 0.45) score += 0.08;
  return clamp01(score);
}

function applyAttributeOverrides(
  scores: AttributeScores,
  input: ProductAttributeAffinityInput
): AttributeScores {
  const out = { ...scores };

  if (
    input.buyerModel.buyerType === "gamer_buyer" ||
    input.buyerModel.buyerType === "performance_buyer" ||
    /\bgaming\b/i.test(input.query)
  ) {
    out.performanceAffinity = Math.max(out.performanceAffinity, 0.9);
  }

  if (input.buyerModel.buyerType === "premium_buyer" || /\bpremium\b/i.test(input.query)) {
    out.premiumAffinity = Math.max(out.premiumAffinity, 0.85);
  }

  if (
    input.buyerModel.buyerType === "professional_buyer" ||
    input.buyerModel.buyerType === "business_buyer"
  ) {
    out.qualityAffinity = Math.max(out.qualityAffinity, 0.72);
  }

  if (
    input.lifestyleIntelligence.lifestyleIntent === "traveler" ||
    input.lifestyleIntelligence.useCaseIntent === "travel" ||
    /\b(lightweight|travel|portable|compact)\b/i.test(input.query)
  ) {
    out.portabilityAffinity = Math.max(out.portabilityAffinity, 0.9);
  }

  if (input.buyerModel.buyerType === "value_buyer") {
    out.premiumAffinity = Math.min(out.premiumAffinity, 0.35);
  }

  if (
    input.contextIntelligence.purchaseContext === "replacement" ||
    (input.buyerIntentVector.dominantIntent === "urgency" && /\b(replace|broken)\b/i.test(input.query))
  ) {
    out.durabilityAffinity = Math.max(out.durabilityAffinity, 0.72);
  }

  if (/\b(simple|beginner|easy|straightforward)\b/i.test(input.query)) {
    out.simplicityAffinity = Math.max(out.simplicityAffinity, 0.85);
  }

  return out;
}

function resolveDominantAttribute(scores: AttributeScores): ProductAttributeId {
  const ranked = ATTRIBUTE_PRIORITY.map((id) => ({
    id,
    score:
      id === "performance"
        ? scores.performanceAffinity
        : id === "quality"
          ? scores.qualityAffinity
          : id === "design"
            ? scores.designAffinity
            : id === "simplicity"
              ? scores.simplicityAffinity
              : id === "premium"
                ? scores.premiumAffinity
                : id === "durability"
                  ? scores.durabilityAffinity
                  : id === "portability"
                    ? scores.portabilityAffinity
                    : scores.innovationAffinity,
  }));
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.id ?? "quality";
}

function attributeLevelFor(maxScore: number): ProductAttributeLevel {
  if (maxScore <= 0.2) return "VERY_LOW";
  if (maxScore <= 0.4) return "LOW";
  if (maxScore <= 0.6) return "MEDIUM";
  if (maxScore <= 0.8) return "HIGH";
  return "VERY_HIGH";
}

function buildSupportingSignals(
  input: ProductAttributeAffinityInput,
  dominantAttribute: ProductAttributeId
): string[] {
  const signals: string[] = [];

  signals.push(`dominant_${dominantAttribute}`);
  signals.push(`buyer_type_${input.buyerModel.buyerType}`);
  if (PERFORMANCE_RX.test(input.query)) signals.push("performance_language");
  if (PREMIUM_RX.test(input.query)) signals.push("premium_language");
  if (PORTABILITY_RX.test(input.query)) signals.push("portability_language");
  if (SIMPLICITY_RX.test(input.query)) signals.push("simplicity_language");
  if (input.tasteIntelligence.styleIntent !== "casual") {
    signals.push(`taste_${input.tasteIntelligence.styleIntent}`);
  }
  if (input.lifestyleIntelligence.lifestyleIntent !== "general") {
    signals.push(`lifestyle_${input.lifestyleIntelligence.lifestyleIntent}`);
  }
  if (input.contextIntelligence.purchaseContext === "replacement") {
    signals.push("replacement_durability_focus");
  }
  if (input.buyerModel.buyerType === "value_buyer") {
    signals.push("value_buyer_premium_reduced");
  }

  return signals;
}

/** Build a normalized product attribute affinity profile from Phase 12.x signals. */
export function buildProductAttributeAffinity(
  input: ProductAttributeAffinityInput
): ProductAttributeAffinityMeta {
  const raw: AttributeScores = {
    performanceAffinity: scorePerformanceAffinity(input),
    qualityAffinity: scoreQualityAffinity(input),
    designAffinity: scoreDesignAffinity(input),
    simplicityAffinity: scoreSimplicityAffinity(input),
    premiumAffinity: scorePremiumAffinity(input),
    durabilityAffinity: scoreDurabilityAffinity(input),
    portabilityAffinity: scorePortabilityAffinity(input),
    innovationAffinity: scoreInnovationAffinity(input),
  };

  const boosted = applyAttributeOverrides(raw, input);
  const scores: AttributeScores = {
    performanceAffinity: round2(boosted.performanceAffinity),
    qualityAffinity: round2(boosted.qualityAffinity),
    designAffinity: round2(boosted.designAffinity),
    simplicityAffinity: round2(boosted.simplicityAffinity),
    premiumAffinity: round2(boosted.premiumAffinity),
    durabilityAffinity: round2(boosted.durabilityAffinity),
    portabilityAffinity: round2(boosted.portabilityAffinity),
    innovationAffinity: round2(boosted.innovationAffinity),
  };

  const dominantAttribute = resolveDominantAttribute(scores);
  const maxScore = Math.max(
    scores.performanceAffinity,
    scores.qualityAffinity,
    scores.designAffinity,
    scores.simplicityAffinity,
    scores.premiumAffinity,
    scores.durabilityAffinity,
    scores.portabilityAffinity,
    scores.innovationAffinity
  );

  return {
    version: VERSION,
    attributeLevel: attributeLevelFor(maxScore),
    ...scores,
    dominantAttribute,
    supportingSignals: buildSupportingSignals(input, dominantAttribute),
    confidenceTier: input.brandAffinity.confidenceTier,
    confidence: input.brandAffinity.confidence,
  };
}
