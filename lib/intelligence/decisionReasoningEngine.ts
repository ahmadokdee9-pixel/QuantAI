/**
 * Phase 45 — Decision Reasoning Engine.
 * Category-aware explanations — avoid generic repetition.
 */

import type { CategoryValueKind } from "@/lib/intelligence/categoryValueEngine";
import type { DiscountConfidenceLabel } from "@/lib/intelligence/discountConfidenceEngine";
import type { MerchantReliabilityLabel } from "@/lib/intelligence/merchantReliabilityEngine";
import type { CommerceDecisionTier } from "@/lib/intelligence/commerceDecisionCoreEngine";

export type DecisionReasoningInput = {
  categoryKind: CategoryValueKind;
  tier: CommerceDecisionTier;
  trueValueScore: number;
  qualityScore: number;
  discountLabel: DiscountConfidenceLabel;
  merchantLabel: MerchantReliabilityLabel;
  discountVerified: boolean;
  priceAdvantagePct: number;
};

function clip(text: string, max = 220): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function sofaReasoning(input: DecisionReasoningInput): string {
  if (input.tier === "BEST DEAL" || input.tier === "STRONG BUY") {
    return clip(
      `Strong value opportunity. Above-average design and material quality (${input.qualityScore}/100) with ${input.discountLabel.toLowerCase()} and ${input.merchantLabel.toLowerCase()}.`
    );
  }
  if (input.tier === "BUY READY") {
    return clip(
      `Solid sofa pick — comfort and construction signals are credible with verified pricing from a ${input.merchantLabel.toLowerCase()}.`
    );
  }
  if (input.tier === "WAIT") {
    return clip("Sofa value is acceptable but market timing or discount confidence is not compelling enough yet.");
  }
  return clip(
    `Good sofa option — compare layout, material quality (${input.qualityScore}/100), and verified discount strength before checkout.`
  );
}

function phoneReasoning(input: DecisionReasoningInput): string {
  if (input.tier === "BEST DEAL" || input.tier === "STRONG BUY") {
    return clip(
      `Excellent market position for current-generation storage and chipset tier with ${input.discountLabel.toLowerCase()}.`
    );
  }
  if (input.tier === "BUY READY") {
    return clip(
      `Strong phone value — generation and camera/storage tier align with verified pricing and ${input.merchantLabel.toLowerCase()}.`
    );
  }
  if (input.tier === "WAIT") {
    return clip("Phone pricing is fair but next-generation value or discount confidence does not justify urgency.");
  }
  return clip(
    `Capable phone listing — compare generation, storage tier, and merchant reliability before committing.`
  );
}

function laptopReasoning(input: DecisionReasoningInput): string {
  if (input.tier === "BEST DEAL" || input.tier === "STRONG BUY") {
    return clip(
      `Balanced performance-to-price ratio with strong specification value (${input.qualityScore}/100) and verified discount evidence.`
    );
  }
  if (input.tier === "BUY READY") {
    return clip(
      `Strong laptop fit — CPU, RAM, and display signals support purchase with ${input.merchantLabel.toLowerCase()} checkout confidence.`
    );
  }
  if (input.tier === "WAIT") {
    return clip("Specification value is decent but discount confidence or market timing suggests waiting.");
  }
  return clip(
    `Good laptop candidate — weigh CPU/RAM/display quality (${input.qualityScore}/100) against alternatives in this tray.`
  );
}

function macbookReasoning(input: DecisionReasoningInput): string {
  if (input.tier === "BEST DEAL" || input.tier === "STRONG BUY") {
    return clip(
      `Rare MacBook value — M-series generation, RAM, and storage tier combine with ${input.discountLabel.toLowerCase()} at ${input.merchantLabel.toLowerCase()}.`
    );
  }
  if (input.tier === "BUY READY") {
    return clip(
      `Confident MacBook path — Apple silicon generation and configuration quality support checkout today.`
    );
  }
  if (input.tier === "WAIT") {
    return clip("MacBook configuration is viable but discount confidence or release cycle timing favors patience.");
  }
  return clip(
    `Solid MacBook option — compare M-series generation, RAM/storage tier, and verified pricing before buying.`
  );
}

function genericReasoning(input: DecisionReasoningInput): string {
  if (input.tier === "BEST DEAL") {
    return clip(`Rare true value (${input.trueValueScore}/100) — quality, discount confidence, and merchant reliability align.`);
  }
  if (input.tier === "STRONG BUY") {
    return clip(`Strong true value (${input.trueValueScore}/100) with verified discount and trusted merchant evidence.`);
  }
  if (input.tier === "BUY READY") {
    return clip(`Good product at a fair deal — true value ${input.trueValueScore}/100 with credible merchant and pricing signals.`);
  }
  if (input.tier === "WAIT") {
    return clip("Market signals are mixed — patience recommended until discount or value confidence improves.");
  }
  return clip(`Compare alternatives — true value ${input.trueValueScore}/100 with quality ${input.qualityScore}/100 in this search tray.`);
}

/** Generate category-aware primary reasoning line. */
export function generateCategoryAwareReasoning(input: DecisionReasoningInput): string {
  switch (input.categoryKind) {
    case "sofas":
      return sofaReasoning(input);
    case "phones":
      return phoneReasoning(input);
    case "laptops":
      return laptopReasoning(input);
    case "macbooks":
      return macbookReasoning(input);
    default:
      return genericReasoning(input);
  }
}

export type DecisionReasoningIntelligence = {
  version: 1;
  primaryLine: string;
  categoryKind: CategoryValueKind;
  reasoningFocus: string[];
};

export function buildDecisionReasoningIntelligence(input: DecisionReasoningInput): DecisionReasoningIntelligence {
  const primaryLine = generateCategoryAwareReasoning(input);
  const reasoningFocus: string[] = [];

  if (input.discountVerified) reasoningFocus.push("Verified Discount");
  if (input.qualityScore >= 75) reasoningFocus.push("Strong Category Quality");
  if (input.trueValueScore >= 78) reasoningFocus.push("True Value Alignment");
  if (input.merchantLabel === "Strong Merchant" || input.merchantLabel === "Elite Merchant") {
    reasoningFocus.push(input.merchantLabel);
  }
  if (input.priceAdvantagePct >= 10) reasoningFocus.push("Market Value Advantage");

  return {
    version: 1,
    primaryLine,
    categoryKind: input.categoryKind,
    reasoningFocus: reasoningFocus.slice(0, 5),
  };
}
